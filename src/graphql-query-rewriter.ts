import Rewriter, { IVariables } from './rewriters/Rewriter';
import { parse, ASTNode, print } from 'graphql';
import { rewriteDoc } from './ast';

export const rewriteQueryRequest = (query: string, variables: object, rewriters: Rewriter[]) => {};

export const rewriteQueryResponse = (response: object, rewriters: Rewriter[]) => {};

interface IRewriterMatch {
  rewriter: Rewriter;
  node: ASTNode;
  parents: ReadonlyArray<ASTNode>;
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
    let rewrittenVariables = variables;
    const rewrittenDoc = rewriteDoc(doc, (nodeAndVars, parents) => {
      let rewrittenNodeAndVars = nodeAndVars;
      const matchingRewriters = this.rewriters.filter(rewriter => {
        const isMatch = rewriter.matches(nodeAndVars, parents);
        if (isMatch) {
          rewrittenVariables = rewriter.rewriteQueryVariables(
            rewrittenNodeAndVars,
            parents,
            rewrittenVariables
          );
          rewrittenNodeAndVars = rewriter.rewriteQueryRequest(rewrittenNodeAndVars, parents);
        }
        return isMatch;
      });
      matchingRewriters.forEach(rewriter => {
        this.matches.push({
          rewriter,
          node: rewrittenNodeAndVars.node,
          parents
        });
      });
      return rewrittenNodeAndVars;
    });

    return { query: print(rewrittenDoc), variables: rewrittenVariables };
  }

  rewriteResponse(response: any) {
    if (this.hasProcessedResponse) throw new Error('This handler has already return a response');
    this.hasProcessedResponse = true;
    let rewrittenResponse = response;
    this.matches.reverse().forEach(({ rewriter, node, parents }) => {
      rewrittenResponse = rewriter.rewriteQueryResponse(rewrittenResponse, node, parents);
    });
  }
}
