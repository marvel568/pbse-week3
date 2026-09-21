async function listRooms(db, { status, limit = 20, offset = 0 }) {
  const values = [];
  let sql = `
    SELECT
      id,
      room_number AS roomNumber,
      capacity,
      location,
      room_status = 'available' AS isAvailable
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
            room_status = 'available' AS isAvailable
       FROM rooms
      WHERE id = ?`,
    [roomId]
  );
  return rows[0] || null;
}

module.exports = { listRooms, findRoom };
