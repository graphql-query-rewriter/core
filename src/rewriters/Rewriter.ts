import { ASTNode } from 'graphql';
import { NodeAndVarDefs } from '../ast';
import matchCondition from '../matchConditions/matchCondition';

export type Variables = { [key: string]: any } | undefined;
export type RootType = 'query' | 'mutation' | 'fragment';

export interface RewriterOpts {
  fieldName?: string;
  rootTypes?: RootType[];
  matchConditions?: matchCondition[];
  includeNonFieldPathsInMatch?: boolean;
}

/**
 * Abstract base Rewriter class
 * Extend this class and overwrite its methods to create a new rewriter
 */
abstract class Rewriter {
  public includeNonFieldPathsInMatch: boolean = false;
  protected rootTypes: RootType[] = ['query', 'mutation', 'fragment'];
  protected fieldName?: string;
  protected matchConditions?: matchCondition[];

  constructor({
    fieldName,
    rootTypes,
    matchConditions,
    includeNonFieldPathsInMatch = false
  }: RewriterOpts) {
    this.fieldName = fieldName;
    this.matchConditions = matchConditions;
    this.includeNonFieldPathsInMatch = includeNonFieldPathsInMatch;
    if (!this.fieldName && !this.matchConditions) {
      throw new Error(
        'Neither a fieldName or matchConditions were provided. Please choose to pass either one in order to be able to detect which fields to rewrite.'
      );
    }
    if (rootTypes) this.rootTypes = rootTypes;
  }

  public matches(nodeAndVarDefs: NodeAndVarDefs, parents: ReadonlyArray<ASTNode>): boolean {
    const { node } = nodeAndVarDefs;

    // If no fieldName is provided, check for defined matchConditions.
    // This avoids having to define one rewriter for many fields individually.
    // Alternatively, regex matching for fieldName could be implemented.
    if (
      node.kind !== 'Field' ||
      (this.fieldName ? node.name.value !== this.fieldName : !this.matchConditions)
    ) {
      return false;
    }
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

  public rewriteQuery(nodeAndVarDefs: NodeAndVarDefs, variables: Variables): NodeAndVarDefs {
    return nodeAndVarDefs;
  }

  public rewriteVariables(nodeAndVarDefs: NodeAndVarDefs, variables: Variables): Variables {
    return variables;
  }

  /*
   * Receives the parent object of the matched field with the key of the matched field.
   * For arrays, the index of the element is also present.
   */
  public rewriteResponse(
    response: any,
    key: string,
    index?: number,
    nodeMatchAndParents?: ASTNode[]
  ): any {
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
      // if element is an empty array do not try to get
      // one of its array elements
      if (element.length !== 0) {
        element = element[index!] || null;
      }
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
}

export default Rewriter;
