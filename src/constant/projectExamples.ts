import { AppConfig } from '@/config/AppConfig';

export const projectExamples = {
  baseURL: `${AppConfig.proxy.GIT_RAW_CONTENT}/tact-lang/tact-by-example/main/src/routes/(examples)/`,
  examples: [
    {
      link: '01-the-deployable-trait',
      name: 'The Deployable Trait',
    },
    {
      link: '02-integers',
      name: 'Integers',
    },
    {
      link: '02-integer-ops',
      name: 'Integer Operations',
    },
    {
      link: '02-bools',
      name: 'Bools',
    },
    {
      link: '02-addresses',
      name: 'Addresses',
    },
    {
      link: '02-strings',
      name: 'Strings',
    },
    {
      link: '02-variables',
      name: 'Variables',
    },
    {
      link: '02-constants',
      name: 'Constants',
    },
    {
      link: '03-getters',
      name: 'Getters',
    },
    {
      link: '03-receivers',
      name: 'Receivers and Messages',
    },
    {
      link: '03-textual-messages',
      name: 'Textual Messages',
    },

    {
      link: '03-sender',
      name: 'Message Sender',
    },
    {
      link: '03-errors',
      name: 'Throwing Errors',
    },
    {
      link: '03-receive-coins',
      name: 'Receiving TON Coins',
    },
    {
      link: '03-messages-between-contracts',
      name: 'Messages Between Contracts',
    },
    {
      link: '03-send-coins',
      name: 'Sending TON Coins',
    },
    {
      link: '03-emit',
      name: 'Emitting Logs',
    },
    {
      link: '04-if-statements',
      name: 'If Statements',
    },
    {
      link: '04-loops',
      name: 'Loops',
    },
    {
      link: '04-functions',
      name: 'Functions',
    },

    {
      link: '04-arrays',
      name: 'Arrays',
    },
    {
      link: '04-current-time',
      name: 'Current Time',
    },

    {
      link: '05-the-ownable-trait',
      name: 'The Ownable Trait',
    },
    {
      link: '05-the-ownable-transferable-trait',
      name: 'The Ownable-Transferable Trait',
    },
    {
      link: '05-the-stoppable-trait',
      name: 'The Stoppable Trait',
    },
    {
      link: '05-the-resumable-trait',
      name: 'The Resumable Trait',
    },
    {
      link: '05-your-own-trait',
      name: 'Writing Your Own Trait',
    },
    {
      link: '06-calc-contract-address',
      name: 'Calculate Contract Address',
    },
    {
      link: '06-multiple-contract-instances',
      name: 'Multiple Contract Instances',
    },
    {
      link: '06-contract-deploy-another',
      name: 'A Contract Deploying Another',
    },
    {
      link: '06-parent-child',
      name: 'Parent-Child Relationship',
    },
    {
      link: '06-communicating-subcontract',
      name: 'Communicating with Sub-Contract',
    },
  ],
};
