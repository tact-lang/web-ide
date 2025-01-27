import { Filter } from '@/components/workspace/BottomPanel/BottomPanel';
import { LogEntry } from '@/interfaces/log.interface';
import '@xterm/xterm/css/xterm.css';
import { FC, useCallback } from 'react';
import useLogFilter from './hooks/useLogFilter';
import useTerminal from './hooks/useTerminal';
import { LogPopover } from './LogPopover';
import s from './LogView.module.scss';
import { COLOR_MAP } from './utils/constants';
import { formatTimestamp } from './utils/formatTimestamp';

interface Props {
  filter: Filter;
}

const LogView: FC<Props> = ({ filter }) => {
  const printLog = useCallback((data: LogEntry | string | Uint8Array) => {
    if (!terminalRef.current) return;
    if (typeof data === 'string' || data instanceof Uint8Array) {
      terminalRef.current.write(data);
      return;
    }
    terminalRef.current.writeln(
      `${COLOR_MAP[data.type]}${data.text}${COLOR_MAP.reset} ${formatTimestamp(data.timestamp)}`,
    );
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
