import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { UserRow, SubRow } from "./types.js";

interface ShareRow {
  id: string;
  user_id: string;
  payload: unknown;
  created_at: string;
  revoked_at: string | null;
}

const users = new Map<string, UserRow>();
const usersByEmail = new Map<string, string>();
const usersByGoogle = new Map<string, string>();
const subs = new Map<string, SubRow>();
const usage = new Map<string, number>();
const shares = new Map<string, ShareRow>();
const syncStore = new Map<string, { ciphertext: string; updated_at: string }>();
const erasures = new Map<string, { requested_at: string; due_at: string; completed_at: string | null }>();

function usageKey(userId: string, date: string) {
  return `${userId}:${date}`;
}

export const memoryDb = {
  async createUser(email: string, passwordHash: string | null, googleSub: string | null): Promise<UserRow> {
    const id = randomUUID();
    const row: UserRow = { id, email: email.toLowerCase(), password_hash: passwordHash, google_sub: googleSub };
    users.set(id, row);
    usersByEmail.set(row.email, id);
    if (googleSub) usersByGoogle.set(googleSub, id);
    subs.set(id, {
      user_id: id,
      stripe_customer_id: null,
      stripe_subscription_id: null,
      status: "free",
      price_interval: null,
      trial_end: null,
      current_period_end: null,
    });
    return row;
  },
  async findUserByEmail(email: string) {
    const id = usersByEmail.get(email.toLowerCase());
    return id ? users.get(id) ?? null : null;
  },
  async findUserById(id: string) {
    return users.get(id) ?? null;
  },
  async findUserByGoogle(sub: string) {
    const id = usersByGoogle.get(sub);
    return id ? users.get(id) ?? null : null;
  },
  async getSub(userId: string) {
    return subs.get(userId) ?? null;
  },
  async upsertSub(row: SubRow) {
    subs.set(row.user_id, row);
  },
  async getUsage(userId: string, date: string) {
    return usage.get(usageKey(userId, date)) ?? 0;
  },
  async bumpUsage(userId: string, date: string) {
    const k = usageKey(userId, date);
    usage.set(k, (usage.get(k) ?? 0) + 1);
    return usage.get(k)!;
  },
  async putShare(row: ShareRow) {
    shares.set(row.id, row);
  },
  async getShare(id: string) {
    return shares.get(id) ?? null;
  },
  async listShares(userId: string) {
    return [...shares.values()].filter((s) => s.user_id === userId);
  },
  async revokeShare(id: string, userId: string) {
    const row = shares.get(id);
    if (!row || row.user_id !== userId) return false;
    row.revoked_at = new Date().toISOString();
    return true;
  },
  async putSync(userId: string, ciphertext: string) {
    syncStore.set(userId, { ciphertext, updated_at: new Date().toISOString() });
  },
  async getSync(userId: string) {
    return syncStore.get(userId) ?? null;
  },
  async deleteUserData(userId: string) {
    const user = users.get(userId);
    if (user) {
      usersByEmail.delete(user.email);
      if (user.google_sub) usersByGoogle.delete(user.google_sub);
    }
    users.delete(userId);
    subs.delete(userId);
    syncStore.delete(userId);
    for (const [id, s] of shares) if (s.user_id === userId) shares.delete(id);
    for (const k of usage.keys()) if (k.startsWith(userId + ":")) usage.delete(k);
    const now = new Date();
    const due = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    erasures.set(userId, {
      requested_at: now.toISOString(),
      due_at: due.toISOString(),
      completed_at: now.toISOString(),
    });
  },
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}
