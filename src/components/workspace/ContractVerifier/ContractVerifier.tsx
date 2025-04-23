import TonAuth from '@/components/auth/TonAuth';
import { contractVerifierBackend } from '@/constant/contractVerifierBackend';
import { useLogActivity } from '@/hooks/logActivity.hooks';
import { useProjectActions } from '@/hooks/project.hooks';
import { useProject } from '@/hooks/projectV2.hooks';
import { useTonClient } from '@/hooks/tonClient.hooks';
import { VerifierSource } from '@/interfaces/verifier.interface';
import {
  ContractVerificationInputs,
  NetworkEnvironment,
  Tree,
} from '@/interfaces/workspace.interface';
import {
  SourceRegistry,
  VerifierRegistry,
} from '@/utility/contract/verifierRegistry';
import { relativePath } from '@/utility/filePath';
import { normalizeRelativePath } from '@/utility/path';
import { stripSingleQuotes } from '@/utility/text';
import Path from '@isomorphic-git/lightning-fs/src/path';
import { compilerVersion } from '@ton-community/func-js';
import { Cell, toNano } from '@ton/core';
import {
  CHAIN,
  SendTransactionRequest,
  useTonAddress,
  useTonConnectUI,
} from '@tonconnect/ui-react';
import { Button, Form, Select } from 'antd';
import { useForm } from 'antd/lib/form/Form';
import axios from 'axios';
import path from 'path';
import { FC, useEffect, useState } from 'react';
import { AddressInput } from '../abiInputs';
import s from './ContractVerifier.module.scss';

interface ISourceFiles {
  path: string;
  content: string;
}

const getContractCode = async (
  address: string,
  network: Exclude<NetworkEnvironment, 'SANDBOX'>,
  logger: (message: string) => void,
) => {
  logger(`Fetching contract details for address: ${address}`);
  const endPoint = `https://${
    network === 'TESTNET' ? 'testnet.' : ''
  }toncenter.com/api/v3/addressInformation?address=${address}&use_v2=false`;

  const response = await axios.get(endPoint);
  const codeFromContractAddress = response.data.code;

  if (!codeFromContractAddress) {
    throw new Error(
      `Deployed contract not found on the ${network} network. Please verify the contract address and network.`,
    );
  }
  return stripSingleQuotes(codeFromContractAddress);
};

const CONTRACT_MISMATCH_ERROR =
  "Mismatch detected: The selected file does not match the deployed contract code. Ensure you're using the correct contract and that the contract is deployed correctly.";

const TonContractVerifier: FC = () => {
  const [isVerifying, setIsVerifying] = useState(false);

  const {
    projectFiles,
    activeProject,
    updateProjectSetting,
    getContractVerifierInputs,
  } = useProject();
  const { createLog } = useLogActivity();
  const { compileFuncProgram, compileTactProgram } = useProjectActions();
  const [tonConnector] = useTonConnectUI();
  const connectedWalletAddress = useTonAddress();

  const tonClient = useTonClient();
  const [verifiedContractAddress, setVerifiedContractAddress] = useState<
    string | null
  >();

  const [form] = useForm();

  const chain = tonConnector.wallet?.account.chain;

  const fileList = projectFiles.filter((file: Tree | null) => {
    if (!file?.path || !activeProject?.path) return false;

    const relativeFilePath = normalizeRelativePath(
      file.path,
      activeProject.path,
    );
    if (relativeFilePath.startsWith('dist/') || file.name === 'stdlib.fc')
      return false;

    return file.path.endsWith('.tact') || file.path.endsWith('.fc');
  });

  const getTactSource = async (
    contractPath: string,
    contractAddress: string,
    network: Exclude<NetworkEnvironment, 'SANDBOX'>,
  ) => {
    if (!activeProject?.path) {
      throw new Error('No project selected');
    }
    const buildFiles = await compileTactProgram(
      { path: contractPath },
      activeProject.path,
    );
    const codeFromAddress = await getContractCode(
      contractAddress,
      network,
      createLog,
    );

    const pkgFiles = new Map();
    for (const [key, value] of buildFiles) {
      if (key.endsWith('.pkg')) {
        const pkgContent = JSON.parse(
          value.toString().replaceAll(activeProject.path + '/', ''),
        ); // Remove project path

        if (pkgContent.code !== codeFromAddress) {
          continue;
        }

        const cleanedSources: Record<string, string> = {};

        for (const path in pkgContent.sources) {
          const newPath = path.startsWith('/') ? path.slice(1) : path;
          cleanedSources[newPath] = pkgContent.sources[path];
        }

        pkgContent.sources = cleanedSources;

        pkgFiles.set(key, pkgContent);
      }
    }
    if (pkgFiles.size !== 1) {
      throw new Error(CONTRACT_MISMATCH_ERROR);
    }

    const [fileName, fileContent] = pkgFiles.entries().next().value!;
    const baseFileName = Path.basename(fileName);

    const src: VerifierSource = {
      compiler: 'tact',
      compilerSettings: {
        tactVersion: fileContent.compiler.version as string,
      },
      knownContractAddress: contractAddress,
      knownContractHash: Cell.fromBase64(fileContent.code)
        .hash()
        .toString('base64'),
      sources: [
        {
          includeInCommand: true,
          isEntrypoint: false,
          isStdLib: false,
          hasIncludeDirectives: false,
          folder: '',
        },
      ],
      senderAddress: tonConnector.account!.address.toString(),
    };
    return {
      src,
      files: [
        {
          path: baseFileName,
          content: new Blob([JSON.stringify(fileContent)], {
            type: 'application/json',
          }),
        },
      ],
    };
  };

  const getFuncSource = async (
    contractPath: string,
    contractAddress: string,
    network: Exclude<NetworkEnvironment, 'SANDBOX'>,
  ) => {
    if (!activeProject?.path) {
      throw new Error('No project selected');
    }
    const compiledResult = await compileFuncProgram(
      { path: contractPath },
      activeProject.path,
    );

    const codeFromAddress = await getContractCode(
      contractAddress,
      network,
      createLog,
    );

    const contractBOC = compiledResult.get('contractBOC')?.toString('utf-8');

    if (codeFromAddress !== contractBOC) {
      throw new Error(CONTRACT_MISMATCH_ERROR);
    }

    const sourceFiles: ISourceFiles[] = JSON.parse(
      compiledResult.get('snapshot')?.toString('utf-8') ?? '[{}]',
    ).map((file: { filename: string; content: string }) => {
      return {
        path: file.filename.replace(`${activeProject.path}/`, ''), // remove project path
        content: file.content,
      };
    });
    const entryFile = relativePath(contractPath, activeProject.path);
    const src: VerifierSource = {
      compiler: 'func',
      compilerSettings: {
        funcVersion: (await compilerVersion()).funcVersion,
        commandLine: `-SPA ${entryFile}`,
      },
      knownContractHash: Cell.fromBase64(contractBOC).hash().toString('base64'),
      knownContractAddress: contractAddress,
      sources: sourceFiles.map((s) => ({
        includeInCommand: entryFile === s.path,
        isEntrypoint: entryFile === s.path,
        isStdLib: false,
        hasIncludeDirectives: true,
        folder: path.dirname(s.path),
      })),
      senderAddress: tonConnector.account!.address.toString(),
    };
    return {
      src,
      files: sourceFiles,
    };
  };

  const verify = async ({
    contractFilePath,
    contractAddress,
    network,
  }: ContractVerificationInputs) => {
    if (!activeProject?.path) return;

    try {
      if (!tonConnector.connected || !chain || !tonClient) {
        throw new Error('Please connect your wallet from build tab');
      }

      const connectedNetwork = chain === CHAIN.TESTNET ? 'TESTNET' : 'MAINNET';

      if (network !== connectedNetwork) {
        throw new Error(
          `Network mismatch: The connected wallet is on a different network than expected. Please switch to the correct network and try again.`,
        );
      }

      setIsVerifying(true);
      setVerifiedContractAddress(null);
      updateProjectSetting({
        contractVerificationInputs: {
          contractFilePath,
          contractAddress,
          network,
        },
      });

      const fd = new FormData();

      const { src, files } =
        activeProject.language === 'tact'
          ? await getTactSource(contractFilePath, contractAddress, network)
          : await getFuncSource(contractFilePath, contractAddress, network);

      files.forEach((file) => {
        fd.append(
          file.path,
          new Blob([file.content]),
          path.basename(file.path),
        );
      });

      fd.append(
        'json',
        new Blob([JSON.stringify(src)], {
          type: 'application/json',
        }),
        'blob',
      );

      createLog('Submitting contract verification data to the backend...');

      const backend = contractVerifierBackend[network];

      const sourceRegistry = tonClient.open(
        new SourceRegistry(backend.sourceRegistry),
      );

      const verifierRegistry = tonClient.open(
        new VerifierRegistry(await sourceRegistry.getVerifierRegistry()),
      );

      const verifier = (await verifierRegistry.getVerifiers()).find(
        (v) => v.name === backend.id,
      );

      if (verifier === undefined) {
        throw new Error('Could not find verifier');
      }

      const remainingBackends = [...backend.backends];

      const currentBackend =
        remainingBackends[Math.floor(Math.random() * remainingBackends.length)];

      const sourceResponse = await axios.post(currentBackend + '/source', fd);

      if (sourceResponse.data.compileResult.result !== 'similar') {
        throw new Error(sourceResponse.data.compileResult.error);
      }

      let msgCell = sourceResponse.data.msgCell;
      let acquiredSigs = 1;

      while (acquiredSigs < verifier.quorum) {
        const signResponse = await axios.post(
          `${currentBackend}/sign`,
          {
            messageCell: msgCell,
          },
          {
            headers: { 'Content-Type': 'application/json' },
          },
        );

        msgCell = signResponse.data.msgCell;
        acquiredSigs++;
      }

      const c = Cell.fromBoc(Buffer.from(msgCell.data))[0];

      const tx: SendTransactionRequest = {
        validUntil: Math.floor(Date.now() / 1000) + 120, // Expiry in 120 seconds
        messages: [
          {
            address: verifierRegistry.address.toString(),
            amount: toNano('0.5').toString(),
            payload: c.toBoc().toString('base64'),
          },
        ],
      };
      createLog(
        'Requesting wallet approval for contract verification transaction.',
      );
      await tonConnector.sendTransaction(tx);
      createLog(
        'Contract submitted successfully for verification. It may take some time to reflect.',
        'success',
      );
      setVerifiedContractAddress(contractAddress);
      updateProjectSetting({
        contractVerificationInputs: {
          contractFilePath,
          contractAddress,
          network,
          isVerified: true,
        },
      });
    } catch (error) {
      let errorMessage = null;
      if (error instanceof Error) {
        if (error.message === 'Contract is already deployed') {
          setVerifiedContractAddress(contractAddress);
          errorMessage = 'Contract is already verified';
        } else {
          errorMessage = error.message;
        }
      }
      if (errorMessage) {
        createLog(errorMessage, 'error');
        return;
      }
      createLog(
        'An unexpected error occurred. Please check the browser console for details.',
        'error',
      );
      console.error(error);
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    const inputs = getContractVerifierInputs();
    if (inputs) {
      form.setFieldsValue(inputs);
      setVerifiedContractAddress(inputs.contractAddress);
    }
  }, []);

  return (
    <div className={s.root}>
      <h3 className={`section-heading`}>Contract Verifier</h3>
      <TonAuth />
      {tonConnector.connected && (
        <div className={`${s.connectedWallet} wrap-text`}>
          Connected Wallet: <span>{connectedWalletAddress}</span>
        </div>
      )}

      <Form
        form={form}
        className={`${s.form} app-form`}
        layout="vertical"
        requiredMark={false}
        onFinish={verify}
      >
        <Form.Item
          label="Environment"
          className={`${s.formItem} select-search-input-dark`}
          name="network"
          rules={[{ required: true }]}
        >
          <Select
            placeholder="Choose an environment"
            options={[
              { value: 'TESTNET', label: 'Testnet' },
              { value: 'MAINNET', label: 'Mainnet' },
            ]}
          />
        </Form.Item>
        <Form.Item
          name="contractFilePath"
          className={s.formItem}
          rules={[{ required: true }]}
          label="Contract File"
        >
          <Select
            placeholder="Select a contract file"
            notFoundContent="Required file not found"
            allowClear
            showSearch
            className={`w-100`}
            defaultActiveFirstOption
            filterOption={(inputValue, option) => {
              return !!option?.title
                ?.toLowerCase()
                .includes(inputValue.toLowerCase());
            }}
          >
            {fileList.map((f) => (
              <Select.Option key={f.path} value={f.path} title={f.path}>
                {f.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
        <AddressInput
          className={s.contractAddress}
          name="contractAddress"
          label="Contract Address"
        />

        <Form.Item shouldUpdate>
          {({ getFieldsValue }) => {
            const { contractFilePath, contractAddress } = getFieldsValue();

            return (
              <Button
                type="primary"
                className={`${s.action} ant-btn-primary-gradient w-100`}
                htmlType="submit"
                disabled={!contractFilePath || !contractAddress}
                loading={isVerifying}
              >
                Verify
              </Button>
            );
          }}
        </Form.Item>
      </Form>

      {verifiedContractAddress && (
        <a
          href={`https://verifier.ton.org/${verifiedContractAddress}?${chain === CHAIN.TESTNET ? 'testnet' : ''}`}
          target="_blank"
          rel="noreferrer"
          className={s.viewDetails}
        >
          View on TON Verifier
        </a>
      )}
    </div>
  );
};

export default TonContractVerifier;
