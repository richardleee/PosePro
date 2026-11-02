import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
dotenv.config({ path: path.join(root, ".env") });

export const env = {
  port: Number(process.env.PORT || 8787),
  webOrigin: process.env.WEB_ORIGIN || "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET || "dev-only-secret",
  databaseUrl: process.env.DATABASE_URL || "",
  useMemoryDb: process.env.USE_MEMORY_DB !== "false",
  stripeSecret: process.env.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  stripePriceMonthly: process.env.STRIPE_PRICE_MONTHLY || "",
  stripePriceYearly: process.env.STRIPE_PRICE_YEARLY || "",
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
};
