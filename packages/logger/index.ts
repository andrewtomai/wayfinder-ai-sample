/**
 * Simple Logger for Agent Debugging
 *
 * Logs key actions in the agent thinking loop.
 * Just console output with optional colors.
 */

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

// Browser console styles
const STYLES = {
  DEBUG: "color: #36a3ff; font-weight: 500",     // Cyan
  INFO: "color: #2ecc71; font-weight: 500",      // Green
  WARN: "color: #f39c12; font-weight: 500",      // Yellow
  ERROR: "color: #e74c3c; font-weight: bold",    // Red
} as const;

export class Logger {
  private enabled: boolean;

  constructor(enabled: boolean = true) {
    this.enabled = enabled;
  }

  private log(
    level: LogLevel,
    message: string,
    data?: unknown,
    indent: boolean = false
  ): void {
    if (!this.enabled) return;

    const style = STYLES[level];
    const prefix = `[${level}]`;
    const indentStr = indent ? "  " : "";

    if (data !== undefined) {
      console.log(`%c${indentStr}${prefix}%c ${message}`, style, "", data);
    } else {
      console.log(`%c${indentStr}${prefix}%c ${message}`, style, "");
    }
  }

  debug(message: string, data?: unknown): void {
    this.log("DEBUG", message, data, true);
  }

  info(message: string, data?: unknown): void {
    this.log("INFO", message, data, false);
  }

  warn(message: string, data?: unknown): void {
    this.log("WARN", message, data, false);
  }

  error(message: string, data?: unknown): void {
    this.log("ERROR", message, data, false);
  }
}

const logger = new Logger(true);

export default logger;
