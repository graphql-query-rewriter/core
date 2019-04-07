import Rewriter, { IVariables } from './rewriters/Rewriter';
import { parse, ASTNode, print } from 'graphql';
import { mapVariables, INodeContext, rewriteAst } from './ast';

export const rewriteQueryRequest = (query: string, variables: object, rewriters: Rewriter[]) => {};

export const rewriteQueryResponse = (response: object, rewriters: Rewriter[]) => {};

interface IRewriterMatch {
  rewriter: Rewriter;
  node: ASTNode;
  context: INodeContext;
}

export class GraphqlQueryRewriteHandler {
  private rewriters: Rewriter[];
  private matches: IRewriterMatch[] = [];
  private hasProcessedRequest: boolean = false;
  private hasProcessedResponse: boolean = false;

  constructor(rewriters: Rewriter[]) {
    this.rewriters = rewriters;
  }

  rewriteRequest(query: string, variables?: IVariables) {
    if (this.hasProcessedRequest) throw new Error('This handler has already rewritten a request');
    this.hasProcessedRequest = true;
    const doc = parse(query);
    const variableMap = mapVariables(doc);
    let rewrittenVariables = variables;
    const rewrittenDoc = rewriteAst(doc, ({ node, parents }) => {
      const context: INodeContext = {
        parents,
        variableMap
      };
      let rewrittenNode = node;
      const matchingRewriters = this.rewriters.filter(rewriter => {
        const isMatch = rewriter.matches(rewrittenNode, context);
        if (isMatch) {
          rewrittenVariables = rewriter.rewriteQueryVariables(
            rewrittenNode,
            context,
            rewrittenVariables
          );
          rewrittenNode = rewriter.rewriteQueryRequest(rewrittenNode, context);
        }
        return isMatch;
      });
      matchingRewriters.forEach(rewriter => {
        this.matches.push({
          rewriter,
          node: rewrittenNode,
          context
        });
      });
      return rewrittenNode;
    });

    return { query: print(rewrittenDoc), variables: rewrittenVariables };
  }

  rewriteResponse(response: any) {
    if (this.hasProcessedResponse) throw new Error('This handler has already return a response');
    this.hasProcessedResponse = true;
    let rewrittenResponse = response;
    this.matches.reverse().forEach(({ rewriter, node, context }) => {
      rewrittenResponse = rewriter.rewriteQueryResponse(rewrittenResponse, node, context);
    });
  }
}
