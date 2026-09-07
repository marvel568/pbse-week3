function toReservation(row) {
  return {
    id: row.id,
    roomId: row.roomId ?? row.room_id,
    studentId: row.studentId ?? row.student_id,
    status: row.status,
    startTime: toRfc3339(row.startTime ?? row.start_time),
    endTime: toRfc3339(row.endTime ?? row.end_time),
    createdAt: toRfc3339(row.createdAt ?? row.created_at)
  };
}

function toRfc3339(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string" && !value.includes("T")) {
    return value.replace(" ", "T") + "+00:00";
  }
  return value;
}

module.exports = { toReservation };
