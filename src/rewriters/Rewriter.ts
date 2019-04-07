import { ASTNode } from 'graphql';
import { INodeContext } from '../ast';

export type IVariables = { [key: string]: any } | undefined;

abstract class Rewriter {
  abstract matches(node: ASTNode, ctx: INodeContext): boolean;

  rewriteQueryRequest(node: ASTNode, _ctx: INodeContext): ASTNode {
    return node;
  }

  rewriteQueryVariables(_node: ASTNode, _ctx: INodeContext, variables: IVariables): IVariables {
    return variables;
  }

  rewriteQueryResponse(response: any, _node: ASTNode, _ctx: INodeContext): any {
    return response;
  }
}

export default Rewriter;
