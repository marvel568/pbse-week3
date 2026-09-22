require("dotenv").config();

const express = require("express");
const mysql = require("mysql2/promise");
const { createRoomRouter } = require("./routes/rooms");
const { createReservationRouter } = require("./routes/reservations");
const { sendProblem } = require("./problem");

function requiredConfig() {
  const required = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER"];

  for (const name of required) {
    if (!process.env[name]) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
  }
}

function createApp(db) {
  const app = express();

  app.use(express.json());

  // healthpoint
  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "ok"
    });
  });

  app.use("/v1/rooms", createRoomRouter(db));
  app.use("/v1/reservations", createReservationRouter(db));

  app.use((err, req, res, next) => {
    console.error(err);

    if (res.headersSent) {
      return next(err);
    }

    if (err.type === "entity.parse.failed" || err.status === 400) {
      return sendProblem(res, {
        status: 400,
        type: "https://api.example.com/problems/malformed-request",
        title: "The request could not be parsed",
        detail: "The JSON body contained invalid syntax.",
        instance: req.originalUrl
      });
    }

    sendProblem(res, {
      status: 500,
      type: "https://api.example.com/problems/internal-error",
      title: "Internal server error",
      detail: "An unexpected error occurred.",
      instance: req.originalUrl
    });
  });

  return app;
}

requiredConfig();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  ssl: process.env.DB_SSL_CA_PATH
    ? { ca: fs.readFileSync(process.env.DB_SSL_CA_PATH), rejectUnauthorized: true }
    : undefined
});

const app = createApp(db);

// Runs only when starting locally with `npm start`.
if (require.main === module) {
  const port = Number(process.env.PORT || 8080);

  app.listen(port, () => {
    console.log(`RoomReservation API listening on port ${port}`);
  });
}

// This is what Vercel imports and runs.
module.exports = app;

// Keeps the existing helper exports available for any tests.
module.exports.createApp = createApp;
module.exports.requiredConfig = requiredConfig;
