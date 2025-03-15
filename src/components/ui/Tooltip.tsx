import { Tooltip as TooltipAntd } from 'antd';
import { TooltipPlacement } from 'antd/es/tooltip';
import { FC } from 'react';

interface Props {
  title: React.ReactNode;
  placement?: TooltipPlacement;
  children: React.ReactNode;
}
const Tooltip: FC<Props> = ({ title, placement, children }) => {
  return (
    <TooltipAntd placement={placement} title={title}>
      {children}
    </TooltipAntd>
  );
};

export default Tooltip;
