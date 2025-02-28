import { useEffect, useState } from 'react';
import AppIcon from './icon';

const HmrStatus = () => {
  const [status, setStatus] = useState<'idle' | 'compiling'>('idle');
  useEffect(() => {
    if (import.meta.webpackHot) {
      const handler = (newStatus: string) => {
        if (newStatus === 'check') {
          setStatus('compiling');
        } else if (newStatus === 'idle') {
          setStatus('idle');
        }
      };

      import.meta.webpackHot.addStatusHandler(handler);

      return () => {
        import.meta.webpackHot?.removeStatusHandler(handler);
      };
    }
  }, []);

  return (
    <>
      {status === 'compiling' && (
        <div className="hmr-status">
          <AppIcon name="Refresh" />
        </div>
      )}
    </>
  );
};

export default HmrStatus;
