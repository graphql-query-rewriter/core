import Rewriter, { Variables } from './rewriters/Rewriter';
import { parse, print } from 'graphql';
import { rewriteDoc, extractPath, rewriteResultsAtPath } from './ast';

interface IRewriterMatch {
  rewriter: Rewriter;
  path: ReadonlyArray<string>;
}

export class GraphqlQueryRewriteHandler {
  private rewriters: Rewriter[];
  private matches: IRewriterMatch[] = [];
  private hasProcessedRequest: boolean = false;
  private hasProcessedResponse: boolean = false;

  constructor(rewriters: Rewriter[]) {
    this.rewriters = rewriters;
  }

  rewriteRequest(query: string, variables?: Variables) {
    if (this.hasProcessedRequest) throw new Error('This handler has already rewritten a request');
    this.hasProcessedRequest = true;
    const doc = parse(query);
    let rewrittenVariables = variables;
    const rewrittenDoc = rewriteDoc(doc, (nodeAndVars, parents) => {
      let rewrittenNodeAndVars = nodeAndVars;
      this.rewriters.forEach(rewriter => {
        const isMatch = rewriter.matches(nodeAndVars, parents);
        if (isMatch) {
          rewrittenVariables = rewriter.rewriteVariables(rewrittenNodeAndVars, rewrittenVariables);
          rewrittenNodeAndVars = rewriter.rewriteQuery(rewrittenNodeAndVars);
          this.matches.push({
            rewriter,
            path: extractPath([...parents, rewrittenNodeAndVars.node])
          });
        }
        return isMatch;
      });
      return rewrittenNodeAndVars;
    });

    return { query: print(rewrittenDoc), variables: rewrittenVariables };
  }

  rewriteResponse(response: any) {
    if (this.hasProcessedResponse) throw new Error('This handler has already returned a response');
    this.hasProcessedResponse = true;
    let rewrittenResponse = response;
    this.matches.reverse().forEach(({ rewriter, path }) => {
      rewrittenResponse = rewriteResultsAtPath(rewrittenResponse, path, responseAtPath =>
        rewriter.rewriteResponse(responseAtPath)
      );
    });
    return rewrittenResponse;
  }
}
