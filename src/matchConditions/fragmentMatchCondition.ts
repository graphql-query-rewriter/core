import { FragmentDefinitionNode } from 'graphql';
import { extractPath } from '../ast';
import matchCondition from './matchCondition';
export interface FragmentMatchConditionOpts {
  fragmentNames?: string[];
  fragmentTypes?: string[];
  pathRegexes?: RegExp[];
}

export default ({
  fragmentNames,
  fragmentTypes,
  pathRegexes
}: FragmentMatchConditionOpts = {}): matchCondition => {
  return ({ node }, parents) => {
    const fragmentDef = parents.find(({ kind }) => kind === 'FragmentDefinition') as
      | FragmentDefinitionNode
      | undefined;
    if (!fragmentDef) return false;

    if (fragmentNames && !fragmentNames.includes(fragmentDef.name.value)) {
      return false;
    }

    if (fragmentTypes && !fragmentTypes.includes(fragmentDef.typeCondition.name.value)) {
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
