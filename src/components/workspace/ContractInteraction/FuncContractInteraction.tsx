import { useFile } from '@/hooks';
import { useContractAction } from '@/hooks/contract.hooks';
import { useLogActivity } from '@/hooks/logActivity.hooks';
import { baseProjectPath, useProject } from '@/hooks/projectV2.hooks';
import { CellABI, ProjectSetting } from '@/interfaces/workspace.interface';
import { buildTs } from '@/utility/typescriptHelper';
import { Cell } from '@ton/core';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { Button, Form } from 'antd';
import { useForm } from 'antd/lib/form/Form';
import { FC, useEffect, useRef, useState } from 'react';
import { OutputChunk } from 'rollup';
import ABIUi from '../ABIUi';
import CellBuilder, {
  CellValues,
  generateCellCode,
} from '../BuildProject/CellBuilder';
import { globalWorkspace } from '../globalWorkspace';
import { ProjectInteractionProps } from './ContractInteraction';
import s from './ContractInteraction.module.scss';

const FuncContractInteraction: FC<ProjectInteractionProps> = ({
  contractAddress,
  abi,
  network,
  contract = null,
}) => {
  const [tonConnector] = useTonConnectUI();
  const [isLoading, setIsLoading] = useState('');
  const { sendMessage } = useContractAction();
  const { getFile } = useFile();
  const { updateProjectSetting, activeProject } = useProject();
  const { createLog } = useLogActivity();
  const { sandboxWallet: wallet } = globalWorkspace;
  const [messageForm] = useForm();

  const cellBuilderRef = useRef<HTMLIFrameElement>(null);

  type FormValues = Record<string, Cell> | undefined;

  const createCell = async (cell: Cell | undefined) => {
    if (!cellBuilderRef.current?.contentWindow) return;
    let cellCode = '';

    const contractCellContent = await getFile(
      `${activeProject?.path}/message.cell.ts`,
    );
    if (!contractCellContent && !cell) {
      throw new Error('Cell data is missing in file message.cell.ts');
    }
    if (cell) {
      cellCode = generateCellCode(cell as unknown as CellValues[]);
      updateProjectSetting({
        cellABI: { setter: cell as CellABI },
      } as ProjectSetting);
    } else {
      cellCode = contractCellContent as string;
    }
    try {
      const jsOutout = await buildTs(
        {
          'message.cell.ts': cellCode,
          'cell.ts': 'import cell from "./message.cell.ts"; cell;',
        },
        'cell.ts',
      );
      const finalJsoutput = (jsOutout as OutputChunk[])[0].code
        .replace(/^import\s+{/, 'const {')
        .replace(/}\s+from\s.+/, '} = window.TonCore;');

      cellBuilderRef.current.contentWindow.postMessage(
        {
          name: 'ton-web-ide',
          type: 'abi-data',
          code: finalJsoutput,
        },
        '*',
      );
    } catch (error) {
      setIsLoading('');
      if ((error as Error).message.includes("'default' is not exported by ")) {
        throw new Error("'default' is not exported by message.cell.ts");
      }
      createLog(
        'Something went wrong. Check browser console for details.',
        'error',
      );
      throw error;
    }
  };

  const onFuncSubmit = async (formValues: FormValues) => {
    try {
      setIsLoading('setter');
      await createCell(formValues?.cell);
    } catch (error) {
      setIsLoading('');
      if (typeof error === 'string') {
        createLog(error, 'error');
        return;
      }
      if ((error as Error).message.includes('Wrong AccessKey used for')) {
        createLog('Contract address changed. Relogin required.', 'error');
      }
    } finally {
      setIsLoading('');
    }
  };

  const send = async (data: string) => {
    const messageResponse = await sendMessage(
      data,
      contractAddress,
      contract,
      network,
      wallet!,
    );

    messageResponse?.logs?.map((log) => {
      createLog(log, 'info');
    });
  };

  const cellBuilder = (info: string) => {
    return <CellBuilder form={messageForm} info={info} type="setter" />;
  };

  useEffect(() => {
    const handler = async (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      event: MessageEvent<{ name: string; type: string; data: any }>,
    ) => {
      if (
        typeof event.data !== 'object' ||
        event.data.type !== 'abi-data' ||
        event.data.name !== 'ton-web-ide'
      ) {
        setIsLoading('');
        return;
      }

      try {
        await send(event.data.data);
        createLog('Message sent successfully', 'success');
      } catch (error) {
        console.log('error', error);
      } finally {
        setIsLoading('');
      }
    };

    window.addEventListener('message', handler as unknown as EventListener);
    return () => {
      window.removeEventListener(
        'message',
        handler as unknown as EventListener,
      );
    };
  }, [isLoading, tonConnector, network, contractAddress, contract]);

  if (!contractAddress) {
    return <></>;
  }

  return (
    <div className={s.root}>
      <iframe
        className={s.cellBuilderRef}
        ref={cellBuilderRef}
        src="/html/tonweb.html"
        sandbox="allow-scripts  allow-same-origin"
      />
      {activeProject?.path === `${baseProjectPath}/temp` && (
        <p className="color-warn">
          You are using code that has been imported from an external source.
          Exercise caution with the contract code before executing it.
        </p>
      )}

      <p>
        Below options will be used to send internal message and call getter
        method on contract after the contract is deployed.
      </p>
      {abi && abi.getters.length > 0 && (
        <>
          <h3 className={s.label}>Getters ({abi.getters.length})</h3>
          {abi.getters.map((item, i) => (
            <ABIUi
              abi={item}
              key={i}
              contractAddress={contractAddress}
              network={network}
              contract={contract}
              type="Getter"
            />
          ))}
        </>
      )}
      <br />
      <h3 className={s.label}>Send internal message</h3>
      <Form
        className={`${s.form} app-form`}
        form={messageForm}
        onFinish={(values) => {
          onFuncSubmit(values as FormValues).catch(() => {});
        }}
      >
        {cellBuilder('Update cell in ')}
        <Button
          type="default"
          htmlType="submit"
          loading={isLoading === 'setter'}
          className={`${s.sendMessage} bordered-gradient`}
        >
          Send
        </Button>
      </Form>
    </div>
  );
};

export default FuncContractInteraction;
