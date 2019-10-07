import matchCondition from './matchCondition';
import operationMatchCondition from './operationMatchCondition';
export interface QueryMatchConditionOpts {
  queryNames?: string[];
  pathRegexes?: RegExp[];
}

const queryMatchCondition = ({
  queryNames,
  pathRegexes
}: QueryMatchConditionOpts = {}): matchCondition => {
  return operationMatchCondition({
    pathRegexes,
    operationNames: queryNames,
    operationTypes: ['query']
  });
};

export default queryMatchCondition;
