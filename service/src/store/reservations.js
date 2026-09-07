async function findReservationConflict(db, roomId, startTime, endTime) {
  const [rows] = await db.execute(
    `SELECT id
       FROM reservations
      WHERE room_id = ?
        AND status IN ('confirmed', 'active')
        AND start_time < ?
        AND end_time > ?
      LIMIT 1`,
    [roomId, endTime, startTime]
  );
  return rows[0] || null;
}

async function createReservation(db, reservation) {
  await db.execute(
    `INSERT INTO reservations
      (id, room_id, student_id, status, start_time, end_time, created_at)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      reservation.id,
      reservation.roomId,
      reservation.studentId,
      reservation.status,
      reservation.startTime,
      reservation.endTime
    ]
  );

  const [rows] = await db.execute(
    `SELECT id, room_id AS roomId, student_id AS studentId, status,
            start_time AS startTime, end_time AS endTime, created_at AS createdAt
       FROM reservations
      WHERE id = ?`,
    [reservation.id]
  );

  return rows[0];
}

module.exports = { findReservationConflict, createReservation };
