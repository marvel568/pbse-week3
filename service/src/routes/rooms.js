const express = require("express");
const { validateRoomId, validateRoomQuery } = require("../schemas/rooms");
const { listRooms, findRoom } = require("../store/rooms");
const { toRoom } = require("../representations/rooms");
const { sendProblem } = require("../problem");

function createRoomRouter(db) {
  const router = express.Router();

  router.get("/", async (req, res, next) => {
    const errors = validateRoomQuery(req.query);
    if (errors.length) {
            return sendProblem(res, {
        status: 400,
        type: "https://api.example.com/problems/malformed-request",
        title: "The request could not be parsed",
        detail: errors.join("; "),
        instance: req.originalUrl
      });
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

   router.get("/:roomId", async (req, res, next) => {
    if (!validateRoomId(req.params.roomId)) {
      return sendProblem(res, {
        status: 400,
        type: "https://api.example.com/problems/malformed-request",
        title: "The request could not be parsed",
        detail: "roomId must match the room identifier format.",
        instance: req.originalUrl
      });
    }

    try {
      const room = await findRoom(db, req.params.roomId);

      if (!room) {
        return sendProblem(res, {
          status: 404,
          type: "https://api.example.com/problems/not-found",
          title: "Resource not found",
          detail: "The requested room identifier does not exist.",
          instance: req.originalUrl
        });
      }

      res.status(200).json(toRoom(room));
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = { createRoomRouter };
