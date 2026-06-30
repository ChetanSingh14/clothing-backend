import { appLogger } from "../config/logger.config";

export const logger = {
  log: (message: string, meta?: unknown) => appLogger.info(meta || {}, message),
  info: (message: string, meta?: unknown) => appLogger.info(meta || {}, message),
  error: (message: string, meta?: unknown) => appLogger.error(meta || {}, message),
  warn: (message: string, meta?: unknown) => appLogger.warn(meta || {}, message),
  debug: (message: string, meta?: unknown) => appLogger.debug(meta || {}, message),
  verbose: (message: string, meta?: unknown) => appLogger.trace(meta || {}, message),
};
