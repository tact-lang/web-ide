import { IViewportRange, Terminal } from '@xterm/xterm';

export function exitCodeHoverHandler(
  terminal: Terminal,
  text: string,
  location: IViewportRange,
) {
  const terminalRect = terminal.element?.getBoundingClientRect();
  if (!terminalRect) return;

  // Access the private _renderer property to get precise character dimensions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderer = (terminal as any)._core?._renderService?._renderer;
  const dimensions = renderer?.value?.dimensions;
  if (!dimensions) return;

  const charWidth = dimensions.css.cell.width;
  const charHeight = dimensions.css.cell.height;

  const scrollOffset = terminal.buffer.active.viewportY;

  let linkX = (location.start.x - 1) * charWidth;
  const linkY = (location.start.y - 1 - scrollOffset) * charHeight;

  const popoverWidth = 400;

  // Ensure the popover does not overflow beyond the terminal's right edge
  if (linkX + popoverWidth > terminalRect.width) {
    linkX = terminalRect.width - popoverWidth - 10;
  }

  const exitCode = text.split(': ')[1];

  return {
    exitCode,
    x: linkX + 5,
    y: linkY + 25,
  };
}
