import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { AppSettings, LocalPlan, LocalProfile, LocalShareCard } from "../types";

interface FrameCoachDB extends DBSchema {
  profiles: { key: string; value: LocalProfile };
  plans: { key: string; value: LocalPlan };
  shareCards: { key: string; value: LocalShareCard };
  settings: { key: string; value: AppSettings };
  usage: { key: string; value: { date: string; plannerCount: number } };
}

let dbp: Promise<IDBPDatabase<FrameCoachDB>> | null = null;

export function getDb() {
  if (!dbp) {
    dbp = openDB<FrameCoachDB>("framecoach-v1", 1, {
      upgrade(database) {
        database.createObjectStore("profiles", { keyPath: "id" });
        database.createObjectStore("plans", { keyPath: "id" });
        database.createObjectStore("shareCards", { keyPath: "id" });
        database.createObjectStore("settings", { keyPath: "key" });
        database.createObjectStore("usage", { keyPath: "date" });
      },
    });
  }
  return dbp;
}

export async function listProfiles() {
  return (await getDb()).getAll("profiles");
}
export async function getProfile(id: string) {
  return (await getDb()).get("profiles", id);
}
export async function putProfile(p: LocalProfile) {
  await (await getDb()).put("profiles", p);
}
export async function deleteProfile(id: string) {
  await (await getDb()).delete("profiles", id);
}

export async function listPlans() {
  return (await getDb()).getAll("plans");
}
export async function getPlan(id: string) {
  return (await getDb()).get("plans", id);
}
export async function putPlan(p: LocalPlan) {
  await (await getDb()).put("plans", p);
}
export async function deletePlan(id: string) {
  await (await getDb()).delete("plans", id);
}

export async function listCards() {
  return (await getDb()).getAll("shareCards");
}
export async function putCard(c: LocalShareCard) {
  await (await getDb()).put("shareCards", c);
}

export async function getSettings(): Promise<AppSettings> {
  const row = await (await getDb()).get("settings", "settings");
  return row ?? { key: "settings", cloudSyncEnabled: false };
}
export async function putSettings(s: AppSettings) {
  await (await getDb()).put("settings", s);
}

export function utcDate() {
  return new Date().toISOString().slice(0, 10);
}

export async function getTodayUsage() {
  const date = utcDate();
  const row = await (await getDb()).get("usage", date);
  return row?.plannerCount ?? 0;
}
export async function bumpPlannerUsage() {
  const date = utcDate();
  const count = (await getTodayUsage()) + 1;
  await (await getDb()).put("usage", { date, plannerCount: count });
  return count;
}

export async function wipeLocalProfilesAndPlans() {
  const db = await getDb();
  await db.clear("profiles");
  await db.clear("plans");
  await db.clear("shareCards");
  await putSettings({ key: "settings", cloudSyncEnabled: false });
}
