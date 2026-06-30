import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export type LogLevel = 'info' | 'warn' | 'error';

const MAX_LOG_BYTES = 2 * 1024 * 1024;

let logFilePath: string | null = null;

function resolveLogPath(): string {
  if (logFilePath) return logFilePath;
  logFilePath = path.join(app.getPath('userData'), 'logs', 'app.log');
  return logFilePath;
}

function trimLogIfNeeded(filePath: string): void {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size <= MAX_LOG_BYTES) return;
    const content = fs.readFileSync(filePath, 'utf8');
    const trimmed = content.slice(-Math.floor(MAX_LOG_BYTES / 2));
    fs.writeFileSync(filePath, trimmed, 'utf8');
  } catch {
    // ignore trim errors
  }
}

export function getLogFilePath(): string {
  return resolveLogPath();
}

export function writeLog(level: LogLevel, message: string, detail?: unknown): void {
  const filePath = resolveLogPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const stamp = new Date().toISOString();
  const suffix =
    detail === undefined
      ? ''
      : ` | ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`;
  const line = `[${stamp}] [${level.toUpperCase()}] ${message}${suffix}\n`;

  try {
    fs.appendFileSync(filePath, line, 'utf8');
    trimLogIfNeeded(filePath);
  } catch (error) {
    console.error('[FileLogger] write failed:', error);
  }

  const consoleFn =
    level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
  consoleFn(`[FileLogger] ${message}`, detail ?? '');
}

export const fileLogger = {
  info: (message: string, detail?: unknown) => writeLog('info', message, detail),
  warn: (message: string, detail?: unknown) => writeLog('warn', message, detail),
  error: (message: string, detail?: unknown) => writeLog('error', message, detail),
  getPath: getLogFilePath,
};
