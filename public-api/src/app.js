import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import apiKeyGuard from "./middleware/apiKeyGuard.js";
import publicRoutes from "./routes/publicRoutes.js";

const app = express();

const corsOrigin = process.env.PUBLIC_API_CORS_ORIGIN || "*";
const allowedOrigins = corsOrigin === "*" ? true : corsOrigin.split(",").map((origin) => origin.trim());

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("tiny"));

const requestsPerMinute = Number.parseInt(process.env.PUBLIC_API_RATE_LIMIT || "120", 10);

app.use(
  "/api/public",
  rateLimit({
    windowMs: 60 * 1000,
    max: Number.isNaN(requestsPerMinute) ? 120 : requestsPerMinute,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      message: "Too many requests. Please try again shortly."
    }
  }),
  apiKeyGuard,
  publicRoutes
);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((error, _req, res, _next) => {
  const statusCode = error.status || 500;
  const message = error.message || "Internal server error";

  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({ message });
});

export default app;
