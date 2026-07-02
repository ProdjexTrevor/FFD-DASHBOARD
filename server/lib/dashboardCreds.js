import bcrypt from "bcryptjs";
import { query } from "../../src/lib/db.js";

const TABLE = "dashboard_creds";

export async function findDashboardUser(username) {
  const [user] = await query(
    `
    SELECT id, username, password_hash, display_name, is_active
    FROM ${TABLE}
    WHERE username = ? AND is_active = 1
    LIMIT 1
  `,
    [username]
  );

  return user ?? null;
}

export async function verifyDashboardPassword(user, password) {
  if (!user?.password_hash) return false;
  return bcrypt.compare(password, user.password_hash);
}

export async function hashDashboardPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function createDashboardUser({ username, password, displayName }) {
  const passwordHash = await hashDashboardPassword(password);
  const result = await query(
    `
    INSERT INTO ${TABLE} (username, password_hash, display_name)
    VALUES (?, ?, ?)
  `,
    [username, passwordHash, displayName ?? null]
  );

  return result.insertId;
}

export async function updateDashboardUserPassword({ username, password, displayName }) {
  const passwordHash = await hashDashboardPassword(password);
  const result = await query(
    `
    UPDATE ${TABLE}
    SET password_hash = ?, display_name = COALESCE(?, display_name), is_active = 1
    WHERE username = ?
  `,
    [passwordHash, displayName ?? null, username]
  );

  return result.affectedRows;
}

export async function upsertDashboardUser({ username, password, displayName }) {
  const existing = await findDashboardUser(username);
  if (existing) {
    await updateDashboardUserPassword({ username, password, displayName });
    return { updated: true, id: existing.id };
  }

  const id = await createDashboardUser({ username, password, displayName });
  return { updated: false, id };
}

export async function listDashboardUsers() {
  return query(
    `
    SELECT id, username, display_name, is_active, created_at, updated_at
    FROM ${TABLE}
    ORDER BY username ASC
  `
  );
}
