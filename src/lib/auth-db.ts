
import "server-only";
import { Pool } from "pg";

const globalForPg = globalThis as unknown as {
  authPool?: Pool;
};

export const authPool =
  globalForPg.authPool ??
  new Pool({
    connectionString: process.env.DIRECT_URL,
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.authPool = authPool;
}
