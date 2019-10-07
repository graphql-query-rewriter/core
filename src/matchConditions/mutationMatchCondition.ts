import matchCondition from './matchCondition';
import operationMatchCondition from './operationMatchCondition';
export interface MutationMatchConditionOpts {
  mutationNames?: string[];
  pathRegexes?: RegExp[];
}

export default ({
  mutationNames,
  pathRegexes
}: MutationMatchConditionOpts = {}): matchCondition => {
  return operationMatchCondition({
    pathRegexes,
    operationNames: mutationNames,
    operationTypes: ['mutation']
  });
};
