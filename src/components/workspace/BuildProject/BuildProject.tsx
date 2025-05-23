import TonAuth from '@/components/auth/TonAuth/TonAuth';
import { useContractAction, UserContract } from '@/hooks/contract.hooks';
import { useLogActivity } from '@/hooks/logActivity.hooks';
import {
  ABIField,
  CellABI,
  ContractLanguage,
  NetworkEnvironment,
  ProjectSetting,
  TactABIField,
  TactInputFields,
} from '@/interfaces/workspace.interface';
import { Analytics } from '@/utility/analytics';
import { buildTs } from '@/utility/typescriptHelper';
import {
  delay,
  htmlToAnsi,
  isIncludesTypeCellOrSlice,
  shorten,
  stripPrefix,
  tonHttpEndpoint,
} from '@/utility/utils';
import { Network } from '@orbs-network/ton-access';
import { ABIArgument, Cell, Contract, StateInit } from '@ton/core';
import { Blockchain, SandboxContract } from '@ton/sandbox';
import { CHAIN, useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { Button, Form, Select } from 'antd';
import { FC, Fragment, useEffect, useRef, useState } from 'react';
import ContractInteraction from '../ContractInteraction';
import ExecuteFile from '../ExecuteFile/ExecuteFile';
import s from './BuildProject.module.scss';

import { Link } from '@/components/shared';
import { AppLogo } from '@/components/ui';
import AppIcon from '@/components/ui/icon';
import { useFile } from '@/hooks';
import { useProject } from '@/hooks/projectV2.hooks';
import { useSettingAction } from '@/hooks/setting.hooks';
import { ABIParser, parseInputs } from '@/utility/abi';
import { extractContractName } from '@/utility/contract';
import { filterABIFiles } from '@/utility/file';
import { replaceFileExtension } from '@/utility/filePath';
import { compilerVersion } from '@ton-community/func-js';
import { Maybe } from '@ton/core/dist/utils/maybe';
import { TonClient } from '@ton/ton';
import { useForm } from 'antd/lib/form/Form';
import { OutputChunk } from 'rollup';
import packageJson from '../../../../package.json';
import { renderField } from '../ABIUi/TactABIUi';
import { TonInputValue } from '../ABIUi/TonValueInput';
import { globalWorkspace, WalletDetails } from '../globalWorkspace';
import CellBuilder, { CellValues, generateCellCode } from './CellBuilder';

const blankABI = {
  getters: [],
  setters: [],
  initParams: [],
};

const SANDBOX_WALLET_PREFIX = 'SANDBOX_WALLET';

interface Props {
  projectId: string;
  onCodeCompile: (codeBOC: string) => void;
  contract: unknown;
  updateContract: (contractInstance: unknown) => void;
}
const BuildProject: FC<Props> = ({ projectId, contract, updateContract }) => {
  const [isLoading, setIsLoading] = useState('');
  const [buildCount, setBuildCount] = useState(0);
  const [compilerInfo, setCompilerInfo] = useState('');
  const { createLog } = useLogActivity();
  const [buildOutput, setBuildoutput] = useState<{
    contractBOC: string | null;
    dataCell: Cell | null;
  } | null>(null);
  const cellBuilderRef = useRef<HTMLIFrameElement>(null);
  const [contractABI, setContractABI] = useState<{
    getters: ABIField[];
    setters: ABIField[];
    initParams: Maybe<ABIArgument[]>;
  }>(blankABI);
  const [selectedContract, setSelectedContract] = useState<string | undefined>(
    undefined,
  );

  const [wallets, setWallets] = useState<WalletDetails[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<
    WalletDetails | undefined
  >(undefined);

  const previouslySelectedContract = useRef<string | null>();

  const { isAutoBuildAndDeployEnabled } = useSettingAction();
  const {
    projectFiles,
    readdirTree,
    activeProject,
    updateProjectSetting,
    updateABIInputValues,
    getABIInputValues,
  } = useProject();
  const { getFile } = useFile();

  const [tonConnector] = useTonConnectUI();
  const chain = tonConnector.wallet?.account.chain;
  const onChainWalletAddress = useTonAddress();

  const { sandboxBlockchain } = globalWorkspace;
  const tactVersion = stripPrefix(
    packageJson.dependencies['@tact-lang/compiler'],
    '^',
  );

  const environment = activeProject?.network ?? 'SANDBOX';

  const [deployForm] = useForm();

  const { deployContract } = useContractAction();

  const updateCompilerInfo = async () => {
    let versionInfo;
    if (activeProject?.language === 'tact') {
      versionInfo = `- Tact version: ${tactVersion}`;
    } else {
      const funcCompilerVersion = await compilerVersion();
      versionInfo = `- FunC version: ${funcCompilerVersion.funcVersion}`;
    }

    setCompilerInfo(versionInfo);
  };

  const contractsToDeploy = () => {
    if (!activeProject?.path) {
      return [];
    }
    return filterABIFiles(projectFiles, activeProject);
  };

  const cellBuilder = (info: string) => {
    if (!activeProject?.language || activeProject.language !== 'func')
      return <></>;
    return <CellBuilder form={deployForm} info={info} type="deploy" />;
  };

  const deployView = () => {
    const _contractsToDeploy = contractsToDeploy();

    if (_contractsToDeploy.length === 0) {
      return;
    }

    return (
      <>
        <hr />
        <Form
          className={`${s.form} app-form`}
          form={deployForm}
          layout="vertical"
          initialValues={{
            tonValue: 0.5,
          }}
          onFinish={(values) => {
            initDeploy(values as FormValues).catch(() => {});
          }}
          onValuesChange={(changedValues) => {
            if (Object.hasOwn(changedValues, 'contract')) {
              updateSelectedContract(changedValues.contract);
            }
          }}
        >
          <Form.Item
            name="contract"
            className={s.formItem}
            rules={[{ required: true, message: 'Please select contract' }]}
          >
            <Select
              placeholder="Select a contract"
              className="w-100"
              allowClear
            >
              {_contractsToDeploy.map((f) => (
                <Select.Option key={f.path} value={f.path} title={f.path}>
                  {f.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          {cellBuilder('Update initial contract state in ')}
          {selectedContract &&
            contractABI.initParams &&
            contractABI.initParams.length > 0 && (
              <div className={s.nestedForm}>
                {contractABI.initParams.map((item) => {
                  return (
                    <Fragment key={item.name}>
                      {renderField(
                        item as unknown as TactABIField,
                        projectFiles,
                      )}
                    </Fragment>
                  );
                })}
              </div>
            )}

          <TonInputValue name="tonValue" />

          <Button
            type="primary"
            htmlType="submit"
            // loading={isLoading == 'deploy'}
            disabled={selectedContract === undefined}
            className="w-100 item-center-align ant-btn-primary-gradient"
          >
            <AppIcon name="Rocket" />
            {activeProject?.contractAddress ? 'Redeploy' : 'Deploy'}
          </Button>
        </Form>
      </>
    );
  };

  interface FormValues {
    [key: string]: string | number | boolean | bigint | undefined;
    queryId?: string;
    cell?: string;
    contract?: string;
  }

  const initDeploy = async (formValues: FormValues) => {
    const { tonValue, ...tempFormValues } = formValues;

    let initParams = '';
    if (tempFormValues.queryId) {
      delete tempFormValues.queryId;
    }
    if (tempFormValues.cell) {
      delete tempFormValues.cell;
    }

    try {
      if (activeProject?.language === 'tact') {
        delete tempFormValues.contract;

        updateABIInputValues({
          key: 'init',
          value: tempFormValues as TactInputFields,
          type: 'Init',
        });

        const tsProjectFiles: Record<string, string> = {};
        if (isIncludesTypeCellOrSlice(tempFormValues)) {
          const fileCollection = await readdirTree(
            `${activeProject.path}`,
            {
              basePath: null,
              content: true,
            },
            (file: { path: string; name: string }) =>
              !file.path.startsWith('dist') &&
              file.name.endsWith('.ts') &&
              !file.name.endsWith('.spec.ts'),
          );
          fileCollection.forEach((file) => {
            tsProjectFiles[file.path!] = file.content ?? '';
          });
        }

        initParams = await parseInputs(
          JSON.parse(JSON.stringify(tempFormValues)),
          tsProjectFiles,
        );
      } else if (formValues.cell) {
        initParams = formValues.cell;
      }
      if (!tonConnector.connected && environment !== 'SANDBOX') {
        throw new Error('Please connect wallet');
      }
      if (chain && environment !== 'SANDBOX' && CHAIN[environment] !== chain) {
        throw new Error(`Please connect wallet to ${environment}`);
      }
      setIsLoading('deploy');
      await createStateInitCell(initParams, tonValue as string);
    } catch (error) {
      setIsLoading('');
      if (typeof error === 'string') {
        createLog(error, 'error');
        return;
      }
      if (error instanceof Error) {
        createLog(error.message, 'error');
        return;
      }
    }
  };

  const deploy = async (tonValue: string) => {
    createLog(`Deploying contract ...`, 'info');
    if (!selectedContract) {
      createLog('Select a contract', 'error');
      return;
    }

    const contractBOCPath = replaceFileExtension(
      selectedContract,
      '.abi',
      '.code.boc',
    );
    const contractBOC = (await getFile(contractBOCPath)) as string;
    if (!contractBOC) {
      throw new Error('Contract BOC is missing. Rebuild the contract.');
    }
    try {
      if (sandboxBlockchain && environment === 'SANDBOX' && selectedWallet) {
        const blockchain = await Blockchain.create();
        globalWorkspace.sandboxBlockchain = blockchain;

        const wallet = await blockchain.treasury(selectedWallet.key);
        globalWorkspace.sandboxWallet = wallet;
        createLog(
          htmlToAnsi(
            `Sandbox account created. Address: <i>${wallet.address.toString()}</i>`,
          ),
          'info',
          false,
        );
      }
      const init: StateInit = {
        code: contractBOC
          ? Cell.fromBoc(Buffer.from(contractBOC, 'base64'))[0]
          : undefined,
        data: buildOutput?.dataCell
          ? Cell.fromBoc(
              Buffer.from(buildOutput.dataCell as unknown as string, 'base64'),
            )[0]
          : undefined,
      };
      const contract =
        activeProject?.language === 'tact'
          ? window.contractInit
          : UserContract.createForDeploy(init);
      const {
        address: contractAddress,
        contract: openedContract,
        logs,
      } = await deployContract(
        environment.toLowerCase() as Network,
        activeProject?.language as ContractLanguage,
        contract as Contract,
        tonValue,
      );

      Analytics.track('Deploy project', {
        platform: 'IDE',
        type: `TON-${activeProject?.language}`,
        environment: environment.toLowerCase(),
      });
      createLog(
        htmlToAnsi(
          `Contract deployed on <b><i>${environment}</i></b> <br /> Contract address: ${contractAddress}`,
        ),
        'success',
      );

      const outputLog = Array.isArray(logs) ? logs : [];

      for (const log of outputLog) {
        if (!log) continue;
        createLog(log, 'info', true);
      }

      if (!contractAddress) {
        return;
      }
      updateContract(openedContract);

      updateProjectSetting({
        contractAddress: contractAddress,
        contractVerificationInputs: {
          ...activeProject?.contractVerificationInputs,
          ...(environment !== 'SANDBOX' && {
            contractFilePath: activeProject?.selectedContract,
            contractAddress: contractAddress,
            network: environment,
          }),
        },
      } as ProjectSetting);
    } catch (error) {
      console.log(error, 'error');
      const errorMessage = (error as Error).message.split('\n');
      for (const message of errorMessage) {
        createLog(message, 'error', true, true);
      }
    } finally {
      setIsLoading('');
    }
  };

  const createStateInitCell = async (initParams = '', tonValue: string) => {
    if (!selectedContract || !activeProject?.path) {
      throw new Error('Please select contract');
    }
    const contractScriptPath = replaceFileExtension(
      selectedContract,
      '.abi',
      '.ts',
    );
    if (!cellBuilderRef.current?.contentWindow) return;
    let contractScript = '';
    try {
      contractScript = (await getFile(contractScriptPath)) as string;
    } catch (error) {
      /* empty */
    }
    if (activeProject.language === 'tact' && !contractScript) {
      throw new Error('Contract script is missing. Rebuild the contract.');
    }

    try {
      let jsOutout = [];

      if (activeProject.language == 'tact') {
        jsOutout = await buildTs(
          {
            'tact.ts': contractScript,
          },
          'tact.ts',
        );
      } else {
        let stateInitContent = '';
        let cellCode = '';
        try {
          stateInitContent = (await getFile(
            `${activeProject.path}/stateInit.cell.ts`,
          )) as string;
        } catch (error) {
          console.log('stateInit.cell.ts is missing');
        }
        if (!stateInitContent && !initParams) {
          throw new Error(
            'State init data is missing in file stateInit.cell.ts',
          );
        }
        if (initParams) {
          cellCode = generateCellCode(initParams as unknown as CellValues[]);
          updateProjectSetting({
            cellABI: { deploy: initParams as CellABI },
          } as ProjectSetting);
        } else {
          cellCode = stateInitContent;
        }

        jsOutout = await buildTs(
          {
            'stateInit.cell.ts': cellCode,
            'cell.ts': 'import cell from "./stateInit.cell.ts"; cell;',
          },
          'cell.ts',
        );
      }

      const finalJsoutput = fromJSModule((jsOutout as OutputChunk[])[0].code);

      const contractName = extractContractName(
        selectedContract,
        activeProject.path,
      );

      if (activeProject.language == 'tact') {
        const _code = `async function main(initParams) {
          ${finalJsoutput}
          const contractInit = await ${contractName}.fromInit(...Object.values(initParams));
          return contractInit;
        } return main(initParams)`;
        //  TODO: Find a better solution may be worker or js sandbox
        // eslint-disable-next-line @typescript-eslint/no-implied-eval
        const contractInit = await new Function('initParams', _code)({
          ...(initParams as unknown as object),
        });
        window.contractInit = contractInit;
        deploy(tonValue).catch(() => {});
        return;
      }

      cellBuilderRef.current.contentWindow.postMessage(
        {
          name: 'ton-web-ide',
          type: 'state-init-data',
          code: finalJsoutput,
          language: activeProject.language,
          contractName: activeProject.contractName,
          initParams,
        },
        '*',
      );
    } catch (error) {
      setIsLoading('');
      const errorMessage = error instanceof Error ? error.message : '';
      if (errorMessage.includes('object is not defined')) {
        throw new Error('Rebuild contract first');
      }
      if (errorMessage.includes("'default' is not exported by ")) {
        throw new Error("'default' is not exported by stateInit.cell.ts");
      }
      if (errorMessage) {
        createLog(errorMessage, 'error');
        return;
      }
      throw error;
    }
  };

  const isContractInteraction = () => {
    let isValid =
      activeProject?.path && selectedContract && activeProject.contractAddress
        ? true
        : false;
    if (environment === 'SANDBOX') {
      isValid = isValid && globalWorkspace.sandboxBlockchain ? true : false;
    }
    return isValid;
  };

  const updateABI = async () => {
    if (!selectedContract) {
      setContractABI(blankABI);
      return;
    }
    const contractABIFile = (await getFile(selectedContract)) as string;

    if (selectedContract && !contractABIFile) {
      updateSelectedContract('');
      return;
    }
    if (!contractABIFile) {
      createLog('Contract ABI is missing. Rebuild the contract.', 'error');
      return;
    }
    const contractABI = JSON.parse(contractABIFile || '{}');
    if (activeProject?.language === 'tact') {
      const abi = new ABIParser(JSON.parse(JSON.stringify(contractABI)));
      contractABI.getters = abi.getters;
      contractABI.setters = abi.receivers;
      contractABI.initParams = abi.init;
    }

    setContractABI({
      getters: contractABI.getters || [],
      setters: contractABI.setters || [],
      initParams: contractABI.initParams || [],
    });
  };

  const getConnectedWallet = () => {
    if (!selectedWallet) {
      return <></>;
    }

    return (
      <div className={`${s.connectedWallet} wrap-text`}>
        Wallet Address: <span>{selectedWallet.address}</span>
      </div>
    );
  };

  const updatNetworkEnvironment = (network: NetworkEnvironment) => {
    updateProjectSetting({
      network,
    } as ProjectSetting);
  };

  const updateSelectedContract = async (contract: string | undefined) => {
    setSelectedContract(contract);
    await delay(500);
    updateProjectSetting({
      selectedContractABI: contract,
    });
  };

  const fromJSModule = (jsModuleCode: string) => {
    return jsModuleCode
      .replace(/^import\s+{/, 'const {')
      .replace(/}\s+from\s.+/, '} = window.TonCore;')
      .replace(/^\s*export\s+\{[^}]*\};\s*/m, '');
  };

  const getSelectedContractJsBuild = async (
    currentContractName: string,
    language: 'tact' | 'func',
    supressErrors = false,
  ) => {
    const contractScriptPath = replaceFileExtension(
      currentContractName,
      '.abi',
      '.ts',
    );
    const contractScript = (await getFile(contractScriptPath)) as string;
    if (language === 'tact' && !contractScript) {
      if (supressErrors) {
        return;
      }
      throw new Error('Contract script is missing. Rebuild the contract.');
    }

    const jsOutout = await buildTs(
      {
        'tact.ts': contractScript,
      },
      'tact.ts',
    );

    const finalJSoutput = fromJSModule((jsOutout as OutputChunk[])[0].code);

    return { finalJSoutput };
  };

  const updateContractInstance = async () => {
    if (
      !selectedContract ||
      !activeProject?.contractAddress ||
      activeProject.language !== 'tact' ||
      window.contractInit
    ) {
      return;
    }

    if (activeProject.contractAddress && environment == 'SANDBOX') {
      return;
    }

    const output = await getSelectedContractJsBuild(
      selectedContract,
      'tact',
      true,
    );
    if (!output) return;

    const contractName = extractContractName(
      selectedContract,
      activeProject.path!,
    );

    const _code = `async function main() {
      ${output.finalJSoutput}
      const contractInit  = await ${contractName}.fromAddress(window.TonCore.Address.parse('${activeProject.contractAddress}'));
      return contractInit;
    } return main()`;
    //  TODO: Find a better solution may be worker or js sandbox
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const contractInit = await new Function(_code)();
    window.contractInit = contractInit;

    const endpoint = tonHttpEndpoint({
      network: environment.toLocaleLowerCase() as Network,
    });

    const client = new TonClient({ endpoint });
    const _userContract = client.open(contractInit);
    updateContract(_userContract);
  };

  const autoSelectFirstContract = () => {
    const deployableContracts = contractsToDeploy();
    const isSelectedContractExists = deployableContracts.some(
      (file) => file.path === selectedContract,
    );

    if (deployableContracts.length > 0 && !isSelectedContractExists) {
      deployForm.setFieldsValue({
        contract: deployableContracts[0]?.path, // Set the first contract as default
      });
      updateSelectedContract(deployableContracts[0]?.path);
    }
  };

  const getSelectedContractABIPath = () => {
    const previousSelectedABIPath = activeProject?.selectedContractABI;
    if (!previousSelectedABIPath) return;

    const correspondingScriptPath = replaceFileExtension(
      previousSelectedABIPath,
      '.abi',
      '.ts',
    );

    let contractABIPath: string | undefined = previousSelectedABIPath;

    // in case of Tact, verify the presence of the corresponding contract wrapper script
    if (activeProject.language === 'tact') {
      const scriptFile = projectFiles.find(
        (file) => file.path === correspondingScriptPath,
      );
      const hasValidScriptFile =
        scriptFile &&
        projectFiles.find((file) => file.path === previousSelectedABIPath);

      contractABIPath = hasValidScriptFile
        ? previousSelectedABIPath
        : undefined;
    }
    return contractABIPath;
  };

  const fetchAvailableWallets = async () => {
    const SANDBOX_WALLET_COUNT = 5;

    if (environment !== 'SANDBOX') {
      if (!onChainWalletAddress) return [];
      return [
        {
          address: onChainWalletAddress,
          key: 'LIVE_WALLET',
        },
      ];
    }

    const { sandboxBlockchain } = globalWorkspace;

    if (!sandboxBlockchain) {
      return [];
    }

    const walletList = await Promise.all(
      Array.from({ length: SANDBOX_WALLET_COUNT }, async (_, index) => {
        const key = `${SANDBOX_WALLET_PREFIX}_${index}`;
        const newWallet = await sandboxBlockchain.treasury(key);

        return {
          address: newWallet.address.toString(),
          key,
        };
      }),
    );

    return walletList;
  };

  useEffect(() => {
    updateABI().catch(() => {});
  }, [selectedContract, contract]);

  useEffect(() => {
    updateCompilerInfo();
  }, [activeProject]);

  useEffect(() => {
    try {
      updateContractInstance().catch(() => {});
    } catch (e) {
      /* empty */
    }
  }, [selectedContract]);

  useEffect(() => {
    const contractABIPath = getSelectedContractABIPath();
    const deployableContracts = contractsToDeploy();

    const isSelectedContractExists = deployableContracts.some(
      (file) => file.path === contractABIPath,
    );

    if (isSelectedContractExists) {
      deployForm.setFieldsValue({
        contract: contractABIPath,
      });

      updateSelectedContract(contractABIPath);
    }

    const handler = (
      event: MessageEvent<{
        name: string;
        type: string;
        data: { data: Cell } | null;
        error: string;
      }>,
    ) => {
      if (
        typeof event.data !== 'object' ||
        event.data.type !== 'state-init-data' ||
        event.data.name !== 'ton-web-ide'
      ) {
        return;
      }
      if (event.data.error) {
        setIsLoading('');
        createLog(event.data.error, 'error');
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setBuildoutput((t: any) => {
        const oldState = typeof t === 'object' ? t : {};
        return {
          ...oldState,
          dataCell: event.data.data ?? '//',
        };
      });
    };

    if (activeProject?.language === 'tact') {
      const abiFields = getABIInputValues('init', 'Init');
      if (abiFields) {
        deployForm.setFieldsValue(abiFields);
      }
    }

    window.addEventListener('message', handler);
    return () => {
      window.removeEventListener('message', handler);
    };
  }, []);

  useEffect(() => {
    if (!buildOutput?.dataCell || !isLoading) {
      return;
    }
    deploy(deployForm.getFieldValue('tonValue')).catch(() => {});
  }, [buildOutput?.dataCell]);

  useEffect(() => {
    if (buildCount === 0) return;
    autoSelectFirstContract();
  }, [buildCount]);

  useEffect(() => {
    if (
      previouslySelectedContract.current &&
      activeProject?.selectedContract !== previouslySelectedContract.current
    ) {
      updateSelectedContract(undefined);
      deployForm.setFieldsValue({
        contract: undefined,
      });

      previouslySelectedContract.current = activeProject?.selectedContract;
    }
  }, [activeProject?.selectedContract]);

  useEffect(() => {
    const fetchWallets = async () => {
      const availableWallets = await fetchAvailableWallets();
      setWallets(availableWallets);

      const connectedKey = globalWorkspace.connectedWallet?.key;
      const existingConnectedWallet = availableWallets.find(
        (w) => w.key === connectedKey,
      );

      const selected = existingConnectedWallet ?? availableWallets[0];
      setSelectedWallet(selected);
      globalWorkspace.connectedWallet = selected;
    };

    fetchWallets();
  }, [activeProject?.path, environment, onChainWalletAddress]);

  useEffect(() => {
    const updateSandboxWallet = async () => {
      if (
        selectedWallet?.key.startsWith(SANDBOX_WALLET_PREFIX) &&
        sandboxBlockchain
      ) {
        globalWorkspace.sandboxWallet = await sandboxBlockchain.treasury(
          selectedWallet.key,
        );
      }
    };

    updateSandboxWallet();
  }, [selectedWallet]);

  return (
    <div className={`${s.root} onboarding-build-deploy`}>
      <h3 className={`section-heading`}>
        <AppLogo /> Build & Deploy
      </h3>
      <iframe
        className={`${s.cellBuilderRef} cell-builder-ref`}
        ref={cellBuilderRef}
        src="/html/tonweb.html"
        sandbox="allow-scripts  allow-same-origin"
      />
      <Form.Item
        label="Environment"
        className={`${s.formItem} select-search-input-dark`}
        labelAlign="left"
      >
        <Select
          value={environment}
          onChange={(value) => {
            updatNetworkEnvironment(value as NetworkEnvironment);
          }}
          options={[
            { value: 'SANDBOX', label: 'Sandbox' },
            { value: 'TESTNET', label: 'Testnet' },
            { value: 'MAINNET', label: 'Mainnet' },
          ]}
        />
      </Form.Item>

      <Form.Item
        label="Wallet"
        className={`${s.formItem} select-search-input-dark`}
        labelAlign="left"
      >
        <Select
          value={selectedWallet?.key}
          onChange={(key) => {
            const selectedWallet = wallets.find((w) => w.key === key);
            setSelectedWallet(selectedWallet);
            globalWorkspace.connectedWallet = selectedWallet;
          }}
          notFoundContent="No wallets available"
          placeholder="Select a wallet"
          disabled={!wallets.length}
        >
          {wallets.map((wallet) => (
            <Select.Option key={wallet.key} value={wallet.key}>
              {shorten(wallet.address)}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      {environment !== 'SANDBOX' && <TonAuth />}
      {getConnectedWallet()}

      <div className={s.actionWrapper}>
        <ExecuteFile
          key={`${projectId}-${environment}`}
          projectId={projectId as string}
          icon="Build"
          label={
            environment === 'SANDBOX' && activeProject?.language !== 'tact'
              ? 'Build'
              : 'Build'
          }
          description={`- Select a contract to build <br /> 
            ${
              isAutoBuildAndDeployEnabled()
                ? '- Auto-build and deploy is enabled for Sandbox and can be changed in settings. <br />'
                : ''
            } 
            ${compilerInfo}
            `}
          allowedFile={activeProject?.language === 'tact' ? ['tact'] : ['fc']}
          onCompile={() => {
            (async () => {
              if (
                environment === 'SANDBOX' &&
                activeProject?.language === 'tact'
              ) {
                setBuildCount((prevCount) => prevCount + 1);
                if (selectedContract) {
                  await delay(500);
                  updateABI().catch(() => {});
                }
                if (!isAutoBuildAndDeployEnabled()) return;
                await delay(200);
                deployForm.submit();
              }
            })().catch(() => {});
          }}
        />
        {activeProject?.selectedContract && deployView()}
      </div>

      {activeProject?.contractAddress && environment !== 'SANDBOX' && (
        <div className={`${s.contractAddress} wrap`}>
          <Link
            to={`https://${
              chain === CHAIN.TESTNET ? 'testnet.' : ''
            }tonviewer.com/${activeProject.contractAddress}`}
            target="_blank"
          >
            <AppIcon name="Eye" /> View Deployed Contract
          </Link>
        </div>
      )}

      {isContractInteraction() && (
        <div className={s.contractInteraction}>
          <ContractInteraction
            contractAddress={activeProject?.contractAddress ?? ''}
            projectId={projectId}
            abi={contractABI}
            network={environment}
            contract={contract as SandboxContract<UserContract> | null}
            language={activeProject?.language ?? 'func'}
          />
        </div>
      )}
    </div>
  );
};

export default BuildProject;
