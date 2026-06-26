import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema-drizzle";

// 从环境变量构建连接配置
const connectionConfig = {
  host: process.env.PG_HOST!,
  port: parseInt(process.env.PG_PORT || "5432"),
  database: process.env.PG_DATABASE!,
  user: process.env.PG_USER!,
  password: process.env.PG_PASSWORD!,
  ssl: process.env.PG_SSLMODE === "require" ? "require" as const : undefined,
};

// 迁移客户端（低连接数，用于 drizzle-kit）
const migrationClient = postgres(connectionConfig, { max: 1 });

// 查询客户端（正常连接数）
const queryClient = postgres(connectionConfig);

// Drizzle 实例
export const db = drizzle(queryClient, { schema });

// 导出 migration client 用于 drizzle-kit
export { migrationClient };
