import { globalWorkspace } from '@/components/workspace/globalWorkspace';
import { ExitCodes } from '@/constant/exitCodes';
import {
  ContractLanguage,
  NetworkEnvironment,
  ParameterType,
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
import { Maybe } from '@ton/core/dist/utils/maybe';
import {
  SandboxContract,
  SendMessageResult,
  TreasuryContract,
} from '@ton/sandbox';
import { StateInit, TonClient } from '@ton/ton';
import { ITonConnect, SendTransactionRequest } from '@tonconnect/sdk';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { App } from 'antd';
import { pascalCase } from 'change-case';
import { useSettingAction } from './setting.hooks';

export function useContractAction() {
  const [tonConnector] = useTonConnectUI();
  const { getTonAmountForInteraction } = useSettingAction();
  const tonAmountForInteraction = toNano(getTonAmountForInteraction());
  const { message } = App.useApp();

  return {
    deployContract,
    sendMessage,
    callSetter,
    callGetter,
  };

  async function deployContract(
    network: Network | Partial<NetworkEnvironment>,
    language: ContractLanguage,
    contract: Contract,
  ) {
    const { sandboxBlockchain, sandboxWallet } = globalWorkspace;
    const isSandbox = network.toUpperCase() === 'SANDBOX';

    const endpoint = getHttpEndpoint({
      network: network.toLocaleLowerCase() as Network,
    });
    const client = new TonClient({ endpoint });

    const sender: Sender = isSandbox
      ? (sandboxWallet?.getSender() as Sender)
      : new TonConnectSender(tonConnector.connector);

    if (isSandbox && !sandboxBlockchain) {
      throw new Error('Sandbox not initialized');
    }

    const openedContract = (
      isSandbox
        ? sandboxBlockchain!.openContract(contract)
        : client.open(contract)
    ) as SandboxContract<UserContract>;

    // Check if already deployed on non-sandbox
    if (!isSandbox && (await client.isContractDeployed(contract.address))) {
      await message.error(
        'Contract is already deployed for same codebase and initial state. Update code or initial state.',
      );
      return {
        address: contract.address.toString(),
        contract: openedContract,
      };
    }

    let messageParams: Cell | Record<string, unknown> | null = Cell.EMPTY;

    if (language === 'tact') {
      const { receivers } = contract.abi ?? {};

      const hasDeployableTrait = receivers?.find(
        (r) => r.message.kind === 'typed' && r.message.type === 'Deploy',
      );
      const hasEmptyReceiver = receivers?.find(
        (r) => r.message.kind === 'empty',
      );
      if (hasDeployableTrait) {
        messageParams = {
          $$type: 'Deploy',
          queryId: BigInt(Math.floor(Math.random() * 1000)),
        };
      } else if (!hasEmptyReceiver) {
        throw new Error(
          'Must implement either an empty Receiver or the Deployable trait.',
        );
      } else {
        messageParams = null;
      }
    }

    const response = await openedContract.send(
      sender,
      {
        value: tonAmountForInteraction,
      },
      messageParams as Cell,
    );

    const logs =
      typeof response === 'undefined'
        ? (terminalLogMessages([response], [contract]) ?? [
            'Transaction executed successfully',
          ])
        : [];

    const hasError = logs.some((log) => log.includes('Error'));

    return {
      address: hasError ? '' : contract.address.toString(),
      contract: openedContract,
      logs,
    };
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
      const response = await contract.send(
        wallet.getSender(),
        {
          value: tonAmountForInteraction,
        },
        _dataCell,
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
    readonly init?: Maybe<StateInit>,
  ) {}

  static createForDeploy({ code, data }: StateInit) {
    const workchain = 0;
    const address = contractAddress(workchain, { code, data });
    return new UserContract(address, { code, data });
  }

  async send(
    provider: ContractProvider,
    via: Sender,
    args: { value: bigint; bounce?: boolean | null | undefined },
    body: Cell = Cell.EMPTY,
  ) {
    await provider.internal(via, {
      value: args.value,
      bounce: args.bounce ?? false,
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
              let exitCode = compute.exitCode;
              // 4294967282 as an unsigned 32-bit integer is equivalent to -14 when interpreted as a signed 32-bit integer.
              if (exitCode === 4294967282) exitCode = -14;
              const transactionStatus = compute.success ? 'success' : 'error';

              // Collect error messages from contract instances
              const contractErrorMessages = contractInstances
                .filter((contractInstance) => {
                  if (
                    transaction.inMessage?.info.type === 'external-in' ||
                    transaction.inMessage?.info.type === 'internal'
                  ) {
                    return transaction.inMessage.info.dest.equals(
                      contractInstance.address,
                    );
                  }
                  return false;
                })
                .map(
                  (contractInstance) =>
                    contractInstance.abi?.errors?.[exitCode]?.message,
                )
                .filter((message) => message) // Remove undefined or null messages
                .map((message) => `(${message})`);

              // If no error messages from contractInstances, check ExitCodes
              const generalErrorMessage =
                contractErrorMessages.length === 0
                  ? ExitCodes[exitCode]?.message
                    ? [`(${ExitCodes[exitCode]?.message})`]
                    : []
                  : [];

              const allErrorMessages = [
                ...contractErrorMessages,
                ...generalErrorMessage,
              ];

              const transactionMessage = (
                `${transactionStatus === 'success' ? '🟢' : '🔴'} Transaction executed: ${transactionStatus}, ` +
                `exit_code: ${exitCode} ${allErrorMessages.join('\n')}, ` +
                `gas: ${shorten(compute.gasFees, 'coins')}`
              ).trim();

              messages.push(transactionMessage);
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
