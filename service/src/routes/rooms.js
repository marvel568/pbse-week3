const express = require("express");
const {
  validateRoomId,
  validateRoomQuery,
  validateRoomStatusUpdate,
  decodeCursor,
  encodeCursor
} = require("../schemas/rooms");
const { listRooms, findRoom, updateRoomStatus } = require("../store/rooms");
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

  router.put("/:roomId/status", async (req, res, next) => {
    // Validate the room identifier before opening a database transaction.
    if (!validateRoomId(req.params.roomId)) {
      return sendProblem(res, {
        status: 400,
        type: "https://api.example.com/problems/malformed-request",
        title: "The request could not be parsed",
        detail: "roomId must match the room identifier format.",
        instance: req.originalUrl
      });
    }

    // Validate the complete status-update body required by this endpoint.
    const bodyError = validateRoomStatusUpdate(req.body);
    if (bodyError) {
      return sendProblem(res, {
        status: 400,
        type: "https://api.example.com/problems/malformed-request",
        title: "The request could not be parsed",
        detail: bodyError,
        instance: req.originalUrl
      });
    }

    let connection;
    let transactionStarted = false;

    try {
      // Use one connection so the status update and reservation cancellations are atomic.
      connection = await db.getConnection();
      await connection.beginTransaction();
      transactionStarted = true;

      const room = await updateRoomStatus(connection, req.params.roomId, req.body.status);

      if (!room) {
        await connection.rollback();
        transactionStarted = false;
        return sendProblem(res, {
          status: 404,
          type: "https://api.example.com/problems/not-found",
          title: "Resource not found",
          detail: "The requested room identifier does not exist.",
          instance: req.originalUrl
        });
      }

      // Make the room status and all resulting cancellations visible at the same time.
      await connection.commit();
      transactionStarted = false;
      return res.status(200).json(toRoom(room));
    } catch (err) {
      // Undo both database changes when either operation fails.
      if (transactionStarted) await connection.rollback();
      return next(err);
    } finally {
      // Return the checked-out connection to the MySQL pool.
      if (connection) connection.release();
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
