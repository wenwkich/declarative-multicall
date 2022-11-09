# declarative-multicall

This library turns your mundane imperative multi-call code into a declarative one!

## How to use

First, identity how many contracts (abi) you got and give a namespace to them, like I name my erc20 abi to be "tokens",

Prepare inputs to be a list like this:

```ts
const tokens = [
  {
    address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    name: "WBTC",
    nspace: "token"
  },
  ...
];
```

And get your abi ready (you can just use a json):

```ts
export const erc20Abi = (() => {
  const erc20StringAbi = [
    "function balanceOf(address owner) view returns (uint)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
  ];
  return new Interface(erc20StringAbi).fragments.map((fragment) =>
    JSON.parse(fragment.format(FormatTypes.json))
  );
})() as JsonFragment[];
```

The most important step is to get your calls ready and currying them into functions

```ts
const toTokenBalanceCalls = (contract: any) => contract.balanceOf(TEST_ADDRESS);
const toTokenSymbolCalls = (contract: any) => contract.symbol();
const toTokenDecimalsCalls = (contract: any) => contract.decimals();
```

Glue all of the above like this

```ts
const tokensInput: MulticallOption<TokenInfo> = {
  // the inputs must contain 'address' & 'nspace' attribute
  inputInfos: _.map(tokens, ({ address, name }) => ({
    address,
    name,
    nspace: "tokens",
  })),
  // inject the abi
  abi: erc20Abi,
  // call mappers, the order is important here
  callMappers: [toTokenBalanceCalls, toTokenSymbolCalls, toTokenDecimalsCalls],
  resultsMapper:
    (
      { address, name } // these are attrs from the original input
    ) =>
    (results) => {
      // this order must match with call mappers
      const [balance, symbol, decimals] = results;
      return {
        balance: parseFloat(formatUnits(balance, decimals)),
        name,
        symbol,
        decimals,
        address,
      };
    },
};
```

Lastly, hand it to the `doMulticall` function!

```ts
import { doMulticall } from "../src/index";

const provider = new ethers.providers.JsonRpcProvider(
  process.env.MAINNET_RPC_URL,
  1
);

const result = await doMulticall<string, VaultInfo | TokenInfo>(provider, {
  tokens: tokensInput,
});
```
