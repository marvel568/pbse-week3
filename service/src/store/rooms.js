async function listRooms(db, { status, limit = 20 }) {
  const values = [];
  let sql = `
    SELECT
      id,
      room_number AS roomNumber,
      capacity,
      location,
      is_available AS isAvailable
    FROM rooms
  `;

  if (status !== undefined) {
    sql += " WHERE is_available = ?";
    values.push(status === "available");
  }

  sql += " ORDER BY room_number LIMIT ?";
  values.push(Number(limit));

  const [rows] = await db.execute(sql, values);
  return rows;
}

async function findRoom(db, roomId) {
  const [rows] = await db.execute(
    `SELECT id, room_number AS roomNumber, capacity, location,
            is_available AS isAvailable
       FROM rooms
      WHERE id = ?`,
    [roomId]
  );
  return rows[0] || null;
}

module.exports = { listRooms, findRoom };
