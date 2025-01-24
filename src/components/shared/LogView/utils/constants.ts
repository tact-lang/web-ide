import { LogType } from '@/interfaces/log.interface';
import { ITerminalOptions } from '@xterm/xterm';

export const COLOR_MAP: Record<LogType | 'info' | 'grey' | 'reset', string> = {
  grey: '\x1b[38;5;243m',
  success: '\x1b[38;5;40m',
  error: '\x1b[38;5;196m',
  warning: '\x1b[38;5;214m',
  info: '\x1b[38;5;33m',
  reset: '\x1b[0m',
};

export const TERMINAL_OPTIONS: ITerminalOptions = {
  fontSize: 16.5,
  cursorBlink: false,
  cursorStyle: 'bar',
  disableStdin: true,
  convertEol: true,
};
