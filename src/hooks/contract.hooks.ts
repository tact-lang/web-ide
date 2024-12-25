import { globalWorkspace } from '@/components/workspace/globalWorkspace';
import {
  ContractLanguage,
  NetworkEnvironment,
  ParameterType,
  Project,
  TactInputFields,
} from '@/interfaces/workspace.interface';
import EventEmitter from '@/utility/eventEmitter';
import {
  GetterJSONReponse,
  tonHttpEndpoint as getHttpEndpoint,
  serializeToJSONFormat,
} from '@/utility/utils';
import { Network } from '@orbs-network/ton-access';
import {
  Address,
  Cell,
  Contract,
  ContractProvider,
  SendMode,
  Sender,
  SenderArguments,
  TupleItem,
  TupleItemCell,
  beginCell,
  contractAddress,
  fromNano,
  storeStateInit,
  toNano,
} from '@ton/core';
import {
  SandboxContract,
  SendMessageResult,
  TreasuryContract,
} from '@ton/sandbox';
import { StateInit, TonClient } from '@ton/ton';
import { ITonConnect, SendTransactionRequest } from '@tonconnect/sdk';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { message } from 'antd';
import { pascalCase } from 'change-case';
import { useSettingAction } from './setting.hooks';

export function useContractAction() {
  const [tonConnector] = useTonConnectUI();
  const { getTonAmountForInteraction } = useSettingAction();
  const tonAmountForInteraction = toNano(getTonAmountForInteraction());

  return {
    deployContract,
    sendMessage,
    callSetter,
    callGetter,
  };

  async function deployContract(
    codeBOC: string,
    dataCell: string,
    network: Network | Partial<NetworkEnvironment>,
    project: Project,
  ): Promise<{
    address: string;
    contract?: SandboxContract<UserContract>;
    logs?: string[];
  }> {
    const { sandboxBlockchain, sandboxWallet } = globalWorkspace;
    const codeCell = Cell.fromBoc(Buffer.from(codeBOC, 'base64'))[0];

    let sender: Sender | null = null;

    let stateInit: StateInit = { code: Cell.EMPTY, data: Cell.EMPTY };
    if (project.language === 'tact') {
      const _contractInit = window.contractInit;
      if (_contractInit) {
        stateInit = {
          code: _contractInit.init?.code,
          data: _contractInit.init?.data,
        };
      }
    } else {
      stateInit = {
        code: codeCell,
        data: Cell.fromBoc(Buffer.from(dataCell, 'base64'))[0],
      };
    }

    let messageParams: Record<string, unknown> = {};
    const _contractInit = window.contractInit;
    let _userContract: Contract | null = null;

    if (project.language === 'tact') {
      messageParams = {
        $$type: 'Deploy',
        queryId: BigInt(0),
      };
    }

    if (project.language === 'tact' && network.toUpperCase() !== 'SANDBOX') {
      sender = new TonConnectSender(tonConnector.connector);
      const endpoint = getHttpEndpoint({
        network: network.toLocaleLowerCase() as Network,
      });

      const client = new TonClient({ endpoint });
      if (_contractInit) {
        _userContract = client.open(_contractInit);
      }
    } else if (
      network.toUpperCase() === 'SANDBOX' &&
      sandboxBlockchain &&
      project.language === 'tact'
    ) {
      if (_contractInit) {
        _userContract = sandboxBlockchain.openContract(_contractInit);
      }

      sender = sandboxWallet!.getSender();
    }

    if (project.language === 'tact' && _userContract) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (_userContract as any).send(
        sender as Sender,
        {
          value: tonAmountForInteraction,
        },
        messageParams,
      );
      let logMessages: string[] = [];
      if (response) {
        logMessages = terminalLogMessages(
          [response],
          [_userContract as Contract],
        ) ?? ['Transaction executed successfully'];
      }

      // create a code loop through array and check has error string
      for (const element of logMessages) {
        if (element.includes('Error')) {
          return {
            address: '',
            contract: _userContract as SandboxContract<UserContract>,
            logs: logMessages,
          };
        }
      }

      return {
        address: _userContract.address.toString(),
        contract: _userContract as SandboxContract<UserContract>,
        logs: logMessages,
      };
    }

    if (network.toUpperCase() === 'SANDBOX' && sandboxBlockchain) {
      const _userContract = UserContract.createForDeploy(
        stateInit.code as Cell,
        stateInit.data as Cell,
      );
      const userContract = sandboxBlockchain.openContract(_userContract);
      await userContract.sendData(
        sandboxWallet!.getSender(),
        Cell.EMPTY,
        tonAmountForInteraction,
      );

      if (network.toUpperCase() !== 'SANDBOX') {
        await message.success('Contract Deployed');
      }
      return {
        address: _userContract.address.toString(),
        contract: userContract,
      };
    }

    const _contractAddress = contractAddress(0, stateInit);
    const endpoint = await getHttpEndpoint({
      network: network as Network,
    });

    const client = new TonClient({ endpoint });

    if (await client.isContractDeployed(_contractAddress)) {
      await message.error(
        'Contract is already deployed for same codebase and initial state. Update code or initial state.',
      );
      return { address: _contractAddress.toString() };
    }

    const initCell = beginCell().store(storeStateInit(stateInit)).endCell();

    const params: SendTransactionRequest = {
      validUntil: Date.now() + 1000000,
      messages: [
        {
          address: _contractAddress.toString(),
          amount: tonAmountForInteraction.toString(),
          stateInit: initCell.toBoc().toString('base64'),
        },
      ],
    };
    try {
      await tonConnector.sendTransaction(params);
      await message.success('Contract Deployed');

      return { address: _contractAddress.toString() };
    } catch (error) {
      console.log('error', error);
      await message.error('Not client');
    }
    return { address: _contractAddress.toString() };
  }

  async function sendMessage(
    dataCell: string,
    contractAddress: string,
    contract: SandboxContract<UserContract> | null = null,
    network: Network | Partial<NetworkEnvironment>,
    wallet: SandboxContract<TreasuryContract>,
  ) {
    const _dataCell = Cell.fromBoc(Buffer.from(dataCell, 'base64'))[0];
    if (network.toUpperCase() === 'SANDBOX') {
      if (!contract) {
        await message.error('The contract has not been deployed yet.');
        return;
      }
      const response = await contract.sendData(
        wallet.getSender(),
        _dataCell,
        tonAmountForInteraction,
      );
      return {
        message: 'Message sent successfully',
        logs: terminalLogMessages([response], [contract as Contract]),
      };
    }
    try {
      const params: SendTransactionRequest = {
        validUntil: Date.now() + 1000000,
        messages: [
          {
            address: contractAddress,
            amount: tonAmountForInteraction.toString(),
            payload: _dataCell.toBoc().toString('base64'),
          },
        ],
      };

      await tonConnector.sendTransaction(params);
    } catch (error) {
      console.log(error, 'error');
    }
  }

  async function callSetter(
    contractAddress: string,
    methodName: string,
    contract: SandboxContract<UserContract> | null = null,
    language: ContractLanguage,
    receiverType?: 'none' | 'external' | 'internal',
    stack?: TupleItem[],
    network?: Network | Partial<NetworkEnvironment>,
  ): Promise<
    { message: string; logs?: string[]; status?: string } | undefined
  > {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(contract as any).send)
      throw new Error('Contract is not deployed yet.');

    let sender: Sender | null = null;

    if (network === 'SANDBOX') {
      const { sandboxWallet } = globalWorkspace;
      sender = sandboxWallet!.getSender();
    } else {
      sender = new TonConnectSender(tonConnector.connector);
    }

    let response = null;

    if (receiverType === 'internal') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response = await (contract as any).send(
        sender,
        {
          value: tonAmountForInteraction,
        },
        stack ? stack[0] : '',
      );
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response = await (contract as any).sendExternal(stack ? stack[0] : '');
    }

    return {
      message: 'Message sent successfully',
      logs: terminalLogMessages([response], [contract as Contract]),
    };
  }

  type RESPONSE_VALUES =
    | { method: string; value: string | GetterJSONReponse }
    | { type: string; value: string | GetterJSONReponse };

  async function callGetter(
    contractAddress: string,
    methodName: string,
    contract: SandboxContract<UserContract> | null = null,
    language: ContractLanguage,
    kind?: string,
    stack?: TupleItem[],
    network?: Network | Partial<NetworkEnvironment>,
  ): Promise<
    { message?: string; logs?: string[]; status?: string } | RESPONSE_VALUES[]
  > {
    // TODO: Type could be TupleItem
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsedStack: any = stack;
    if (language === 'func') {
      parsedStack = parseStackForFunc(stack);
    }
    if (network === 'SANDBOX' && !contract) {
      return {
        logs: ['The contract has not been deployed yet.'],
        status: 'error',
      };
    }
    if (network === 'SANDBOX' && contract) {
      const responseValues = [];

      if (language === 'tact') {
        // convert getter function name as per script function name. Ex. counter will become getCounter
        const _method = ('get' + pascalCase(methodName)) as keyof Contract;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!(contract as any)[_method]) {
          return {
            logs: [
              'The contract has not been deployed yet or method not found.',
            ],
            status: 'error',
          };
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await (contract as any)[_method](
          ...(parsedStack as TactInputFields[]),
        );
        printDebugLog();
        responseValues.push({
          method: methodName,
          value: serializeToJSONFormat(response),
        });
      } else {
        const call = await contract.getData(
          methodName,
          parsedStack as TupleItem[],
        );
        printDebugLog();
        while (call.stack.remaining) {
          const parsedData = parseReponse(call.stack.pop());
          if (parsedData) {
            responseValues.push(parsedData);
          }
        }
      }
      return responseValues;
    }

    const endpoint = getHttpEndpoint({
      network: network?.toLocaleLowerCase() as Network,
    });
    const client = new TonClient({ endpoint });
    const call = await client.runMethod(
      Address.parse(contractAddress),
      methodName,
      stack,
    );

    const responseValues = [];
    while (call.stack.remaining) {
      const parsedData = parseReponse(call.stack.pop());
      if (parsedData) {
        responseValues.push(parsedData);
      }
    }
    return responseValues;
  }
}

export class UserContract implements Contract {
  constructor(
    readonly address: Address,
    readonly init?: { code: Cell; data: Cell },
  ) {}

  static createForDeploy(code: Cell, data: Cell) {
    const workchain = 0;
    const address = contractAddress(workchain, { code, data });
    return new UserContract(address, { code, data });
  }

  async sendData(
    provider: ContractProvider,
    via: Sender,
    body: Cell = Cell.EMPTY,
    amount: bigint,
  ) {
    await provider.internal(via, {
      value: amount,
      bounce: false,
      body,
    });
  }

  async getData(
    provider: ContractProvider,
    methodName: string,
    stackInput: TupleItem[] = [],
  ) {
    return provider.get(methodName, stackInput);
  }
}

function parseReponse(tupleItem: TupleItem) {
  if (tupleItem.type === 'null') return;

  if (['cell', 'slice', 'builder'].includes(tupleItem.type)) {
    const cell = (tupleItem as TupleItemCell).cell;
    try {
      if (cell.bits.length === 267) {
        return {
          type: 'address',
          value: cell.beginParse().loadAddress().toString(),
        };
      }
      return {
        type: 'base64',
        value: cell.toBoc().toString('base64'),
      };
    } catch (e) {
      console.log(e);
    }
  } else if (tupleItem.type === 'int') {
    return { type: 'int', value: tupleItem.value.toString() };
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { type: 'raw', value: String((tupleItem as any).value) };
  }
}

class TonConnectSender implements Sender {
  public provider: ITonConnect;
  readonly address?: Address;

  constructor(provider: ITonConnect) {
    this.provider = provider;
    if (provider.wallet)
      this.address = Address.parse(provider.wallet.account.address);
    else this.address = undefined;
  }

  async send(args: SenderArguments): Promise<void> {
    if (
      !(
        args.sendMode === undefined ||
        args.sendMode === SendMode.PAY_GAS_SEPARATELY
      )
    ) {
      throw new Error(
        'Deployer sender does not support `sendMode` other than `PAY_GAS_SEPARATELY`',
      );
    }

    await this.provider.sendTransaction({
      validUntil: Date.now() + 5 * 60 * 1000,
      messages: [
        {
          address: args.to.toString(),
          amount: args.value.toString(),
          payload: args.body?.toBoc().toString('base64'),
          stateInit: args.init
            ? beginCell()
                .storeWritable(storeStateInit(args.init))
                .endCell()
                .toBoc()
                .toString('base64')
            : undefined,
        },
      ],
    });
  }
}

// Credit for below log message parsing: https://github.com/tact-lang/tact-by-example/blob/main/src/routes/(examples)/%2Blayout.svelte
function terminalLogMessages(
  results: SendMessageResult[] = [],
  contractInstances: Contract[],
) {
  const messages = [];
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (!results[0]?.transactions) return;
  for (const result of results) {
    for (const transaction of result.transactions) {
      if (
        transaction.inMessage?.info.type === 'internal' ||
        transaction.inMessage?.info.type === 'external-in'
      ) {
        if (transaction.inMessage.info.type === 'internal') {
          if (transaction.debugLogs) {
            const splittedLog = transaction.debugLogs.split('\n');
            messages.push(splittedLog.join('\r\n'));
          }
          if (transaction.description.type === 'generic') {
            if (transaction.description.computePhase.type === 'vm') {
              const compute = transaction.description.computePhase;
              if (compute.exitCode === 4294967282) compute.exitCode = -14;
              messages.push(
                `Transaction Executed: ${
                  compute.success ? 'success' : 'error'
                }, ` +
                  `Exit Code: ${compute.exitCode}, Gas: ${shorten(
                    compute.gasFees,
                    'coins',
                  )}`,
              );
              let foundError = false;
              for (const contractInstance of contractInstances) {
                if (
                  transaction.inMessage.info.dest.equals(
                    contractInstance.address,
                  )
                ) {
                  if (compute.exitCode === -14) compute.exitCode = 13;
                  const message =
                    contractInstance.abi?.errors?.[compute.exitCode]?.message;
                  if (message) {
                    messages.push(`🔴 Error message: ${message}\n`);
                    foundError = true;
                  }
                }
              }
              if (!foundError) {
                const knownErrors: Record<number, { message: string }> = {
                  [-14]: { message: `Out of gas error` },
                  2: { message: `Stack undeflow` },
                  3: { message: `Stack overflow` },
                  4: { message: `Integer overflow` },
                  5: { message: `Integer out of expected range` },
                  6: { message: `Invalid opcode` },
                  7: { message: `Type check error` },
                  8: { message: `Cell overflow` },
                  9: { message: `Cell underflow` },
                  10: { message: `Dictionary error` },
                  13: { message: `Out of gas error` },
                  32: { message: `Method ID not found` },
                  34: { message: `Action is invalid or not supported` },
                  37: { message: `Not enough TON` },
                  38: { message: `Not enough extra-currencies` },
                  128: { message: `Null reference exception` },
                  129: { message: `Invalid serialization prefix` },
                  130: { message: `Invalid incoming message` },
                  131: { message: `Constraints error` },
                  132: { message: `Access denied` },
                  133: { message: `Contract stopped` },
                  134: { message: `Invalid argument` },
                  135: { message: `Code of a contract was not found` },
                  136: { message: `Invalid address` },
                  137: {
                    message: `Masterchain support is not enabled for this contract`,
                  },
                };
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                const message = knownErrors[compute.exitCode]?.message;
                if (message) {
                  messages.push(`Error message: ${message}`);
                  foundError = true;
                }
              }
            }
          }
        }
        for (let i = 0; i < transaction.outMessagesCount; i++) {
          const outMessage = transaction.outMessages.get(i);
          if (outMessage?.info.type === 'external-out') {
            if (outMessage.info.dest == null) {
              const name = messageName(outMessage.body, contractInstances);
              messages.push(
                `Log emitted: ${name}, from ${shorten(outMessage.info.src)}`,
              );
            }
          }
        }
        for (const event of transaction.events) {
          if (event.type === 'message_sent') {
            const name = messageName(event.body, contractInstances);
            messages.push(
              `Message sent: ${name}, from ${shorten(event.from)}, to ${shorten(
                event.to,
              )}, ` +
                `value ${shorten(event.value, 'coins')}, ${
                  event.bounced ? '' : 'not '
                }bounced`,
            );
          }
        }
      }
    }
  }
  return messages;
}

function messageName(body: Cell, contractInstances: Contract[]): string {
  try {
    const slice = body.beginParse();
    let op = slice.loadInt(32);
    if (op === 0) {
      return `"${slice.loadStringTail()}"`;
    }
    if (op < 0) op += 4294967296;
    for (const contractInstance of contractInstances) {
      for (const type of contractInstance.abi?.types ?? []) {
        if (op === type.header) return type.name;
      }
    }
    if (op === 0xffffffff) {
      return 'error';
    }
    return `unknown (0x${op.toString(16)})`;
  } catch (e) {
    /* empty */
  }
  return 'empty';
}

function shorten(
  long: Address | bigint,
  format: 'default' | 'coins' = 'default',
) {
  if (long instanceof Address) {
    return `${long.toString().slice(0, 4)}..${long.toString().slice(-4)}`;
  }
  if (typeof long === 'bigint') {
    if (format === 'default') return long.toString();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (format === 'coins') return fromNano(long);
  }
  return '';
}

function parseStackForFunc(stack: TupleItem[] | undefined) {
  if (!stack) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return stack.map((item: any) => {
    switch (item.type as ParameterType) {
      case 'int':
        return {
          type: item.type,
          value: BigInt(item.value),
        };
      case 'address':
        return {
          type: 'slice',
          cell: beginCell()
            .storeAddress(Address.parse(item.value as string))
            .endCell(),
        };
      case 'bool':
        return {
          type: item.type,
          value: item.value === 'true',
        };
      default:
        return {
          type: item.type,
          value: Cell.fromBoc(Buffer.from(item.value.toString(), 'base64'))[0],
        };
    }
  });
}

function printDebugLog() {
  const debugLogs = globalWorkspace.getDebugLogs();
  if (debugLogs.length > 0) {
    EventEmitter.emit('LOG', {
      type: 'info',
      text: debugLogs.join('\r\n'),
      timestamp: new Date().toISOString(),
    });
  }
}
