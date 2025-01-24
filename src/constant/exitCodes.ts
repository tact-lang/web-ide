interface ExitCodeDetail {
  origin: string;
  message: string;
  description?: string;
}

type IExitCode = Record<string, ExitCodeDetail | undefined>;

export const ExitCodes: IExitCode = {
  '0': {
    origin: 'Compute phase and action phase',
    message: 'Normal termination',
    description:
      'This exit (or [result](https://docs.tact-lang.org/book/exit-codes/#action)) code indicates a successful completion of the [compute](https://docs.tact-lang.org/book/exit-codes/#compute) (or [action](https://docs.tact-lang.org/book/exit-codes/#action)) phase of the transaction.',
  },
  '1': {
    origin: 'Compute phase',
    message: 'Alternative termination',
    description:
      'This is an alternative exit code for the successful execution of the [compute phase](https://docs.tact-lang.org/book/exit-codes/#compute). Reserved, but never occurs.',
  },
  '2': {
    origin: 'Compute phase',
    message: 'Stack underflow',
    description:
      'If some operation consumed more elements than there were on the stack, the error with exit code 2 is thrown: `Stack underflow`.',
  },
  '3': {
    origin: 'Compute phase',
    message: 'Stack overflow',
    description:
      "If there are too many elements copied into a closure continuation, an error with exit code 3 is thrown: `Stack overflow`. Occurs rarely, unless you're deep in [Fift and TVM assembly](https://docs.ton.org/develop/fift/fift-and-tvm-assembly) trenche.",
  },
  '4': {
    origin: 'Compute phase',
    message: 'Integer overflow',
    description:
      "If the value in calculation goes beyond the range from `-2^256` to `2^256 - 1` inclusive, or there's an attempt to [divide](https://docs.tact-lang.org/book/operators/#binary-divide) or [modulo](https://docs.tact-lang.org/book/operators/#binary-modulo) by zero, an error with exit code 4 is thrown: `Integer overflow`",
  },
  '5': {
    origin: 'Compute phase',
    message: 'Range check error — some integer is out of its expected range',
    description:
      'Range check error — some integer is out of its expected range. I.e. any attempt to store an unexpected amount of data or specify an out-of-bounds value throws an error with exit code 5: `Integer out of range`.',
  },
  '6': {
    origin: 'Compute phase',
    message: 'Invalid TVM opcode',
    description:
      'If you specify an instruction that is not defined in the current [TVM](https://docs.ton.org/learn/tvm-instructions/tvm-overview) version or try to set an unsupported [code page](https://docs.ton.org/v3/documentation/tvm/tvm-overview#tvm-state), an error with exit code 6 is thrown: `Invalid opcode`.',
  },
  '7': {
    origin: 'Compute phase',
    message: 'Type check error',
    description:
      "If an argument to a primitive is of an incorrect value type or there's any other mismatch in types during the [compute phase](https://docs.tact-lang.org/book/exit-codes/#compute), an error with exit code 7 is thrown: `Type check error`.",
  },
  '8': {
    origin: 'Compute phase',
    message: 'Cell overflow',
    description:
      'To construct a [`Cell`](https://docs.tact-lang.org/book/cells/#cells), a [`Builder`](https://docs.tact-lang.org/book/cells/#builders) is used. If you try to store more than 1023 bits of data or more than 4 references to other cells, an error with exit code 8 is thrown: `Cell overflow`.',
  },
  '9': {
    origin: 'Compute phase',
    message: 'Cell underflow',
    description:
      'To parse a [`Cell`](https://docs.tact-lang.org/book/cells/#cells), a [`Slice`](https://docs.tact-lang.org/book/cells/#slices) is used. If you try to load more data or references than `Slice` contains, an error with exit code 9 is thrown: `Cell underflow`.',
  },
  '10': {
    origin: 'Compute phase',
    message: 'Dictionary error',
    description:
      'If there is an incorrect manipulation of dictionaries, such as improper assumptions about their memory layout, an error with exit code 10 is thrown: `Dictionary error`. Note, that Tact prevents you from getting this error unless you do [Fift and TVM assembly](https://docs.ton.org/develop/fift/fift-and-tvm-assembly) work yourself.',
  },
  '11': {
    origin: 'Compute phase',
    message: '"Unknown" error',
    description:
      'Described in TVM docs as “Unknown error, may be thrown by user programs”, although most commonly used for problems with queueing a message send or problems with get-methods.',
  },
  '12': {
    origin: 'Compute phase',
    message: 'Fatal error',
    description: 'Fatal error. Thrown by TVM in situations deemed impossible.',
  },
  '13': {
    origin: 'Compute phase',
    message: 'Out of gas error',
    description:
      "If there isn't enough gas to end computations in the [compute phase](https://docs.tact-lang.org/book/exit-codes/#compute), the error with exit code 13 is thrown: `Out of gas error`.",
  },
  '-14': {
    origin: 'Compute phase',
    message: 'Out of gas error',
    description:
      "If there isn't enough gas to end computations in the [compute phase](https://docs.tact-lang.org/book/exit-codes/#compute), the error with exit code 13 is thrown: `Out of gas error`.",
  },
  '14': {
    origin: 'Compute phase',
    message: 'Virtualization error',
    description:
      'Virtualization error, related to [prunned branch cells](https://docs.tact-lang.org/book/cells#cells-kinds). Reserved, but never thrown.',
  },
  '32': {
    origin: 'Action phase',
    message: 'Action list is invalid',
    description:
      "If the list of actions contains [exotic cells](https://docs.tact-lang.org/book/cells#cells-kinds), an action entry cell does not have references or some action entry cell couldn't be parsed, an error with exit code 32 is thrown: `Action list is invalid`.",
  },
  '33': {
    origin: 'Action phase',
    message: 'Action list is too long',
    description:
      'If there are more than 255 actions queued for execution, the [action phase](https://docs.tact-lang.org/book/exit-codes/#action) will throw an error with an exit code 33: `Action list is too long`.',
  },
  '34': {
    origin: 'Action phase',
    message: 'Action is invalid or not supported',
    description:
      "There are only four supported actions at the moment: changing the contract code, sending a message, reserving a specific amount of [nanoToncoins](https://docs.tact-lang.org/book/integers#nanotoncoin) and changing the library cell. If there's any issue with the specified action (invalid message, unsupported action, etc.), an error with exit code 34 is thrown: `Invalid or unsupported action`.",
  },
  '35': {
    origin: 'Action phase',
    message: 'Invalid source address in outbound message',
    description:
      "If the source address in the outbound message isn't equal to [`addr_none`](https://docs.ton.org/develop/data-formats/msg-tlb#addr_none00) or to the address of the contract that initiated this message, an error with exit code 35 is thrown: `Invalid source address in outbound message`.",
  },
  '36': {
    origin: 'Action phase',
    message: 'Invalid destination address in outbound message',
    description:
      "If the destination address in the outbound message is invalid, e.g. it doesn't conform to the relevant [TL-B](https://docs.ton.org/v3/documentation/data-formats/tlb/tl-b-language) schemas, contains unknown workchain ID or it has invalid length for the given workchain, an error with exit code 36 is thrown: `Invalid destination address in outbound message`.",
  },
  '37': {
    origin: 'Action phase',
    message: 'Not enough Toncoin',
    description:
      "If all funds of the inbound message with [base mode 64](https://docs.tact-lang.org/book/message-mode#base-modes) set had been already consumed and there's not enough funds to pay for the failed action, or the [TL-B](https://docs.ton.org/v3/documentation/data-formats/tlb/tl-b-language) layout of the provided value ([`CurrencyCollection`](https://docs.ton.org/develop/data-formats/msg-tlb#currencycollection)) is invalid, or there's not enough funds to pay [forward fees](https://docs.ton.org/develop/smart-contracts/guidelines/processing) or not enough funds after deducting fees, an error with exit code 37 is thrown: `Not enough Toncoin`.",
  },
  '38': {
    origin: 'Action phase',
    message: 'Not enough extra currencies',
    description:
      'Besides the native currency, Toncoin, TON Blockchain supports up to `2^32` extra currencies. They differ from making new [Jettons](https://docs.tact-lang.org/cookbook/jettons) because extra currencies are natively supported — one can potentially just specify an extra [`HashmapE`](https://docs.ton.org/develop/data-formats/tl-b-types#hashmap) of extra currency amounts in addition to the Toncoin amount in the internal message to another contract. Unlike Jettons, extra currencies can only be stored and transferred and do not have any other functionality.',
  },
  '39': {
    origin: 'Action phase',
    message: "Outbound message doesn't fit into a cell",
    description:
      "When processing the message, TON Blockchain tries to pack it according to the [relevant TL-B schemas](https://docs.ton.org/develop/data-formats/msg-tlb), and if it cannot an error with exit code 39 is thrown: `Outbound message doesn't fit into a cell`.",
  },
  '40': {
    origin: 'Action phase',
    message: 'Cannot process a message',
    description:
      'If there would not be enough funds to process all the cells in a message, the message is too large or its Merkle depth is too big, an error with exit code 40 is thrown: `Cannot process a message`.',
  },
  '41': {
    origin: 'Action phase',
    message: 'Library reference is null',
    description:
      'If the library reference was required during library change action, but it was null, an error with exit code 41 is thrown: `Library reference is null`.',
  },
  '42': {
    origin: 'Action phase',
    message: 'Library change action error',
    description:
      'If the library reference was required during library change action, but it was null, an error with exit code 41 is thrown: `Library reference is null`.',
  },
  '43': {
    origin: 'Action phase',
    message: 'Library limits exceeded',
    description:
      'If the maximum number of cells in the library is exceeded or the maximum depth of the Merkle tree is exceeded, an error with exit code 43 is thrown: `Library limits exceeded`.',
  },
  '50': {
    origin: 'Action phase',
    message: 'Account state size exceeded limits',
    description:
      'If the account state (contract storage, essentially) exceeds any of the limits specified in [config param 43 of TON Blockchain](https://docs.ton.org/develop/howto/blockchain-configs#param-43) by the end of the [action phase](https://docs.tact-lang.org/book/exit-codes/#action), an error with exit code 50 is thrown: `Account state size exceeded limits`.',
  },
  '128': {
    origin: 'Compute phase',
    message: 'Null reference exception',
    description:
      "If there's a non-null assertion, such as the [`!!`](https://docs.tact-lang.org/book/operators#unary-non-null-assert) operator, and the checked value is [`null`](https://docs.tact-lang.org/book/optionals), an error with exit code 128 is thrown: `Null reference exception`.",
  },
  '129': {
    origin: 'Compute phase',
    message: 'Invalid serialization prefix',
    description:
      'Reserved, but due to a number of prior checks it cannot be thrown unless one hijacks the contract code before deployment and changes the opcodes of the [Messages](https://docs.tact-lang.org/book/structs-and-messages/#messages) expected to be received in the contract.',
  },
  '130': {
    origin: 'Compute phase',
    message: 'Invalid incoming message',
    description:
      "If the received internal or external message isn't handled by the contract, an error with exit code 130 is thrown: `Invalid incoming message`. It usually happens when the contract doesn't have a receiver for the particular message and its opcode prefix (32-bit integer header).",
  },
  '131': {
    origin: 'Compute phase',
    message: 'Constraints error',
    description: 'Constraints error. Reserved, but never thrown.',
  },
  '132': {
    origin: 'Compute phase',
    message: 'Access denied',
    description:
      "If you use the [`Ownable`](https://docs.tact-lang.org/ref/stdlib-ownable#ownable) [trait](https://docs.tact-lang.org/book/types/#traits) from the [`@stdlib/ownable`](https://docs.tact-lang.org/ref/stdlib-ownable) library, the helper function `requireOwner()` provided by it will throw an error with exit code 132 if the sender of the inbound message won't match the specified owner: `Access denied`.",
  },
  '133': {
    origin: 'Compute phase',
    message: 'Contract stopped',
    description:
      'A message has been sent to a stopped contract. Reserved, but never thrown.',
  },
  '134': {
    origin: 'Compute phase',
    message: 'Invalid argument',
    description:
      'If there is an invalid or unexpected argument value, an error with exit code 134 is thrown: `Invalid argument`.',
  },
  '135': {
    origin: 'Compute phase',
    message: 'Code of a contract was not found',
    description:
      "If the code of the contract doesn't match the one saved in TypeScript wrappers, the error with exit code 135 will be thrown: `Code of a contract was not found`.",
  },
};
