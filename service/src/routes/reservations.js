const express = require("express");
const crypto = require("crypto");
const {
  validateIdempotencyKey,
  structuralErrors,
  semanticErrors
} = require("../schemas/reservations");
const { findRoom } = require("../store/rooms");
const { findReservationConflict, createReservation } = require("../store/reservations");
const {
  createIdempotencyKey,
  findIdempotencyKeyForUpdate,
  saveIdempotencyResponse
} = require("../store/idempotency");
const { toReservation } = require("../representations/reservations");
const { sendProblem } = require("../problem");

function createReservationRouter(db) {
  const router = express.Router();

  router.post("/", async (req, res, next) => {
    const keyError = validateIdempotencyKey(req.get("Idempotency-Key"));
    if (keyError) {
      return sendProblem(res, {
        status: 400,
        type: "https://api.example.com/problems/malformed-request",
        title: "The request could not be parsed",
        detail: keyError,
        instance: req.originalUrl
      });
    }

    const shapeErrors = structuralErrors(req.body);
    if (shapeErrors.length) {
      return sendProblem(res, {
        status: 400,
        type: "https://api.example.com/problems/malformed-request",
        title: "The request could not be parsed",
        detail: "One or more fields did not match the documented shape.",
        instance: req.originalUrl,
        invalidFields: shapeErrors
      });
    }

    const meaningErrors = semanticErrors(req.body);
    if (meaningErrors.length) {
      return sendProblem(res, {
        status: 422,
        type: "https://api.example.com/problems/validation-failed",
        title: "One or more fields are invalid",
        detail: "The request was well-formed but cannot be used as given.",
        instance: req.originalUrl,
        invalidFields: meaningErrors
      });
    }

    const idempotencyKey = req.get("Idempotency-Key");
    const requestHash = crypto
      .createHash("sha256")
      .update(JSON.stringify({
        roomId: req.body.roomId,
        studentId: req.body.studentId,
        startTime: req.body.startTime,
        endTime: req.body.endTime
      }))
      .digest("hex");

    let connection;
    let transactionStarted = false;

    try {
      connection = await db.getConnection();
      await connection.beginTransaction();
      transactionStarted = true;

      try {
        await createIdempotencyKey(connection, idempotencyKey, requestHash);
      } catch (err) {
        if (err.code !== "ER_DUP_ENTRY") throw err;

        const saved = await findIdempotencyKeyForUpdate(connection, idempotencyKey);

        if (!saved || saved.requestHash !== requestHash) {
          await connection.rollback();
          transactionStarted = false;
          return sendProblem(res, {
            status: 409,
            type: "https://api.example.com/problems/idempotency-key-reuse",
            title: "Idempotency key reused",
            detail: "This Idempotency-Key was previously used with a different request body.",
            instance: req.originalUrl
          });
        }

        await connection.rollback();
        transactionStarted = false;
        return res.status(saved.responseStatus)
          .location(saved.location)
          .json(JSON.parse(saved.responseBody));
      }

      const room = await findRoom(connection, req.body.roomId);

      if (!room) {
        await connection.rollback();
        transactionStarted = false;
        return sendProblem(res, {
          status: 422,
          type: "https://api.example.com/problems/validation-failed",
          title: "One or more fields are invalid",
          detail: "roomId does not refer to an existing room.",
          instance: req.originalUrl,
          invalidFields: ["roomId"]
        });
      }

      if (!room.isAvailable) {
        await connection.rollback();
        transactionStarted = false;
        return sendProblem(res, {
          status: 409,
          type: "https://api.example.com/problems/outlet-closed",
          title: "Room is unavailable",
          detail: "The selected room is currently unavailable for reservation.",
          instance: req.originalUrl
        });
      }

      const conflict = await findReservationConflict(
        connection,
        req.body.roomId,
        req.body.startTime,
        req.body.endTime
      );

      if (conflict) {
        await connection.rollback();
        transactionStarted = false;
        return sendProblem(res, {
          status: 409,
          type: "https://api.example.com/problems/reservation-conflict",
          title: "Room is already reserved",
          detail: "The selected room is already reserved for the requested time.",
          instance: req.originalUrl
        });
      }

      const reservation = {
        id: `res_${crypto.randomBytes(4).toString("hex")}`,
        roomId: req.body.roomId,
        studentId: req.body.studentId,
        status: "confirmed",
        startTime: req.body.startTime,
        endTime: req.body.endTime
      };

      const row = await createReservation(connection, reservation);
      const body = toReservation(row);
      const location = `/v1/reservations/${row.id}`;

      await saveIdempotencyResponse(connection, idempotencyKey, {
        status: 201,
        body,
        location
      });

      await connection.commit();
      transactionStarted = false;
      return res.status(201).location(location).json(body);
    } catch (err) {
      if (transactionStarted) await connection.rollback();
      next(err);
    } finally {
      if (connection) connection.release();
    }
  });

  return router;
}

module.exports = { createReservationRouter };
