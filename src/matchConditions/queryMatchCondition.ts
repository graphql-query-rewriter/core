import matchCondition from './matchCondition';
import operationMatchCondition from './operationMatchCondition';
export interface QueryMatchConditionOpts {
  queryNames?: string[];
  pathRegexes?: RegExp[];
}

export default ({ queryNames, pathRegexes }: QueryMatchConditionOpts = {}): matchCondition => {
  return operationMatchCondition({
    pathRegexes,
    operationNames: queryNames,
    operationTypes: ['query']
  });
};
