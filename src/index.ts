import { Contract, Provider as EthcallProvider } from "ethcall";
import _ from "lodash";
import { BaseProvider } from "@ethersproject/providers";
import {
  MulticallOption,
  MulticallOptions,
  MulticallResultBase,
} from "./types";
import { transformEs6MapToArrays, transfromRecordToEs6Map } from "./utils";

export const doMulticall = async <K extends string, R>(
  provider: BaseProvider | undefined,
  inputs: MulticallOptions<K, R>
) => {
  if (!provider) {
    throw new Error("No provider is found");
  }
  const ethcallProvider = new EthcallProvider();
  await ethcallProvider.init(provider);

  // use map for reproducable order
  const inputsMap = transfromRecordToEs6Map(inputs);

  const inputArr = transformEs6MapToArrays(inputsMap);

  const contractMapper = (address: string, abi) => {
    return new Contract(address, abi);
  };

  const callsFlatten = _.flatten(
    _.map(inputArr, ({ abi, callMappers, inputInfos }) =>
      _.flatten(
        _.map(inputInfos, ({ address }) => {
          const contract = contractMapper(address, abi);
          return _.map(callMappers, (mapper) => mapper(contract));
        })
      )
    )
  );

  // aggregate all calls in chunk size of 30
  const callsChunks = _.chunk(callsFlatten, 30);
  const results = await _.reduce(
    callsChunks,
    async (prev, calls) => {
      const prevResults = await prev;

      const res = await ethcallProvider.tryEach(calls, [
        ..._.map(calls, (call) => !call),
      ]);
      return [...prevResults, ...res];
    },
    Promise.resolve([] as any[])
  );

  let count = 0;
  const resultsNested = _.reduce(
    Array.from(inputsMap),
    (prev, [key, input]) => {
      const records = _.reduce(
        (input as MulticallOption<R>).inputInfos,
        (prev2, inputInfo) => {
          const prevCount = count;
          const { callMappers, resultsMapper } = input;
          count += callMappers.length;
          const resultsLocal = results.slice(prevCount, count);
          return {
            ...prev2,
            [inputInfo.address]: {
              ...resultsMapper(inputInfo)(resultsLocal),
              ...inputInfo,
            },
          };
        },
        {} as Record<K, R & MulticallResultBase>
      );
      return {
        ...prev,
        [key]: records,
      };
    },
    {} as Record<K, Record<K, R & MulticallResultBase>>
  );
  return resultsNested;
};
