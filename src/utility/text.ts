import { ExitCodes } from '@/constant/exitCodes';
import { applyAnsiUnderline } from './terminal/ansiStyles';

export const EXIT_CODE_PATTERN = /exit_code:\s*(\d+)/;

export const highLightExitCode = (message: string) => {
  const match = message.match(EXIT_CODE_PATTERN);
  const code = match ? match[1] : undefined;

  if (match && code && ExitCodes[code]) {
    const highlightedMessage = applyAnsiUnderline(`exit_code: ${code}`);
    const newMessage = message.replace(EXIT_CODE_PATTERN, highlightedMessage);
    return newMessage;
  }
  return message;
};
