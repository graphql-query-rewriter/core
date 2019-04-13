import { ASTNode } from 'graphql';
import { INodeAndVarDefs } from '../ast';

export type IVariables = { [key: string]: any } | undefined;

abstract class Rewriter {
  abstract matches(nodeAndVarDefs: INodeAndVarDefs, parents: ReadonlyArray<ASTNode>): boolean;

  rewriteQueryRequest(
    nodeAndVarDefs: INodeAndVarDefs,
    _parents: ReadonlyArray<ASTNode>
  ): INodeAndVarDefs {
    return nodeAndVarDefs;
  }

  rewriteQueryVariables(
    _nodeAndVarDefs: INodeAndVarDefs,
    _parents: ReadonlyArray<ASTNode>,
    variables: IVariables
  ): IVariables {
    return variables;
  }

  rewriteQueryResponse(response: any): any {
    return response;
  }
}

export default Rewriter;
