const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const roomIdPattern = /^room_[A-Za-z0-9]{3,}$/;

function validateIdempotencyKey(key) {
  if (!key) return "Idempotency-Key header is required";
  if (!uuidPattern.test(key)) return "Idempotency-Key must be a UUID";
  return null;
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

  if (typeof body.startTime !== "string" || Number.isNaN(new Date(body.startTime).getTime())) {
    errors.push("startTime is required and must be an RFC 3339 date-time");
  }

  if (typeof body.endTime !== "string" || Number.isNaN(new Date(body.endTime).getTime())) {
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

module.exports = { validateIdempotencyKey, structuralErrors, semanticErrors };
