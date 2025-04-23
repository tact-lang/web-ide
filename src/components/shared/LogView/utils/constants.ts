import { ITerminalOptions } from '@xterm/xterm';

export const LIGHT_TERMINAL_THEME = {
  background: '#eaeaea',
  foreground: '#1e1e1e',
  cursor: '#1e1e1e',
  selectionBackground: '#d0d0d0',
  black: '#000000',
  red: '#cd3131',
  green: '#00bc7f',
  yellow: '#949800',
  blue: '#0451a5',
  magenta: '#bc05bc',
  cyan: '#0598bc',
  white: '#ffffff',
  brightBlack: '#666666',
  brightRed: '#f14c4c',
  brightGreen: '#23d18b',
  brightYellow: '#f5f543',
  brightBlue: '#3b8eea',
  brightMagenta: '#d670d6',
  brightCyan: '#29b8db',
  brightWhite: '#1e1e1e',
};

export const DARK_TERMINAL_THEME = {
  background: '#181717',
  foreground: '#ffffff',
  cursor: '#ffffff',
  selectionBackground: '#4d4d4d',
  black: '#000000',
  red: '#cd3131',
  green: '#0dbc79',
  yellow: '#e5e510',
  blue: '#2472c8',
  magenta: '#bc3fbc',
  cyan: '#11a8cd',
  white: '#e5e5e5',
  brightBlack: '#666666',
  brightRed: '#f14c4c',
  brightGreen: '#23d18b',
  brightYellow: '#f5f543',
  brightBlue: '#3b8eea',
  brightMagenta: '#d670d6',
  brightCyan: '#29b8db',
  brightWhite: '#ffffff',
};

export const TERMINAL_OPTIONS: ITerminalOptions = {
  cursorBlink: false,
  cursorStyle: 'bar',
  disableStdin: true,
  convertEol: true,
};
