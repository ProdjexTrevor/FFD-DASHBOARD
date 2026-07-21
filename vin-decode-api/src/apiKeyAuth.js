import { timingSafeEqual } from "node:crypto";

function readApiKey(req) {
  const headerKey = req.get("x-api-key");
  if (headerKey) return headerKey.trim();

  const auth = req.get("authorization");
  if (!auth) return null;

  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }

  return null;
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function requireApiKey(req, res, next) {
  const expected = process.env.API_KEY;
  if (!expected) {
    return res.status(500).json({
      error: "API_KEY is not configured on the server",
    });
  }

  const provided = readApiKey(req);
  if (!provided || !safeEqual(provided, expected)) {
    return res.status(401).json({ error: "Invalid or missing API key" });
  }

  return next();
}
