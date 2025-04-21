import { ExitCodes } from '@/constant/exitCodes';
import { applyAnsiUnderline } from './terminal/ansiStyles';

export const EXIT_CODE_PATTERN = /(exit_code|action_result_code):\s*(\d+)/;

export const highLightExitCode = (message: string) => {
  return message.replace(
    new RegExp(EXIT_CODE_PATTERN.source, 'g'),
    (match, label, code) => {
      if (ExitCodes[code]) {
        return applyAnsiUnderline(`${label}: ${code}`);
      }
      return match;
    },
  );
};

export const stripSingleQuotes = (text: string) => {
  if (text.startsWith("'") && text.endsWith("'")) {
    // Remove the single quotes from start and end
    text = text.slice(1, -1);
  }
  return text;
};
