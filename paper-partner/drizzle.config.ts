import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// 加载 .env.local
config({ path: ".env.local" });

// 读取环境变量
const pgHost = process.env.PG_HOST;
const pgPort = process.env.PG_PORT || "5432";
const pgDatabase = process.env.PG_DATABASE;
const pgUser = process.env.PG_USER;
const pgPassword = process.env.PG_PASSWORD;
const pgSslmode = process.env.PG_SSLMODE;

// 构建连接 URL
const connectionUrl = pgHost && pgDatabase && pgUser && pgPassword
  ? `postgresql://${pgUser}:${pgPassword}@${pgHost}:${pgPort}/${pgDatabase}${pgSslmode === "require" ? "?sslmode=require" : ""}`
  : undefined;

export default defineConfig({
  schema: "./lib/db/schema-drizzle.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionUrl!,
  },
});
