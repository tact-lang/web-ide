import { Filter } from '@/components/workspace/BottomPanel/BottomPanel';
import { ANSI_CODES, COLOR_MAP } from '@/constant/ansiCodes';
import { LogEntry } from '@/interfaces/log.interface';
import { highLightExitCode } from '@/utility/text';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { FC, useCallback } from 'react';
import useLogFilter from './hooks/useLogFilter';
import useTerminal from './hooks/useTerminal';
import { LogPopover } from './LogPopover';
import s from './LogView.module.scss';
import { formatTimestamp } from './utils/formatTimestamp';

interface Props {
  filter: Filter;
}

const ensureAutoScroll = (terminal: Terminal) => {
  const buffer = terminal.buffer.active;

  const isScrolledUp = buffer.viewportY < buffer.baseY;

  if (isScrolledUp) {
    terminal.scrollToBottom();
  }
};

const LogView: FC<Props> = ({ filter }) => {
  const printLog = useCallback((data: LogEntry | string | Uint8Array) => {
    if (!terminalRef.current) return;

    ensureAutoScroll(terminalRef.current);

    if (typeof data === 'string' || data instanceof Uint8Array) {
      terminalRef.current.write(data);
      return;
    }
    const message = `${COLOR_MAP[data.type]}${highLightExitCode(data.text)}${COLOR_MAP.reset} ${formatTimestamp(data.timestamp)}`;
    if (data.text.startsWith(ANSI_CODES.clearLine)) {
      terminalRef.current.write(message);
    } else {
      terminalRef.current.writeln(message);
    }
  }, []);

  const { terminalContainerRef, terminalRef, searchAddonRef } = useTerminal({
    onLogClear: () => {
      terminalRef.current?.clear();
    },

    onLog: printLog,
  });

  useLogFilter(filter, printLog, searchAddonRef.current);

  return (
    <>
      <div className={s.root} ref={terminalContainerRef} id="app-terminal" />
      <LogPopover terminal={terminalRef.current} />
    </>
  );
};

export default LogView;
