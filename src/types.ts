import { Call } from "ethcall";

export interface MulticallResultBase {
  address: string;
  nspace: string;
  [key: string]: any;
}

export interface MulticallOption<T> {
  inputInfos: MulticallResultBase[];
  abi: any;
  callMappers: ((contract: any, input: MulticallResultBase) => Call)[];
  resultsMapper: (resultBase: MulticallResultBase) => (callResults: any[]) => T;
}

export type MulticallOptions<K extends string, T> = Partial<
  Record<K, MulticallOption<T>>
>;
