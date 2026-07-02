import { findDashboardUser, verifyDashboardPassword } from "../lib/dashboardCreds.js";

function parseBasicAuth(header) {
  if (!header || !header.startsWith("Basic ")) return null;

  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;

    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch {
    return null;
  }
}

function sendUnauthorized(res) {
  res.setHeader("WWW-Authenticate", 'Basic realm="FFD Dashboard", charset="UTF-8"');
  res.status(401).json({ error: "Authentication required" });
}

export async function dashboardBasicAuth(req, res, next) {
  if (process.env.DASHBOARD_AUTH_DISABLED === "true") {
    req.dashboardUser = { username: "dev", display_name: "Dev (auth disabled)" };
    return next();
  }

  const credentials = parseBasicAuth(req.headers.authorization);
  if (!credentials?.username || !credentials.password) {
    return sendUnauthorized(res);
  }

  try {
    const user = await findDashboardUser(credentials.username);
    if (!user) {
      return sendUnauthorized(res);
    }

    const valid = await verifyDashboardPassword(user, credentials.password);
    if (!valid) {
      return sendUnauthorized(res);
    }

    req.dashboardUser = {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
    };
    return next();
  } catch (error) {
    console.error("Dashboard auth database error:", error);
    return res.status(503).json({ error: "Authentication service unavailable" });
  }
}
