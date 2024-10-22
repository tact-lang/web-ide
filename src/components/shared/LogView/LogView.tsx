import { useLogActivity } from '@/hooks/logActivity.hooks';
import EventEmitter from '@/utility/eventEmitter';
import { FC, createRef, useEffect, useRef, useState } from 'react';
import { useEffectOnce } from 'react-use';

import 'xterm/css/xterm.css';

import { Filter } from '@/components/workspace/BottomPanel/BottomPanel';
import { AppConfig } from '@/config/AppConfig';
import { LogEntry, LogType } from '@/interfaces/log.interface';
import { delay } from '@/utility/utils';
import type { SearchAddon as SearchAddonType } from '@xterm/addon-search';
import type { Terminal as TerminalType } from 'xterm';
import type { FitAddon as FitAddonType } from 'xterm-addon-fit';
import s from './LogView.module.scss';

interface Props {
  filter: Filter;
}

const LogView: FC<Props> = ({ filter }) => {
  const { getLog } = useLogActivity();
  const logViewerRef = createRef<HTMLDivElement>();
  const isTerminalLoaded = useRef(false);
  const fitAddon = useRef<FitAddonType | null>(null);
  const terminal = useRef<TerminalType | null>(null);
  const searchAddon = useRef<SearchAddonType | null>(null);
  const [filterType, setFilterType] = useState<LogType | 'all'>('all');

  const formatTimestamp = (timestamp: string | number | Date) => {
    if (!timestamp) return '\x1b[0m \x1b[0m';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  const colorMap = {
    grey: '\x1b[38;5;243m',
    success: '\x1b[38;5;40m',
    error: '\x1b[38;5;196m',
    warning: '\x1b[38;5;214m',
    info: '\x1b[38;5;33m',
    reset: '\x1b[0m',
  };

  const printLog = (data: LogEntry) => {
    if (!terminal.current) return;
    let timestamp = `${colorMap.grey} ${formatTimestamp(data.timestamp)} ${
      colorMap.reset
    }`;
    if (!data.timestamp) {
      timestamp = '';
    }
    terminal.current.writeln(
      `${colorMap[data.type]}${data.text}${colorMap.reset} ${timestamp}`,
    );
  };

  useEffect(() => {
    (async () => {
      let logs: LogEntry[] = [];
      if (filter.type !== filterType) {
        setFilterType(filter.type);
        EventEmitter.emit('LOG_CLEAR');
        if (filter.type === 'all') {
          logs = getLog(null);
        } else {
          logs = getLog({ type: filter.type });
        }
        for (const log of logs) {
          printLog(log);
        }
      }
      if (!searchAddon.current) {
        return;
      }
      if (logs.length !== 0) {
        await delay(500);
      }
      searchAddon.current.findNext(filter.text);
    })().catch(() => {});
  }, [filter]);

  useEffectOnce(() => {
    let _terminal: TerminalType | null = null;

    const onGenericLog = (data: LogEntry) => {
      printLog(data);
    };

    const onTestCaseLog = (data: string) => {
      if (!terminal.current) return;
      terminal.current.write(data);
    };

    const initTerminal = async () => {
      if (!logViewerRef.current) return;
      const appTerminal = document.getElementById('app-terminal');
      if (!appTerminal) return;
      while (appTerminal.children.length) {
        appTerminal.removeChild(appTerminal.children[0]);
        EventEmitter.off('LOG');
        EventEmitter.off('LOG_CLEAR');
      }

      const { Terminal } = await import('xterm');
      const [FitAddon, SearchAddon] = await Promise.all([
        import('xterm-addon-fit'),
        import('@xterm/addon-search'),
      ]);
      _terminal = new Terminal({
        fontSize: 16.5,
        cursorBlink: false,
        cursorStyle: 'bar',
        disableStdin: true,
        convertEol: true,
      });

      terminal.current = _terminal;

      const _searchAddon = new SearchAddon.SearchAddon();
      _terminal.loadAddon(_searchAddon);
      searchAddon.current = _searchAddon;

      const _fitAddon = new FitAddon.FitAddon();
      fitAddon.current = _fitAddon;

      _terminal.loadAddon(_fitAddon);

      _terminal.open(appTerminal);
      _terminal.writeln(
        `${colorMap.info}Welcome to ${AppConfig.name}${colorMap.reset}`,
      );
      _searchAddon.activate(_terminal);
      _fitAddon.fit();

      EventEmitter.on('LOG_CLEAR', () => {
        _terminal?.clear();
      });

      EventEmitter.on('LOG', onGenericLog);
      EventEmitter.on('TEST_CASE_LOG', onTestCaseLog);
    };
    if (typeof window === 'undefined') {
      return;
    }
    if (!isTerminalLoaded.current && logViewerRef.current) {
      isTerminalLoaded.current = true;
      initTerminal().catch(() => {});
    }

    const onReSize = () => {
      const screen = document.getElementsByClassName(
        'xterm-screen',
      )[0] as HTMLElement;
      const viewport = document.getElementsByClassName(
        'xterm-viewport',
      )[0] as HTMLElement;
      const scrollArea = document.getElementsByClassName(
        'xterm-scroll-area',
      )[0] as HTMLElement;
      // workaround for scrollbar resize bugs
      const documentPane = document.getElementById(
        'app-terminal',
      ) as HTMLElement;

      screen.style.height = documentPane.clientHeight + 'px';
      viewport.style.height = documentPane.clientHeight + 'px';
      scrollArea.style.height = screen.style.height;

      try {
        fitAddon.current?.fit();
      } catch (error) {
        /* empty */
      }
    };

    EventEmitter.on('ON_SPLIT_DRAG_END', onReSize);

    return () => {
      isTerminalLoaded.current = false;
      EventEmitter.off('LOG', onGenericLog);
      EventEmitter.off('TEST_CASE_LOG', onTestCaseLog);
      EventEmitter.off('LOG_CLEAR');
      EventEmitter.off('ON_SPLIT_DRAG_END', onReSize);
      // terminal.current?.dispose();
    };
  });

  return <div className={s.root} ref={logViewerRef} id="app-terminal"></div>;
};

export default LogView;
