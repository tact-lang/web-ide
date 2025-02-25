import { LogType } from '@/interfaces/log.interface';

export const ANSI_UNDERLINE_CODES = {
  enable: '\x1b[4m',
  disable: '\x1b[24m',
};

export const ANSI_CODES = {
  clearLine: '\x1b[2K\r',
  underline: ANSI_UNDERLINE_CODES,
};

export const COLOR_MAP: Record<LogType | 'info' | 'grey' | 'reset', string> = {
  grey: '\x1b[38;5;243m',
  success: '\x1b[38;5;40m',
  error: '\x1b[38;5;196m',
  warning: '\x1b[38;5;214m',
  info: '\x1b[38;5;33m',
  reset: '\x1b[0m',
};
