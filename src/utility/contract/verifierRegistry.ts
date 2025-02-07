import {
  Address,
  Contract,
  ContractProvider,
  Dictionary,
  Slice,
} from '@ton/core';

export class SourceRegistry implements Contract {
  constructor(readonly address: Address) {}
  async getVerifierRegistry(provider: ContractProvider) {
    const { stack } = await provider.get('get_verifier_registry_address', []);
    return stack.readAddress();
  }
}

export class VerifierRegistry implements Contract {
  constructor(readonly address: Address) {}

  async getVerifiers(provider: ContractProvider) {
    const res = await provider.get('get_verifiers', []);
    const item = res.stack.readCell();
    const c = item.beginParse();
    const d = c.loadDict(Dictionary.Keys.BigUint(256), {
      serialize: (src, buidler) => {
        buidler.storeSlice(src as Slice);
      },
      parse: (s) => s,
    });

    return Array.from(d.values()).map((v) => {
      const slice = v as Slice;
      const admin = slice.loadAddress();
      const quorom = slice.loadUint(8);
      const pubKeyEndpoints = slice.loadDict(
        Dictionary.Keys.BigUint(256),
        Dictionary.Values.Uint(32),
      );

      return {
        admin: admin,
        quorum: quorom,
        pubKeyEndpoints: new Map<bigint, number>(
          Array.from(pubKeyEndpoints).map(([k, v]) => [k, v]),
        ),
        name: slice.loadRef().beginParse().loadStringTail(),
        url: slice.loadRef().beginParse().loadStringTail(),
      };
    });
  }
}
