const express = require("express");
const {
  validateRoomId,
  validateRoomQuery,
  decodeCursor,
  encodeCursor
} = require("../schemas/rooms");
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
      const limit = req.query.limit === undefined ? 20 : Number(req.query.limit);
      const offset = req.query.cursor === undefined ? 0 : decodeCursor(req.query.cursor);
      const rows = await listRooms(db, {
        status: req.query.status,
        limit,
        offset
      });
      const hasNextPage = rows.length > limit;
      const items = rows.slice(0, limit).map(toRoom);

      res.status(200).json({
        items,
        ...(hasNextPage ? { nextCursor: encodeCursor(offset + limit) } : {})
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
