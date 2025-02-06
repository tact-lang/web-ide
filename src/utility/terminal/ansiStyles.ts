import { ANSI_UNDERLINE_CODES } from '@/constant/ansiCodes';

export const applyAnsiUnderline = (message: string) => {
  return `${ANSI_UNDERLINE_CODES.enable}${message}${ANSI_UNDERLINE_CODES.disable}`;
};
