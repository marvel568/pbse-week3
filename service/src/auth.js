const crypto = require("crypto");
const express = require("express");

const COOKIE_NAME = "room_session";
const SESSION_SECONDS = 8 * 60 * 60;

function secret() {
  return process.env.AUTH_SECRET || "";
}

function sign(value) {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function readSession(req) {
  const cookies = Object.fromEntries((req.headers.cookie || "").split(";").map(part => {
    const index = part.indexOf("=");
    return index < 0 ? ["", ""] : [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }));
  const token = cookies[COOKIE_NAME];
  if (!token || !secret()) return null;
  const splitAt = token.lastIndexOf(".");
  if (splitAt < 0) return null;
  const payload = token.slice(0, splitAt);
  if (!safeEqual(token.slice(splitAt + 1), sign(payload))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!session.email || !session.role || session.expires < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

function requireAuth(req, res, next) {
  const session = readSession(req);
  if (!session) return res.status(401).json({ error: "Please log in to access this resource." });
  req.user = session;
  return next();
}

function createAuthRouter() {
  const router = express.Router();
  const cookieOptions = {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS * 1000
  };

  router.post("/login", (req, res) => {
    if (!secret()) return res.status(503).json({ error: "Login is not configured on this server." });
    const { username, password } = req.body || {};
    const accounts = [
      { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, name: "Admin User", role: "admin" },
      { email: process.env.USER_EMAIL, password: process.env.USER_PASSWORD, name: "Regular User", role: "user" }
    ];
    const account = accounts.find(candidate => candidate.email && candidate.password &&
      safeEqual(username || "", candidate.email) && safeEqual(password || "", candidate.password));
    if (!account) return res.status(401).json({ error: "Invalid username or password." });

    const session = {
      email: account.email,
      name: account.name,
      role: account.role,
      expires: Date.now() + SESSION_SECONDS * 1000
    };
    const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
    res.cookie(COOKIE_NAME, `${payload}.${sign(payload)}`, cookieOptions);
    return res.status(200).json({ name: session.name, email: session.email, role: session.role });
  });

  router.post("/logout", (_req, res) => {
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: undefined });
    return res.status(204).end();
  });

  return router;
}

module.exports = { createAuthRouter, requireAuth };
