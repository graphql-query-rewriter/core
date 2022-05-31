import { ASTNode } from 'graphql';
import { NodeAndVarDefs } from '../ast';
import Rewriter, { RewriterOpts, Variables } from './Rewriter';

interface CustomRewriterOpts extends RewriterOpts {
  matchesFn?: (nodeAndVarDefs: NodeAndVarDefs, parents: ReadonlyArray<ASTNode>) => boolean;
  rewriteQueryFn?: (nodeAndVarDefs: NodeAndVarDefs, variables: Variables) => NodeAndVarDefs;
  rewriteVariablesFn?: (nodeAndVarDefs: NodeAndVarDefs, variables: Variables) => Variables;
  rewriteResponseFn?: (
    response: any,
    key: string,
    index?: number,
    nodeMatchAndParents?: ASTNode[]
  ) => NodeAndVarDefs;
}

/**
 * A Custom rewriter with its Rewriter functions received as arguments.
 * This Rewriter allows users to write their own rewriter functions.
 */
class CustomRewriter extends Rewriter {
  protected matchesFn: (nodeAndVarDefs: NodeAndVarDefs, parents: ReadonlyArray<ASTNode>) => boolean;
  protected rewriteQueryFn: (
    nodeAndVarDefs: NodeAndVarDefs,
    variables: Variables
  ) => NodeAndVarDefs;
  protected rewriteVariablesFn: (nodeAndVarDefs: NodeAndVarDefs, variables: Variables) => Variables;
  protected rewriteResponseFn: (
    response: any,
    key: string,
    index?: number,
    nodeMatchAndParents?: ASTNode[]
  ) => NodeAndVarDefs;

  constructor(options: CustomRewriterOpts) {
    const {
      matchesFn,
      rewriteQueryFn,
      rewriteVariablesFn,
      rewriteResponseFn,
      matchConditions = [() => true],
      ...rewriterOpts
    } = options;
    super({ ...rewriterOpts, matchConditions });
    this.matchesFn = matchesFn || super.matches;
    this.rewriteQueryFn = rewriteQueryFn || super.rewriteQuery;
    this.rewriteVariablesFn = rewriteVariablesFn || super.rewriteVariables;
    this.rewriteResponseFn = rewriteResponseFn || super.rewriteResponse;
  }

  public matches(nodeAndVarDefs: NodeAndVarDefs, parents: ReadonlyArray<ASTNode>): boolean {
    return this.matchesFn(nodeAndVarDefs, parents);
  }

  public rewriteQuery(nodeAndVarDefs: NodeAndVarDefs, variables: Variables) {
    return this.rewriteQueryFn(nodeAndVarDefs, variables);
  }

  public rewriteResponse(
    response: any,
    key: string,
    index?: number,
    nodeMatchAndParents?: ASTNode[]
  ) {
    return this.rewriteResponseFn(response, key, index, nodeMatchAndParents);
  }

  public rewriteVariables(nodeAndVarDefs: NodeAndVarDefs, variables: Variables): Variables {
    return this.rewriteVariablesFn(nodeAndVarDefs, variables);
  }
}

export default CustomRewriter;
