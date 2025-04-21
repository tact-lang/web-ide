import { ExitCodes } from '@/constant/exitCodes';
import { WebLinkProvider } from '@/utility/terminal/xtermWebLinkProvider';
import { Terminal } from '@xterm/xterm';
import { Popover } from 'antd';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import s from './LogView.module.scss';
import { exitCodeHoverHandler } from './utils/helper';

interface Props {
  terminal: Terminal | null;
}

interface IPopoverState {
  visible: boolean;
  exitCode: string | null;
  x: number;
  y: number;
}

const defaultState: IPopoverState = {
  visible: false,
  exitCode: null,
  x: 0,
  y: 0,
};

export const LogPopover: FC<Props> = ({ terminal }) => {
  const [popoverState, setPopoverState] = useState<IPopoverState>(defaultState);
  const [isHoveringPopover, setIsHoveringPopover] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  const showPopover = useCallback(
    ({ exitCode, x, y }: Omit<IPopoverState, 'visible'>) => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      setPopoverState({
        visible: true,
        exitCode,
        x,
        y,
      });
    },
    [],
  );

  const hidePopover = useCallback(() => {
    hideTimerRef.current = window.setTimeout(() => {
      if (!isHoveringPopover) {
        setPopoverState((state) => ({ ...state, visible: false }));
      }
    }, 200);
  }, [isHoveringPopover]);

  const onPopoverMouseLeave = () => {
    setIsHoveringPopover(false);
    setPopoverState((state) => ({ ...state, visible: false }));
  };

  const onPopoverMouseEnter = () => {
    setIsHoveringPopover(true);
    if (hideTimerRef.current) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const onInit = useCallback(() => {
    if (!terminal) return;

    ['exit_code', 'action_result_code'].map((label) => {
      terminal.registerLinkProvider(
        new WebLinkProvider(
          terminal,
          new RegExp(`${label}:\\s*(\\d+)`),
          () => {},
          {
            hover: (_, text, location) => {
              const data = exitCodeHoverHandler(terminal, text, location);
              if (!data) return;
              showPopover(data);
            },
            leave: () => {
              hidePopover();
            },
            validator(match) {
              const code = match[1];
              return ExitCodes[code] !== undefined;
            },
          },
        ),
      );
    });
  }, [terminal]);

  useEffect(() => {
    onInit();
  }, [terminal]);

  const { visible, exitCode, x, y } = popoverState;

  if (!visible || !exitCode) return <></>;

  return (
    <div
      style={{
        left: x,
        top: y,
      }}
      className={s.popoverRoot}
    >
      <Popover
        open={true}
        rootClassName={s.logPopover}
        placement="topLeft"
        key={x + y}
        arrow={false}
        content={
          <div
            className={s.content}
            onMouseEnter={onPopoverMouseEnter}
            onMouseLeave={onPopoverMouseLeave}
          >
            <Markdown
              components={{
                a: ({ href, children, ...props }) => {
                  return (
                    <a href={href} target="_blank" rel="noreferrer" {...props}>
                      {children}
                    </a>
                  );
                },
              }}
            >
              {ExitCodes[exitCode]?.description}
            </Markdown>
            <a
              href={`https://docs.tact-lang.org/book/exit-codes/#${exitCode}`}
              target="_blank"
              rel="noreferrer"
              className={s.readMore}
            >
              Read more
            </a>
          </div>
        }
        trigger="click"
      >
        <span style={{ display: 'inline-block', width: 0, height: 0 }} />
      </Popover>
    </div>
  );
};
