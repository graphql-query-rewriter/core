import { ASTNode } from 'graphql';
import { NodeAndVarDefs } from '../ast';
import matchCondition from '../matchConditions/matchCondition';

export type Variables = { [key: string]: any } | undefined;
export type RootType = 'query' | 'mutation' | 'fragment';

export interface RewriterOpts {
  fieldName: string;
  rootTypes?: RootType[];
  matchConditions?: matchCondition[];
}

/**
 * Abstract base Rewriter class
 * Extend this class and overwrite its methods to create a new rewriter
 */
abstract class Rewriter {
  protected fieldName: string;
  protected rootTypes: RootType[] = ['query', 'mutation', 'fragment'];
  protected matchConditions?: matchCondition[];

  constructor({ fieldName, rootTypes, matchConditions }: RewriterOpts) {
    this.fieldName = fieldName;
    this.matchConditions = matchConditions;
    if (rootTypes) this.rootTypes = rootTypes;
  }

  public matches(nodeAndVarDefs: NodeAndVarDefs, parents: ReadonlyArray<ASTNode>): boolean {
    const { node } = nodeAndVarDefs;
    if (node.kind !== 'Field' || node.name.value !== this.fieldName) return false;
    const root = parents[0];
    if (
      root.kind === 'OperationDefinition' &&
      this.rootTypes.indexOf(root.operation as RootType) === -1
    ) {
      return false;
    }
    if (root.kind === 'FragmentDefinition' && this.rootTypes.indexOf('fragment') === -1) {
      return false;
    }
    if (
      this.matchConditions &&
      !this.matchConditions.find(condition => condition(nodeAndVarDefs, parents))
    ) {
      return false;
    }
    return true;
  }

  public rewriteQuery(nodeAndVarDefs: NodeAndVarDefs): NodeAndVarDefs {
    return nodeAndVarDefs;
  }

  public rewriteVariables(nodeAndVarDefs: NodeAndVarDefs, variables: Variables): Variables {
    return variables;
  }

  public rewriteResponse(response: any, key: string | number): any {
    return response;
  }
}

export default Rewriter;
