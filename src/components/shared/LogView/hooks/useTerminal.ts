import { AppConfig } from '@/config/AppConfig';
import { COLOR_MAP } from '@/constant/ansiCodes';
import { LogEntry } from '@/interfaces/log.interface';
import EventEmitter from '@/utility/eventEmitter';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { Terminal } from '@xterm/xterm';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '../../ThemeProvider';
import {
  DARK_TERMINAL_THEME,
  LIGHT_TERMINAL_THEME,
  TERMINAL_OPTIONS,
} from '../utils/constants';

interface UseTerminalProps {
  onLogClear: () => void;

  onLog: (data: LogEntry | string | Uint8Array) => void;
}

/**
 * Initializes and manages the xterm.js terminal.
 *
 * @param props - Callback functions for handling terminal events.
 * @returns An object containing references and methods to interact with the terminal.
 */
const useTerminal = ({ onLogClear, onLog }: UseTerminalProps) => {
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const terminalContainerRef = useRef<HTMLDivElement | null>(null);
  const [isTerminalInitialized, setIsTerminalInitialized] = useState(false);
  const { theme } = useTheme();

  const terminalTheme = useMemo(() => {
    return theme === 'dark' ? DARK_TERMINAL_THEME : LIGHT_TERMINAL_THEME;
  }, [theme]);

  const handleResize = useCallback(() => {
    const appTerminal: HTMLElement | null =
      document.getElementById('app-terminal');
    if (!appTerminal) return;

    const screen: HTMLElement | null =
      appTerminal.querySelector('.xterm-screen');
    const viewport: HTMLElement | null =
      appTerminal.querySelector('.xterm-viewport');
    const scrollArea: HTMLElement | null =
      appTerminal.querySelector('.xterm-scroll-area');

    if (screen && viewport && scrollArea) {
      const height = `${appTerminal.clientHeight}px`;
      screen.style.height = height;
      viewport.style.height = height;
      scrollArea.style.height = height;

      try {
        fitAddonRef.current?.fit();
      } catch (error) {
        console.error('Error fitting terminal:', error);
      }
    }
  }, []);

  useEffect(() => {
    const initializeTerminal = async () => {
      if (!terminalContainerRef.current || isTerminalInitialized) return;

      const { Terminal } = await import('@xterm/xterm');
      const [FitAddon, SearchAddon] = await Promise.all([
        import('@xterm/addon-fit'),
        import('@xterm/addon-search'),
      ]);

      const terminal = new Terminal({
        ...TERMINAL_OPTIONS,
        theme: terminalTheme,
      });
      terminalRef.current = terminal;

      const fitAddon = new FitAddon.FitAddon();
      fitAddonRef.current = fitAddon;
      terminal.loadAddon(fitAddon);

      const searchAddon = new SearchAddon.SearchAddon();
      searchAddonRef.current = searchAddon;
      terminal.loadAddon(searchAddon);

      terminal.open(terminalContainerRef.current);
      terminal.writeln(
        `${COLOR_MAP.info}Welcome to ${AppConfig.name}${COLOR_MAP.reset}`,
      );

      searchAddon.activate(terminal);
      fitAddon.fit();
      // Initial Fit
      handleResize();
      setIsTerminalInitialized(true);
    };

    initializeTerminal().catch((error) => {
      console.error('Failed to initialize terminal:', error);
    });
  }, [terminalContainerRef]);

  useEffect(() => {
    if (!isTerminalInitialized) return;
    EventEmitter.on('LOG_CLEAR', onLogClear);
    EventEmitter.on('LOG', onLog);
    window.addEventListener('resize', handleResize);
    EventEmitter.on('ON_SPLIT_DRAG_END', handleResize);
    return () => {
      EventEmitter.off('LOG_CLEAR', onLogClear);
      EventEmitter.off('LOG', onLog);
      window.removeEventListener('resize', handleResize);
      EventEmitter.off('ON_SPLIT_DRAG_END', handleResize);
    };
  }, [isTerminalInitialized]);

  useEffect(() => {
    if (!terminalRef.current) return;
    terminalRef.current.options.theme = terminalTheme;
  }, [theme]);

  return { terminalContainerRef, terminalRef, fitAddonRef, searchAddonRef };
};

export default useTerminal;
