import { doMulticall } from "../src/index";
import * as dotenv from "dotenv";
import { MulticallOption } from "../src/types";
import abi from "./abi.json";
import deployments from "./deployments.json";
import { formatUnits } from "ethers/lib/utils";
import _ from "lodash";
import { ethers } from "ethers";
import { JsonFragment, Interface, FormatTypes } from "@ethersproject/abi";
import path from "path";

dotenv.config({ path: path.dirname(__dirname) + "/.env.test" });

// results are like this:
// {
//   ribbonVaults: {
//     '0x25751853Eab4D0eB3652B5eB6ecB102A2789644B': {
//       asset: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
//       decimals: 18,
//       cap: 20000,
//       totalDeposited: 10650.028851078452,
//       balance: 1e-18,
//       address: '0x25751853Eab4D0eB3652B5eB6ecB102A2789644B',
//       id: 'RibbonThetaVaultETHCall',
//       nspace: 'ribbonVaults'
//     },
//     '0xc0cF10Dd710aefb209D9dc67bc746510ffd98A53': {
//       asset: '0x4d224452801ACEd8B2F0aebE155379bb5D594381',
//       decimals: 18,
//       cap: 500000,
//       totalDeposited: 7046.7207064276145,
//       balance: 0,
//       address: '0xc0cF10Dd710aefb209D9dc67bc746510ffd98A53',
//       id: 'RibbonThetaVaultAPECall',
//       nspace: 'ribbonVaults'
//     },
//     '0xe63151A0Ed4e5fafdc951D877102cf0977Abd365': {
//       asset: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
//       decimals: 18,
//       cap: 50000,
//       totalDeposited: 34310.442349618854,
//       balance: 0,
//       address: '0xe63151A0Ed4e5fafdc951D877102cf0977Abd365',
//       id: 'RibbonThetaVaultAAVECall',
//       nspace: 'ribbonVaults'
//     },
//     '0x65a833afDc250D9d38f8CD9bC2B1E3132dB13B2F': {
//       asset: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
//       decimals: 8,
//       cap: 750,
//       totalDeposited: 577.76642758,
//       balance: 0,
//       address: '0x65a833afDc250D9d38f8CD9bC2B1E3132dB13B2F',
//       id: 'RibbonThetaVaultWBTCCall',
//       nspace: 'ribbonVaults'
//     }
//   },
//   tokens: {
//     '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599': {
//       balance: 0.00633862,
//       name: 'WBTC',
//       symbol: 'WBTC',
//       decimals: 8,
//       address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
//       nspace: 'tokens'
//     },
//     '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': {
//       balance: 0,
//       name: 'WETH',
//       symbol: 'WETH',
//       decimals: 18,
//       address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
//       nspace: 'tokens'
//     },
//     '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9': {
//       balance: 0,
//       name: 'AAVE',
//       symbol: 'AAVE',
//       decimals: 18,
//       address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
//       nspace: 'tokens'
//     }
//   }
// }

type Balance = {
  balance: number;
};

type VaultInfo = {
  cap: number;
  decimals: number;
  asset: string;
  totalDeposited: number;
} & Balance;

type TokenInfo = {
  name: string;
  symbol: string;
  decimals: string;
  address: string;
} & Balance;

const TEST_ADDRESS = "0x1309c007567a71b393094c21e70bd2647356a352";

//////////// test ////////////

it("should be able to read from Ribbon", async () => {
  const provider = new ethers.providers.JsonRpcProvider(
    process.env.MAINNET_RPC_URL,
    1
  );

  const result = await doMulticall<string, VaultInfo | TokenInfo>(provider, {
    ribbonVaults: makeVaultsInput(),
    tokens: makeTokensInput(),
  });

  console.log(result);
});

/////////// utils /////////////

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

/////////// making vaults input ////////////

const makeVaultsInput = () => {
  const vaultDefs = [
    {
      id: "RibbonThetaVaultETHCall",
      address: deployments.mainnet.RibbonThetaVaultETHCall,
    },
    {
      id: "RibbonThetaVaultAPECall",
      address: deployments.mainnet.RibbonThetaVaultAPECall,
    },
    {
      id: "RibbonThetaVaultAAVECall",
      address: deployments.mainnet.RibbonThetaVaultAAVECall,
    },
    {
      id: "RibbonThetaVaultWBTCCall",
      address: deployments.mainnet.RibbonThetaVaultWBTCCall,
    },
  ];

  const toVaultParamCall = (contract: any) => contract.vaultParams();
  const tototalBalanceCalls = (contract: any) => contract.totalBalance();
  const toBalanceOfCalls = (contract: any) => contract.balanceOf(TEST_ADDRESS);

  const vaultsInput: MulticallOption<VaultInfo> = {
    inputInfos: _.map(vaultDefs, (def) => ({
      address: def!.address,
      id: def!.id,
      nspace: "ribbonVaults",
    })),
    abi,
    callMappers: [toVaultParamCall, tototalBalanceCalls, toBalanceOfCalls],
    resultsMapper: () => (results) => {
      const [vaultParams, totalBalance, balance] = results;
      const [, decimals, asset, , , cap] = vaultParams;
      return {
        asset,
        decimals,
        cap: parseFloat(formatUnits(cap, decimals)),
        totalDeposited: parseFloat(formatUnits(totalBalance, decimals)),
        balance: parseFloat(formatUnits(balance, decimals)),
      };
    },
  };

  return vaultsInput;
};

////////////// making tokens input /////////////

const makeTokensInput = () => {
  // making input, but in fact, you can form it in any shape
  const tokens = [
    {
      address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
      name: "WBTC",
    },
    {
      address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      name: "WETH",
    },
    {
      address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
      name: "AAVE",
    },
  ];

  // making multiple calls possible
  // it can even refer the inputs, just to pass it as second arg
  const toTokenBalanceCalls = (contract: any) =>
    contract.balanceOf(TEST_ADDRESS);
  const toTokenSymbolCalls = (contract: any) => contract.symbol();
  const toTokenDecimalsCalls = (contract: any) => contract.decimals();

  // putting all things together
  const tokensInput: MulticallOption<TokenInfo> = {
    // the inputs must contain 'address' & 'nspace' attribute
    inputInfos: _.map(tokens, ({ address, name }) => ({
      address,
      name,
      nspace: "tokens",
    })),
    // inject the abi
    abi: erc20Abi,
    // call mappers
    callMappers: [
      toTokenBalanceCalls,
      toTokenSymbolCalls,
      toTokenDecimalsCalls,
    ],
    resultsMapper:
      (
        { address, name } // these are attrs from the original input
      ) =>
      (results) => {
        // this order must be the same with call mappers
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
  return tokensInput;
};
