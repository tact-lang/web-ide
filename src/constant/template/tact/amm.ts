export const TactAmmPool = {
  code: `import "@stdlib/deploy";

message Swap {
    queryId: Int as uint64;
    amountIn: Int as coins;
    minOut: Int as coins;
}

contract SimpleAmmPool with Deployable {
    reserveA: Int as coins;
    reserveB: Int as coins;

    init() {
        self.reserveA = 0;
        self.reserveB = 0;
    }

    receive(msg: Swap) {
        // Educational skeleton — constant product logic goes here
        let k: Int = self.reserveA * self.reserveB;
        self.reserveA += msg.amountIn;
    }

    get fun reserves(): (Int, Int) {
        return (self.reserveA, self.reserveB);
    }
}
`,
};

export const AmmSandboxTest = `import { Blockchain } from '@ton/sandbox';
import '@ton/test-utils';

describe('SimpleAmmPool', () => {
    it('creates sandbox', async () => {
        const blockchain = await Blockchain.create();
        expect(blockchain).toBeDefined();
    });
});
`;
