import express from "express";
import cors from "cors";
import "dotenv/config";
import { query } from "./db.js";
import { requireApiKey } from "./apiKeyAuth.js";
import { decodeVin } from "./vinDecoder.js";

const app = express();
const port = Number(process.env.PORT ?? 3080);

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "vin-decode-api" });
});

app.get("/health/db", async (_req, res) => {
  try {
    await query("SELECT 1 AS ok");
    res.json({
      status: "ok",
      database: process.env.DB_NAME ?? "firstdealer_app",
    });
  } catch (error) {
    res.status(503).json({
      status: "error",
      error: error.message,
    });
  }
});

app.get("/api/v1/vin/:vin", requireApiKey, async (req, res) => {
  try {
    const result = await decodeVin(req.params.vin, {
      refresh: req.query.refresh === "true",
    });
    res.json(result);
  } catch (error) {
    res.status(error.statusCode ?? 500).json({
      error: error.message ?? "Internal Server Error",
    });
  }
});

app.post("/api/v1/vin/decode", requireApiKey, async (req, res) => {
  try {
    const vin = req.body?.vin ?? req.query.vin;
    const result = await decodeVin(vin, {
      refresh: req.body?.refresh === true || req.query.refresh === "true",
    });
    res.json(result);
  } catch (error) {
    res.status(error.statusCode ?? 500).json({
      error: error.message ?? "Internal Server Error",
    });
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: error.message ?? "Internal Server Error" });
});

export default app;

if (process.env.NODE_ENV !== "test") {
  app.listen(port, "0.0.0.0", () => {
    console.log(`VIN Decode API listening on http://0.0.0.0:${port}`);
    console.log("Endpoints:");
    console.log("  GET  /health");
    console.log("  GET  /health/db");
    console.log("  GET  /api/v1/vin/:vin");
    console.log("  POST /api/v1/vin/decode");
  });
}
