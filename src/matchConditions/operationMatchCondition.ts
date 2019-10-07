import { OperationDefinitionNode } from 'graphql';
import { extractPath } from '../ast';
import matchCondition from './matchCondition';
export interface OperationMatchConditionOpts {
  operationNames?: string[];
  operationTypes?: string[];
  pathRegexes?: RegExp[];
}

export default ({
  operationNames,
  operationTypes,
  pathRegexes
}: OperationMatchConditionOpts = {}): matchCondition => {
  return ({ node }, parents) => {
    const operationDef = parents.find(({ kind }) => kind === 'OperationDefinition') as
      | OperationDefinitionNode
      | undefined;

    if (!operationDef) return false;

    if (operationNames) {
      if (!operationDef.name || !operationNames.includes(operationDef.name.value)) {
        return false;
      }
    }

    if (operationTypes && !operationTypes.includes(operationDef.operation)) {
      return false;
    }

    if (pathRegexes) {
      const pathStr = extractPath([...parents, node]).join('.');
      if (!pathRegexes.find(pathRegex => pathRegex.test(pathStr))) {
        return false;
      }
    }

    return true;
  };
};
