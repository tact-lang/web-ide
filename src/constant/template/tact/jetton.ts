export const TactJettonMaster = {
  code: `import "@stdlib/deploy";

message Mint {
    queryId: Int as uint64;
    amount: Int as coins;
    receiver: Address;
}

contract JettonMaster with Deployable {
    totalSupply: Int as coins;
    content: Cell;

    init(content: Cell) {
        self.totalSupply = 0;
        self.content = content;
    }

    receive(msg: Mint) {
        self.totalSupply += msg.amount;
    }

    get fun total_supply(): Int {
        return self.totalSupply;
    }
}
`,
};

export const JettonSandboxTest = `import { Blockchain } from '@ton/sandbox';
import '@ton/test-utils';

describe('JettonMaster', () => {
    it('deploys master', async () => {
        const blockchain = await Blockchain.create();
        expect(blockchain).toBeDefined();
    });
});
`;
