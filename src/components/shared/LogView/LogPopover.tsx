import { ExitCodes } from '@/constant/exitCodes';
import { WebLinkProvider } from '@/utility/terminal/xtermWebLinkProvider';
import { Terminal } from '@xterm/xterm';
import { Popover } from 'antd';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import s from './LogView.module.scss';

interface Props {
  terminal: Terminal | null;
}

interface IPopoverState {
  visible: boolean;
  text: string;
  x: number;
  y: number;
}

const defaultState: IPopoverState = {
  visible: false,
  text: '',
  x: 0,
  y: 0,
};

export const LogPopover: FC<Props> = ({ terminal }) => {
  const [popoverState, setPopoverState] = useState<IPopoverState>(defaultState);
  const [isHoveringPopover, setIsHoveringPopover] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  const showPopover = useCallback(
    (opts: { text: string; x: number; y: number }) => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      setPopoverState({
        visible: true,
        text: opts.text,
        x: opts.x,
        y: opts.y,
      });
    },
    [],
  );

  const hideTooltip = useCallback(() => {
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

    const exitCodeRegex = /Exit Code:\s*\d+\s*ⓘ/;

    terminal.registerLinkProvider(
      new WebLinkProvider(terminal, exitCodeRegex, () => {}, {
        hover: (e, text) => {
          const rect = terminal.element?.getBoundingClientRect();
          const offsetX = e.clientX - (rect?.left ?? 0);
          const offsetY = e.clientY - (rect?.top ?? 0);
          const exitCode = text.split(': ')[1];

          showPopover({
            text: exitCode.replace(' ⓘ', ''),
            x: offsetX,
            y: offsetY,
          });
        },
        leave: () => {
          hideTooltip();
        },
      }),
    );
  }, [terminal]);

  useEffect(() => {
    onInit();
  }, [terminal]);

  const { visible, text, x, y } = popoverState;

  if (!visible) return <></>;

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
        content={
          <div
            className={s.content}
            onMouseEnter={onPopoverMouseEnter}
            onMouseLeave={onPopoverMouseLeave}
          >
            <h4 className={s.exitCodeHeading}>Exit Code: {text}</h4>
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
              {ExitCodes[text]?.description}
            </Markdown>
            <a
              href={`https://docs.tact-lang.org/book/exit-codes/#${text}`}
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
