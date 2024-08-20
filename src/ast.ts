import {
  ASTNode,
  DocumentNode,
  FragmentDefinitionNode, Kind,
  ObjectValueNode, ValueNode,
  VariableDefinitionNode
} from 'graphql';
import { pushToArrayAtKey } from './utils';

const ignoreKeys = new Set(['loc']);

/** @hidden */
export const nodesMatch = (node1: ASTNode, node2: ASTNode): boolean => {
  for (const key of Object.keys(node1)) {
    if (ignoreKeys.has(key)) continue;
    const val1 = (node1 as any)[key];
    const val2 = (node2 as any)[key];
    if (val1 && !val2) return false;
    if (Array.isArray(val1)) {
      if (val1.length !== val2.length) return false;
      for (let i = 0; i < val1.length; i++) {
        if (!nodesMatch(val1[i], val2[i])) return false;
      }
    } else if (typeof val1 === 'object') {
      if (!nodesMatch(val1, val2)) return false;
    } else if (val1 !== val2) {
      return false;
    }
  }
  return true;
};

/** @hidden */
export interface NodeAndVarDefs {
  node: ASTNode;
  variableDefinitions: ReadonlyArray<VariableDefinitionNode>;
}

/** @hidden */
export interface FragmentPathMap {
  [fragmentName: string]: ReadonlyArray<ReadonlyArray<string>>;
}

/** @hidden */
interface MutableFragmentPathMap {
  [fragmentName: string]: Array<ReadonlyArray<string>>;
}

/** @hidden */
export class FragmentTracer {
  private fragmentPathMap?: FragmentPathMap;
  private doc: DocumentNode;

  constructor(doc: DocumentNode) {
    this.doc = doc;
  }

  public getPathsToFragment(fragmentName: string): ReadonlyArray<ReadonlyArray<string>> {
    if (!this.fragmentPathMap) {
      this.fragmentPathMap = this.buildFragmentPathMap();
    }
    return this.fragmentPathMap[fragmentName] || [];
  }

  // prepend the paths from the original document into this fragment to the inner fragment paths
  public prependFragmentPaths(
    fragmentName: string,
    pathWithinFragment: ReadonlyArray<string>
  ): ReadonlyArray<ReadonlyArray<string>> {
    return this.getPathsToFragment(fragmentName).map(path => [...path, ...pathWithinFragment]);
  }

  private getFragmentDefs(): ReadonlyArray<FragmentDefinitionNode> {
    return this.doc.definitions.filter(
      ({ kind }) => kind === 'FragmentDefinition'
    ) as FragmentDefinitionNode[];
  }

  private getFragmentPartialPathMap(startNode: ASTNode): MutableFragmentPathMap {
    const partialPathMap: MutableFragmentPathMap = {};
    const recursivelyBuildFragmentPaths = (node: ASTNode, curParents: ReadonlyArray<ASTNode>) => {
      if (node.kind === 'FragmentSpread') {
        pushToArrayAtKey(partialPathMap, node.name.value, extractPath(curParents));
      }
      const nextParents = [...curParents, node];
      if ('selectionSet' in node && node.selectionSet) {
        for (const selection of node.selectionSet.selections) {
          recursivelyBuildFragmentPaths(selection, nextParents);
        }
      }
    };
    recursivelyBuildFragmentPaths(startNode, []);
    return partialPathMap;
  }

  private mergeFragmentPaths(
    fragmentName: string,
    paths: Array<ReadonlyArray<string>>,
    fragmentPartialPathsMap: { [fragmentName: string]: FragmentPathMap }
  ) {
    const mergedPaths: MutableFragmentPathMap = {};

    const resursivelyBuildMergedPathsMap = (
      curFragmentName: string,
      curPaths: Array<ReadonlyArray<string>>,
      seenFragments: ReadonlySet<string>
    ) => {
      // recursive fragments are invalid graphQL - just exit here. otherwise this will be an infinite loop
      if (seenFragments.has(curFragmentName)) return;
      const nextSeenFragments = new Set(seenFragments);
      nextSeenFragments.add(curFragmentName);
      const nextPartialPaths = fragmentPartialPathsMap[curFragmentName];
      // if there are not other fragments nested inside of this fragment, we're done
      if (!nextPartialPaths) return;

      for (const [childFragmentName, childFragmentPaths] of Object.entries(nextPartialPaths)) {
        for (const path of curPaths) {
          const mergedChildPaths: Array<ReadonlyArray<string>> = [];
          for (const childPath of childFragmentPaths) {
            const mergedPath = [...path, ...childPath];
            mergedChildPaths.push(mergedPath);
            pushToArrayAtKey(mergedPaths, childFragmentName, mergedPath);
          }
          resursivelyBuildMergedPathsMap(childFragmentName, mergedChildPaths, nextSeenFragments);
        }
      }
    };

    resursivelyBuildMergedPathsMap(fragmentName, paths, new Set());
    return mergedPaths;
  }

  private buildFragmentPathMap(): FragmentPathMap {
    const mainOperation = this.doc.definitions.find(node => node.kind === 'OperationDefinition');
    if (!mainOperation) return {};

    // partial paths are the paths inside of each fragmnt to other fragments
    const fragmentPartialPathsMap: { [fragmentName: string]: FragmentPathMap } = {};
    for (const fragmentDef of this.getFragmentDefs()) {
      fragmentPartialPathsMap[fragmentDef.name.value] = this.getFragmentPartialPathMap(fragmentDef);
    }

    // start with the direct paths to fragments inside of the main operation
    const simpleFragmentPathMap: MutableFragmentPathMap = this.getFragmentPartialPathMap(
      mainOperation
    );
    const fragmentPathMap: MutableFragmentPathMap = { ...simpleFragmentPathMap };
    // next, we'll recursively trace the partials into their subpartials to fill out all possible paths to each fragment
    for (const [fragmentName, simplePaths] of Object.entries(simpleFragmentPathMap)) {
      const mergedFragmentPathsMap = this.mergeFragmentPaths(
        fragmentName,
        simplePaths,
        fragmentPartialPathsMap
      );
      for (const [mergedFragmentName, mergedFragmentPaths] of Object.entries(
        mergedFragmentPathsMap
      )) {
        fragmentPathMap[mergedFragmentName] = [
          ...(fragmentPathMap[mergedFragmentName] || []),
          ...mergedFragmentPaths
        ];
      }
    }

    return fragmentPathMap;
  }
}

/**
 * Walk the document add rewrite nodes along the way
 * @param doc
 * @param callback Called on each node, and returns a new rewritten node
 * @hidden
 */
export const rewriteDoc = (
  doc: DocumentNode,
  callback: (nodeAndVars: NodeAndVarDefs, parents: ReadonlyArray<ASTNode>) => NodeAndVarDefs
): DocumentNode => {
  let variableDefinitions = extractVariableDefinitions(doc);
  const walkRecursive = (
    curNodeAndVars: NodeAndVarDefs,
    curParents: ReadonlyArray<ASTNode>
  ): ASTNode => {
    const nextNodeAndVars = callback(curNodeAndVars, curParents);
    variableDefinitions = nextNodeAndVars.variableDefinitions;
    const node = nextNodeAndVars.node;
    const nextParents = [...curParents, node];
    for (const key of Object.keys(node)) {
      if (key === 'loc') continue;
      const val = (node as any)[key];
      if (Array.isArray(val)) {
        (node as any)[key] = val.map(elm => {
          if (typeof elm === 'object') {
            const next: NodeAndVarDefs = {
              variableDefinitions,
              node: elm
            };
            return walkRecursive(next, nextParents);
          }
          return elm;
        });
      } else if (typeof val === 'object') {
        const next: NodeAndVarDefs = {
          variableDefinitions,
          node: val
        };
        (node as any)[key] = walkRecursive(next, nextParents);
      }
    }
    return node;
  };

  const root: NodeAndVarDefs = {
    variableDefinitions,
    node: doc
  };
  const rewrittenDoc = walkRecursive(root, []) as DocumentNode;
  return replaceVariableDefinitions(rewrittenDoc, variableDefinitions);
};

/** @hidden */
export const extractVariableDefinitions = (
  doc: DocumentNode
): ReadonlyArray<VariableDefinitionNode> => {
  for (const def of doc.definitions) {
    if (def.kind === 'OperationDefinition') {
      return def.variableDefinitions || [];
    }
  }
  return [];
};

/** @hidden */
export const replaceVariableDefinitions = (
  doc: DocumentNode,
  variableDefinitions: ReadonlyArray<VariableDefinitionNode>
): DocumentNode => {
  const definitions = doc.definitions.map(def => {
    if (def.kind === 'OperationDefinition') {
      return { ...def, variableDefinitions };
    }
    return def;
  });
  return { ...doc, definitions };
};

/**
 * return the path that will be returned in the response from from the chain of parents
 */
/** @hidden */
export const extractPath = (parents: ReadonlyArray<ASTNode>): ReadonlyArray<string> => {
  const path: string[] = [];
  parents.forEach(parent => {
    if (parent.kind === 'Field') {
      path.push(parent.name.value);
    }
  });
  return path;
};

/** @hidden */
interface ResultObj {
  [key: string]: any;
}

/** @hidden */
export const rewriteResultsAtPath = (
  results: ResultObj,
  path: ReadonlyArray<string>,
  callback: (parentResult: any, key: string, position?: number) => any
): ResultObj => {
  if (path.length === 0) return results;

  const curPathElm = path[0];
  const newResults = { ...results };
  const curResults = results[curPathElm];

  if (path.length === 1) {
    if (Array.isArray(curResults)) {
      return curResults.reduce(
        (reducedResults, _, index) => callback(reducedResults, curPathElm, index),
        results
      );
    }

    return callback(results, curPathElm);
  }

  const remainingPath = path.slice(1);
  // if the path stops here, just return results without any rewriting
  if (curResults === undefined || curResults === null) return results;

  if (Array.isArray(curResults)) {
    newResults[curPathElm] = curResults.map(result =>
      rewriteResultsAtPath(result, remainingPath, callback)
    );
  } else {
    newResults[curPathElm] = rewriteResultsAtPath(curResults, remainingPath, callback);
  }

  return newResults;
};

export const getByPath = (node: ObjectValueNode, path: ReadonlyArray<string>): ValueNode | undefined => {
  const [firstSegment, ...theRestOfSegments] = path;

  if (!firstSegment) return undefined;

  const theField = node.fields
    .find(field => field.name.value === firstSegment);

  if (!theField) return undefined;

  if (theRestOfSegments.length === 0) {
    return theField.value;
  }

  if (theField.value.kind === Kind.OBJECT) {
    return getByPath(theField.value, theRestOfSegments)
  }

  return undefined;
}
