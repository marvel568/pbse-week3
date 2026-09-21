function toMysqlDateTime(isoString) {
  const date = new Date(isoString);
  return date.toISOString().slice(0, 19).replace("T", " ");
}

async function findReservationConflict(db, roomId, startTime, endTime) {
  const [rows] = await db.execute(
    `SELECT id
       FROM reservations
      WHERE room_id = ?
        AND status IN ('confirmed', 'active')
        AND start_time < ?
        AND end_time > ?
      LIMIT 1`,
    [roomId, toMysqlDateTime(endTime), toMysqlDateTime(startTime)]
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
      toMysqlDateTime(reservation.startTime),
      toMysqlDateTime(reservation.endTime)
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

async function findReservation(db, reservationId) {
  const [rows] = await db.execute(
    `SELECT id, room_id AS roomId, student_id AS studentId, status,
            start_time AS startTime, end_time AS endTime, created_at AS createdAt
       FROM reservations
      WHERE id = ?`,
    [reservationId]
  );

  return rows[0] || null;
}

module.exports = { findReservationConflict, createReservation, findReservation };