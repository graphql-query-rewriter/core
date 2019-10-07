import matchCondition from './matchCondition';
import operationMatchCondition from './operationMatchCondition';
export interface MutationMatchConditionOpts {
  mutationNames?: string[];
  pathRegexes?: RegExp[];
}

const mutationMatchCondition = ({
  mutationNames,
  pathRegexes
}: MutationMatchConditionOpts = {}): matchCondition => {
  return operationMatchCondition({
    pathRegexes,
    operationNames: mutationNames,
    operationTypes: ['mutation']
  });
};

export default mutationMatchCondition;
