import pino from "pino";
import { config } from "../config/index.js";

const logger = pino({
  level: config.logging.level,
  transport:
    config.env === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
  base: {
    service: "poson-kiosk-backend",
  },
  redact: {
    paths: ["req.headers.authorization", "password", "cardNumber", "approvalNumber"],
    censor: "***REDACTED***",
  },
});

export { logger };
