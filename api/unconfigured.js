export default function handler(_req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.status(503).json({
    error:
      "Dashboard API is not connected. Deploy the Express API on host07 and set API_PROXY_URL in Vercel to that URL.",
    code: "API_PROXY_URL_MISSING",
  });
}
