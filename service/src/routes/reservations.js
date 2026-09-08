const express = require("express");
const crypto = require("crypto");
const {
  validateIdempotencyKey,
  structuralErrors,
  semanticErrors
} = require("../schemas/reservations");
const { findRoom } = require("../store/rooms");
const { findReservationConflict, createReservation } = require("../store/reservations");
const { toReservation } = require("../representations/reservations");
const { problem } = require("../problem");

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

    try {
      const room = await findRoom(db, req.body.roomId);

      if (!room) {
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
        return sendProblem(res, {
          status: 409,
          type: "https://api.example.com/problems/outlet-closed",
          title: "Room is unavailable",
          detail: "The selected room is currently unavailable for reservation.",
          instance: req.originalUrl
        });
      }

      const conflict = await findReservationConflict(
        db,
        req.body.roomId,
        req.body.startTime,
        req.body.endTime
      );

      if (conflict) {
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

      const row = await createReservation(db, reservation);
      res.status(201)
        .location(`/v1/reservations/${row.id}`)
        .json(toReservation(row));
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createReservationRouter };
