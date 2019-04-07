import { ASTNode, ArgumentNode } from 'graphql';

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

export interface INodeWithParents {
  node: ASTNode;
  parents: ASTNode[];
}

/**
 * Walk the AST add rewrite nodes along the way
 * @param doc
 * @param callback Called on each node, and returns a new rewritten node
 */
export const rewriteAst = (
  doc: ASTNode,
  callback: (nodeWithParents: INodeWithParents) => ASTNode
): ASTNode => {
  const walkRecursive = (curNodeWithParents: INodeWithParents): ASTNode => {
    const resultNode = { ...callback(curNodeWithParents) };
    for (const key of Object.keys(resultNode)) {
      if (key === 'loc') continue;
      const val = (resultNode as any)[key];
      if (Array.isArray(val)) {
        (resultNode as any)[key] = val.map(elm => {
          if (typeof elm === 'object') {
            const next: INodeWithParents = {
              node: elm,
              parents: [curNodeWithParents.node, ...curNodeWithParents.parents]
            };
            return walkRecursive(next);
          }
          return elm;
        });
      } else if (typeof val === 'object') {
        const next: INodeWithParents = {
          node: val,
          parents: [curNodeWithParents.node, ...curNodeWithParents.parents]
        };
        (resultNode as any)[key] = walkRecursive(next);
      }
    }
    return resultNode;
  };

  const root: INodeWithParents = {
    node: doc,
    parents: []
  };
  return walkRecursive(root);
};

export interface IArgumentWithParents extends INodeWithParents {
  node: ArgumentNode;
}

export interface IVariableMap {
  [name: string]: IArgumentWithParents[];
}

/**
 * return a mapping of variable name => array of argument nodes referencing it
 */
export const mapVariables = (doc: ASTNode): IVariableMap => {
  const varMap: IVariableMap = {};

  rewriteAst(doc, nodeWithParents => {
    const { node } = nodeWithParents;
    if (node.kind === 'Argument' && node.value.kind === 'Variable') {
      const variable = node.value;
      if (!varMap[variable.name.value]) varMap[variable.name.value] = [];
      varMap[variable.name.value].push(nodeWithParents as IArgumentWithParents);
    }
    return nodeWithParents.node;
  });
  return varMap;
};

export interface INodeContext {
  parents: ASTNode[];
  variableMap: IVariableMap;
}
