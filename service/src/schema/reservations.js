const reservationIdPattern = /^res_[A-Za-z0-9]{3,}$/;
const roomIdPattern = /^room_[A-Za-z0-9]{3,}$/;

function validateReservation(body) {
  const errors = [];

  if (!body || typeof body !== "object") {
    return ["request body must be an object"];
  }

  if (body.id !== undefined &&
      (typeof body.id !== "string" || !reservationIdPattern.test(body.id))) {
    errors.push("id must match the reservation identifier format");
  }

  if (typeof body.roomId !== "string" || !roomIdPattern.test(body.roomId)) {
    errors.push("roomId is required and must be a valid room identifier");
  }

  if (typeof body.studentId !== "string" || body.studentId.length === 0) {
    errors.push("studentId is required");
  }

  if (typeof body.status !== "string" ||
      !["confirmed", "active", "completed", "cancelled", "no_show"].includes(body.status)) {
    errors.push("status is invalid");
  }

  const start = new Date(body.startTime);
  const end = new Date(body.endTime);

  if (Number.isNaN(start.getTime())) errors.push("startTime must be a valid date-time");
  if (Number.isNaN(end.getTime())) errors.push("endTime must be a valid date-time");
  if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end <= start) {
    errors.push("endTime must be after startTime");
  }

  return errors;
}

module.exports = { validateReservation };
