/** Minimal timestamped logger so step output is easy to follow in CI logs. */
type Level = 'INFO' | 'WARN' | 'ERROR';

const write = (level: Level, scope: string, message: string): void => {
  const line = `[${new Date().toISOString()}] [${level}] [${scope}] ${message}`;
  if (level === 'ERROR') console.error(line);
  else if (level === 'WARN') console.warn(line);
  else console.log(line);
};

export const createLogger = (scope: string) => ({
  info: (msg: string) => write('INFO', scope, msg),
  warn: (msg: string) => write('WARN', scope, msg),
  error: (msg: string) => write('ERROR', scope, msg),
});

export type Logger = ReturnType<typeof createLogger>;
