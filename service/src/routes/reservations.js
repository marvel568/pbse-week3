const express = require("express");
const crypto = require("crypto");
const { validateReservation } = require("../schemas/reservations");
const { findRoom } = require("../store/rooms");
const { findReservationConflict, createReservation } = require("../store/reservations");
const { toReservation } = require("../representations/reservations");
const { problem } = require("../problem");

function createReservationRouter(db) {
  const router = express.Router();

  router.post("/", async (req, res, next) => {
    const key = req.get("Idempotency-Key");

    if (!key) {
      return res.status(400).json(problem(
        "https://api.example.com/problems/malformed-request",
        "The request could not be parsed",
        400,
        "Idempotency-Key header is required",
        req.originalUrl
      ));
    }

    const errors = validateReservation(req.body);
    if (errors.length) {
      return res.status(422).json(problem(
        "https://api.example.com/problems/validation-failed",
        "One or more fields are invalid",
        422,
        errors.join("; "),
        req.originalUrl
      ));
    }

    try {
      const room = await findRoom(db, req.body.roomId);

      if (!room) {
        return res.status(404).json(problem(
          "https://api.example.com/problems/not-found",
          "Resource not found",
          404,
          "The requested room identifier does not exist.",
          req.originalUrl
        ));
      }

      if (!room.isAvailable) {
        return res.status(409).json(problem(
          "https://api.example.com/problems/outlet-closed",
          "Room is unavailable",
          409,
          "The selected room is currently unavailable.",
          req.originalUrl
        ));
      }

      const conflict = await findReservationConflict(
        db,
        req.body.roomId,
        req.body.startTime,
        req.body.endTime
      );

      if (conflict) {
        return res.status(409).json(problem(
          "https://api.example.com/problems/reservation-conflict",
          "Room is already reserved",
          409,
          "The selected room is already reserved for the requested time.",
          req.originalUrl
        ));
      }

      const reservation = {
        ...req.body,
        id: req.body.id || `res_${crypto.randomBytes(4).toString("hex")}`
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
