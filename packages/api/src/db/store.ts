import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { env } from "../env.js";
import { memoryDb } from "./memory.js";
import type { SubRow, UserRow } from "./types.js";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function usingMemory() {
  return env.useMemoryDb || !env.databaseUrl;
}

export async function initDb() {
  if (usingMemory()) {
    console.log("[api] Using in-memory store (set USE_MEMORY_DB=false and DATABASE_URL for Postgres)");
    return;
  }
  pool = new Pool({ connectionString: env.databaseUrl });
  const schema = fs.readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "schema.sql"),
    "utf8"
  );
  await pool.query(schema);
}

function requirePool() {
  if (!pool) throw new Error("Postgres not initialized");
  return pool;
}

export const store = {
  async createUser(email: string, passwordHash: string | null, googleSub: string | null): Promise<UserRow> {
    if (usingMemory()) return memoryDb.createUser(email, passwordHash, googleSub);
    const id = crypto.randomUUID();
    await requirePool().query(
      `INSERT INTO users (id, email, password_hash, google_sub) VALUES ($1,$2,$3,$4)`,
      [id, email.toLowerCase(), passwordHash, googleSub]
    );
    await requirePool().query(`INSERT INTO subscriptions (user_id, status) VALUES ($1,'free')`, [id]);
    return { id, email: email.toLowerCase(), password_hash: passwordHash, google_sub: googleSub };
  },
  async findUserByEmail(email: string) {
    if (usingMemory()) return memoryDb.findUserByEmail(email);
    const { rows } = await requirePool().query(`SELECT * FROM users WHERE email=$1`, [email.toLowerCase()]);
    return (rows[0] as UserRow) ?? null;
  },
  async findUserById(id: string) {
    if (usingMemory()) return memoryDb.findUserById(id);
    const { rows } = await requirePool().query(`SELECT * FROM users WHERE id=$1`, [id]);
    return (rows[0] as UserRow) ?? null;
  },
  async findUserByGoogle(sub: string) {
    if (usingMemory()) return memoryDb.findUserByGoogle(sub);
    const { rows } = await requirePool().query(`SELECT * FROM users WHERE google_sub=$1`, [sub]);
    return (rows[0] as UserRow) ?? null;
  },
  async getSub(userId: string) {
    if (usingMemory()) return memoryDb.getSub(userId);
    const { rows } = await requirePool().query(`SELECT * FROM subscriptions WHERE user_id=$1`, [userId]);
    return (rows[0] as SubRow) ?? null;
  },
  async upsertSub(row: SubRow) {
    if (usingMemory()) return memoryDb.upsertSub(row);
    await requirePool().query(
      `INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id, status, price_interval, trial_end, current_period_end)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (user_id) DO UPDATE SET
         stripe_customer_id=EXCLUDED.stripe_customer_id,
         stripe_subscription_id=EXCLUDED.stripe_subscription_id,
         status=EXCLUDED.status,
         price_interval=EXCLUDED.price_interval,
         trial_end=EXCLUDED.trial_end,
         current_period_end=EXCLUDED.current_period_end`,
      [
        row.user_id,
        row.stripe_customer_id,
        row.stripe_subscription_id,
        row.status,
        row.price_interval,
        row.trial_end,
        row.current_period_end,
      ]
    );
  },
  async getUsage(userId: string, date: string) {
    if (usingMemory()) return memoryDb.getUsage(userId, date);
    const { rows } = await requirePool().query(
      `SELECT count FROM planner_usage WHERE user_id=$1 AND utc_date=$2`,
      [userId, date]
    );
    return rows[0]?.count ?? 0;
  },
  async bumpUsage(userId: string, date: string) {
    if (usingMemory()) return memoryDb.bumpUsage(userId, date);
    await requirePool().query(
      `INSERT INTO planner_usage (user_id, utc_date, count) VALUES ($1,$2,1)
       ON CONFLICT (user_id, utc_date) DO UPDATE SET count = planner_usage.count + 1`,
      [userId, date]
    );
    return store.getUsage(userId, date);
  },
  async putShare(row: { id: string; user_id: string; payload: unknown; created_at: string; revoked_at: string | null }) {
    if (usingMemory()) return memoryDb.putShare(row);
    await requirePool().query(
      `INSERT INTO share_cards (id, user_id, payload, created_at, revoked_at) VALUES ($1,$2,$3,$4,$5)`,
      [row.id, row.user_id, JSON.stringify(row.payload), row.created_at, row.revoked_at]
    );
  },
  async getShare(id: string) {
    if (usingMemory()) return memoryDb.getShare(id);
    const { rows } = await requirePool().query(`SELECT * FROM share_cards WHERE id=$1`, [id]);
    return rows[0] ?? null;
  },
  async listShares(userId: string) {
    if (usingMemory()) return memoryDb.listShares(userId);
    const { rows } = await requirePool().query(
      `SELECT * FROM share_cards WHERE user_id=$1 ORDER BY created_at DESC`,
      [userId]
    );
    return rows;
  },
  async revokeShare(id: string, userId: string) {
    if (usingMemory()) return memoryDb.revokeShare(id, userId);
    const res = await requirePool().query(
      `UPDATE share_cards SET revoked_at=now() WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL`,
      [id, userId]
    );
    return (res.rowCount ?? 0) > 0;
  },
  async putSync(userId: string, ciphertext: string) {
    if (usingMemory()) return memoryDb.putSync(userId, ciphertext);
    await requirePool().query(
      `INSERT INTO profile_sync (user_id, ciphertext, updated_at) VALUES ($1,$2,now())
       ON CONFLICT (user_id) DO UPDATE SET ciphertext=EXCLUDED.ciphertext, updated_at=now()`,
      [userId, ciphertext]
    );
  },
  async getSync(userId: string) {
    if (usingMemory()) return memoryDb.getSync(userId);
    const { rows } = await requirePool().query(`SELECT ciphertext, updated_at FROM profile_sync WHERE user_id=$1`, [
      userId,
    ]);
    return rows[0] ?? null;
  },
  async deleteUserData(userId: string) {
    if (usingMemory()) return memoryDb.deleteUserData(userId);
    const due = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const client = await requirePool().connect();
    try {
      await client.query("BEGIN");
      await client.query(`DELETE FROM share_cards WHERE user_id=$1`, [userId]);
      await client.query(`DELETE FROM planner_usage WHERE user_id=$1`, [userId]);
      await client.query(`DELETE FROM profile_sync WHERE user_id=$1`, [userId]);
      await client.query(`DELETE FROM subscriptions WHERE user_id=$1`, [userId]);
      await client.query(
        `INSERT INTO erasure_requests (user_id, due_at, completed_at) VALUES ($1,$2,now())
         ON CONFLICT (user_id) DO UPDATE SET completed_at=now()`,
        [userId, due.toISOString()]
      );
      await client.query(`DELETE FROM users WHERE id=$1`, [userId]);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  },
};
