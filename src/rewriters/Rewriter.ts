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

  /*
   * Receives the parent object of the matched field with the key of the matched field.
   * For arrays, the index of the element is also present.
   */
  public rewriteResponse(response: any, key: string, index?: number): any {
    return response;
  }

  /*
   * Helper that extracts the element from the response if possible otherwise returns null.
   */
  protected extractReponseElement(response: any, key: string, index?: number): any {
    // Verify the response format
    let element = null;
    if (response === null || typeof response !== 'object') return element;

    // Extract the key
    element = response[key] || null;

    // Extract the position
    if (Array.isArray(element)) {
      element = element[index!] || null;
    }

    return element;
  }

  /*
   * Helper that rewrite the element from the response if possible and returns the response.
   */
  protected rewriteResponseElement(
    response: any,
    newElement: any,
    key: string,
    index?: number
  ): any {
    // Verify the response format
    if (response === null || typeof response !== 'object') return response;

    // Extract the key
    const element = response[key];

    // Extract the position
    // NOTE: We might eventually want to create an array if one is not present at the key
    // and we receive an index in input
    if (Array.isArray(element)) {
      element[index!] = newElement;
    } else {
      response[key] = newElement;
    }

    return response;
  }

  protected deleteResponseElement(response: any, key: string, index?: number): any {
    // Verify the response format
    if (response === null || typeof response !== 'object') return response;

    // Extract the key
    const element = response[key];

    // Extract the position
    if (Array.isArray(element)) {
      element.splice(index!, 1);
    } else {
      delete response[key];
    }

    return response;
  }
}

export default Rewriter;
