const express = require("express");
const { validateRoomQuery } = require("../schemas/rooms");
const { listRooms } = require("../store/rooms");
const { toRoom } = require("../representations/rooms");
const { problem } = require("../problem");

function createRoomRouter(db) {
  const router = express.Router();

  router.get("/", async (req, res, next) => {
    const errors = validateRoomQuery(req.query);
    if (errors.length) {
      return res.status(400).json(problem(
        "https://api.example.com/problems/malformed-request",
        "The request could not be parsed",
        400,
        errors.join("; "),
        req.originalUrl
      ));
    }

    try {
      const rows = await listRooms(db, {
        status: req.query.status,
        limit: req.query.limit === undefined ? 20 : Number(req.query.limit),
        cursor: req.query.cursor
      });

      res.status(200).json({
        items: rows.map(toRoom)
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createRoomRouter };
