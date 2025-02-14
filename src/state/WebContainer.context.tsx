import { useLogActivity } from '@/hooks/logActivity.hooks';
import { WebContainer } from '@webcontainer/api';
import { createContext, useContext, useRef, useState } from 'react';

interface WebContainerContextType {
  webcontainer: WebContainer | null;
  status: string;
  init: () => Promise<void>;
}

const WebContainerContext = createContext<WebContainerContextType>({
  webcontainer: null,
  status: '',
  init: async () => {},
});

export const useWebContainer = () => useContext(WebContainerContext);

export function WebContainerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const webcontainerRef = useRef<WebContainer | null>(null);
  const { createLog } = useLogActivity();
  const [status, setStatus] = useState('');

  const initializeWebContainer = async () => {
    setStatus('Initializing the testing environment...');
    const timeout: Promise<never> = new Promise((_, reject) =>
      setTimeout(() => {
        reject(new Error('⏳ Initialization timed out!'));
      }, 240 * 1000),
    );
    try {
      webcontainerRef.current = await Promise.race([
        WebContainer.boot({
          coep: 'credentialless',
        }),
        timeout,
      ]);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'WebContainer already booted') {
          return;
        }
      }
      setStatus('loaded');
    }
  };

  const installPackages = async () => {
    if (!webcontainerRef.current) {
      return;
    }

    try {
      setStatus('Installing required dependencies...');

      await webcontainerRef.current.mount({
        'package.json': {
          file: {
            contents: JSON.stringify(
              {
                name: 'ton-web-ide-app',
                type: 'module',
                dependencies: {
                  jest: '29.7.0',
                  '@ton/core': '^0.60.0',
                  '@ton/test-utils': '0.5.0',
                  '@ton/sandbox': '^0.20.0',
                },
              },
              null,
              2,
            ),
          },
        },
      });

      const installProcess = await webcontainerRef.current.spawn('npm', [
        'install',
      ]);

      const exitCode = await installProcess.exit;

      if (exitCode === 0) {
        setStatus('loaded');
        createLog('✅ Unit testing environment setup complete. Ready to test.');
      } else {
        setStatus(`❌ Dependency installation failed (exit code: ${exitCode})`);
      }
    } catch (error) {
      if (error instanceof Error) {
        createLog(`❌ Error during dependency installation: ${error.message}`);
        return;
      }
      createLog('❌ Unknown error during dependency installation.');
    }
  };

  webcontainerRef.current?.on('server-ready', () => {});

  const init = async () => {
    if (status === 'loaded' || process.env.NEXT_PUBLIC_DISABLE_WEBCONTAINER) {
      return;
    }

    await initializeWebContainer();
    await installPackages();
  };

  return (
    <WebContainerContext.Provider
      value={{
        webcontainer: webcontainerRef.current,
        status,
        init,
      }}
    >
      {children}
    </WebContainerContext.Provider>
  );
}
