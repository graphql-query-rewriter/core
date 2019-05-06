import { ASTNode } from 'graphql';
import { NodeAndVarDefs } from '../ast';

export type Variables = { [key: string]: any } | undefined;
export type RootType = 'query' | 'mutation' | 'fragment';

export interface RewriterOpts {
  fieldName: string;
  rootTypes?: RootType[];
}

/**
 * Abstract base Rewriter class
 * Extend this class and overwrite its methods to create a new rewriter
 */
abstract class Rewriter {
  protected fieldName: string;
  protected rootTypes: RootType[] = ['query', 'mutation', 'fragment'];

  constructor({ fieldName, rootTypes }: RewriterOpts) {
    this.fieldName = fieldName;
    if (rootTypes) this.rootTypes = rootTypes;
  }

  public matches({ node }: NodeAndVarDefs, parents: ReadonlyArray<ASTNode>): boolean {
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
    return true;
  }

  public rewriteQuery(nodeAndVarDefs: NodeAndVarDefs): NodeAndVarDefs {
    return nodeAndVarDefs;
  }

  public rewriteVariables(nodeAndVarDefs: NodeAndVarDefs, variables: Variables): Variables {
    return variables;
  }

  public rewriteResponse(response: any): any {
    return response;
  }
}

export default Rewriter;
