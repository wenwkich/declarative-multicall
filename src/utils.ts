import _ from "lodash";

export const transformEs6MapToArrays = <K, V>(inputs: Map<K, V>) => {
  return _.map(Array.from(inputs), ([, value]) => value);
};

export const transfromRecordToEs6Map = <K extends string, V>(
  from: Partial<Record<K, V>>
) => {
  return new Map(Object.entries(from)) as Map<K, V>;
};
