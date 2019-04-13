import { ASTNode, ArgumentNode, DocumentNode, VariableDefinitionNode } from 'graphql';

const ignoreKeys = new Set(['loc']);

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

export interface INodeAndVarDefs {
  node: ASTNode;
  variableDefinitions: ReadonlyArray<VariableDefinitionNode>;
}

/**
 * Walk the document add rewrite nodes along the way
 * @param doc
 * @param callback Called on each node, and returns a new rewritten node
 */
export const rewriteDoc = (
  doc: DocumentNode,
  callback: (nodeAndVars: INodeAndVarDefs, parents: ReadonlyArray<ASTNode>) => INodeAndVarDefs
): DocumentNode => {
  let variableDefinitions = extractVariableDefinitions(doc);
  const walkRecursive = (
    curNodeAndVars: INodeAndVarDefs,
    curParents: ReadonlyArray<ASTNode>
  ): ASTNode => {
    const nextNodeAndVars = callback(curNodeAndVars, curParents);
    variableDefinitions = nextNodeAndVars.variableDefinitions;
    const node = nextNodeAndVars.node;
    const nextParents = [node, ...curParents];
    for (const key of Object.keys(node)) {
      if (key === 'loc') continue;
      const val = (node as any)[key];
      if (Array.isArray(val)) {
        (node as any)[key] = val.map(elm => {
          if (typeof elm === 'object') {
            const next: INodeAndVarDefs = {
              node: elm,
              variableDefinitions
            };
            return walkRecursive(next, nextParents);
          }
          return elm;
        });
      } else if (typeof val === 'object') {
        const next: INodeAndVarDefs = {
          node: val,
          variableDefinitions
        };
        (node as any)[key] = walkRecursive(next, nextParents);
      }
    }
    return node;
  };

  const root: INodeAndVarDefs = {
    node: doc,
    variableDefinitions
  };
  const rewrittenDoc = walkRecursive(root, []) as DocumentNode;
  return replaceVariableDefinitions(rewrittenDoc, variableDefinitions);
};

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
export const extractPath = (parents: ReadonlyArray<ASTNode>): ReadonlyArray<string> => {
  const path: string[] = [];
  parents.forEach(parent => {
    if (parent.kind === 'Field') {
      path.push(parent.name.value);
    }
  });
  return path;
};

type ResultObj = {
  [key: string]: any;
};

export const rewriteResultsAtPath = (
  results: ResultObj,
  path: ReadonlyArray<string>,
  callback: (resultsAtPath: any) => any
): ResultObj => {
  if (path.length === 0) return callback(results);
  const curPathElm = path[0];
  const remainingPath = path.slice(1);
  const newResults = { ...results };
  const curResults = results[curPathElm];
  // if the path stops here, just return results without any rewriting
  if (curResults === undefined || curResults === null) return results;

  if (Array.isArray(curResults)) {
    newResults[curPathElm] = curResults.reduce((acc, resultElm) => {
      const elmResults = rewriteResultsAtPath(resultElm, remainingPath, callback);
      return acc.concat(elmResults);
    }, []);
    return newResults;
  }

  newResults[curPathElm] = rewriteResultsAtPath(curResults, remainingPath, callback);
  return newResults;
};
