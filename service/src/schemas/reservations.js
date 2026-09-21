const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const roomIdPattern = /^room_[A-Za-z0-9]{3,}$/;
const reservationIdPattern = /^res_[A-Za-z0-9]{3,}$/;
const rfc3339Pattern = /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):([0-5]\d):([0-5]\d)(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

function validateIdempotencyKey(key) {
  if (!key) return "Idempotency-Key header is required";
  if (!uuidPattern.test(key)) return "Idempotency-Key must be a UUID";
  return null;
}

function validateReservationId(id) {
  return typeof id === "string" && reservationIdPattern.test(id);
}

function isRfc3339DateTime(value) {
  if (typeof value !== "string") return false;

  const match = rfc3339Pattern.exec(value);
  if (!match || Number.isNaN(Date.parse(value))) return false;

  const [, year, month, day] = match;
  const calendarDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return calendarDate.getUTCFullYear() === Number(year) &&
    calendarDate.getUTCMonth() === Number(month) - 1 &&
    calendarDate.getUTCDate() === Number(day);
}

function structuralErrors(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return ["request body must be a JSON object"];
  }

  const errors = [];

  if (typeof body.roomId !== "string" || !roomIdPattern.test(body.roomId)) {
    errors.push("roomId is required and must match the room identifier format");
  }

  if (typeof body.studentId !== "string" || body.studentId.trim().length === 0) {
    errors.push("studentId is required and must be a non-empty string");
  }

  if (!isRfc3339DateTime(body.startTime)) {
    errors.push("startTime is required and must be an RFC 3339 date-time");
  }

  if (!isRfc3339DateTime(body.endTime)) {
    errors.push("endTime is required and must be an RFC 3339 date-time");
  }

  return errors;
}

function semanticErrors(body) {
  const errors = [];
  const start = new Date(body.startTime);
  const end = new Date(body.endTime);

  if (end <= start) {
    errors.push("endTime must be after startTime");
  }

  return errors;
}

module.exports = {
  validateIdempotencyKey,
  validateReservationId,
  isRfc3339DateTime,
  structuralErrors,
  semanticErrors
};
