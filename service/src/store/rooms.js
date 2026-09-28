async function listRooms(db, { status, limit = 20, offset = 0 }) {
  const values = [];
  let sql = `
    SELECT
      id,
      room_number AS roomNumber,
      capacity,
      location,
      room_status
    FROM rooms
  `;

  if (status !== undefined) {
    sql += " WHERE room_status = ?";
    values.push(status);
  }

  sql += " ORDER BY room_number LIMIT ? OFFSET ?";
  values.push(Number(limit) + 1, Number(offset));

  const [rows] = await db.execute(sql, values);
  return rows;
}

async function findRoom(db, roomId) {
  const [rows] = await db.execute(
    `SELECT id, room_number AS roomNumber, capacity, location,
            room_status
       FROM rooms
      WHERE id = ?`,
    [roomId]
  );
  return rows[0] || null;
}

async function updateRoomStatus(db, roomId, status) {
  // Lock the room row so its status and related cancellations change together.
  const room = await findRoomForUpdate(db, roomId);

  // Let the route produce the documented 404 response when the room is absent.
  if (!room) return null;

  // Persist the requested operational status on the room.
  await db.execute("UPDATE rooms SET room_status = ? WHERE id = ?", [status, roomId]);

  if (status !== "available") {
    // Previous implementation: preserve history while cancelling reservations that can still occur.
    // await db.execute(
    //   `UPDATE reservations
    //       SET status = 'cancelled'
    //     WHERE room_id = ?
    //       AND status IN ('confirmed', 'active')`,
    //   [roomId]
    // );

    // Permanently remove every reservation entry for a room made unavailable.
    await db.execute(
      "DELETE FROM reservations WHERE room_id = ?",
      [roomId]
    );
  }

  // Return the row shape consumed by the public room representation.
  return { ...room, room_status: status };
}

async function findRoomForUpdate(db, roomId) {
  // Lock the selected room until the surrounding transaction commits or rolls back.
  const [rows] = await db.execute(
    `SELECT id, room_number AS roomNumber, capacity, location, room_status
       FROM rooms
      WHERE id = ?
      FOR UPDATE`,
    [roomId]
  );

  return rows[0] || null;
}

module.exports = { listRooms, findRoom, updateRoomStatus };
