import { PrismaClient } from "@prisma/client";
import { logger } from "./logger.js";

const prisma = new PrismaClient({
  log: [
    { level: "query", emit: "event" },
    { level: "error", emit: "event" },
    { level: "warn", emit: "event" },
  ],
});

prisma.$on("query", (e) => {
  logger.debug({ query: e.query, params: e.params, duration: e.duration }, "Database query");
});

prisma.$on("error", (e) => {
  logger.error({ message: e.message }, "Database error");
});

export { prisma };
