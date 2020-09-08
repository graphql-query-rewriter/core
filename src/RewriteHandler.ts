import { FragmentDefinitionNode, parse, print } from 'graphql';
import { extractPath, FragmentTracer, rewriteDoc, rewriteResultsAtPath } from './ast';
import Rewriter, { Variables } from './rewriters/Rewriter';

interface RewriterMatch {
  rewriter: Rewriter;
  paths: ReadonlyArray<ReadonlyArray<string>>;
}

/**
 * Create a new instance of this class for each request that needs to be processed
 * This class handles rewriting the query and the reponse according to the rewriters passed in
 */
export default class RewriteHandler {
  public matches: RewriterMatch[] = [];

  private rewriters: Rewriter[];
  private hasProcessedRequest: boolean = false;
  private hasProcessedResponse: boolean = false;

  constructor(rewriters: Rewriter[]) {
    this.rewriters = rewriters;
  }

  /**
   * Call this on a graphQL request in middleware before passing on to the real graphql processor
   * @param query The graphQL query
   * @param variables The variables map for the graphQL query
   */
  public rewriteRequest(query: string, variables?: Variables) {
    if (this.hasProcessedRequest) throw new Error('This handler has already rewritten a request');
    this.hasProcessedRequest = true;
    const doc = parse(query);
    const fragmentTracer = new FragmentTracer(doc);
    let rewrittenVariables = variables;
    const rewrittenDoc = rewriteDoc(doc, (nodeAndVars, parents) => {
      let rewrittenNodeAndVars = nodeAndVars;
      this.rewriters.forEach(rewriter => {
        const isMatch = rewriter.matches(nodeAndVars, parents);
        if (isMatch) {
          rewrittenVariables = rewriter.rewriteVariables(rewrittenNodeAndVars, rewrittenVariables);
          rewrittenNodeAndVars = rewriter.rewriteQuery(rewrittenNodeAndVars);
          const simplePath = extractPath([...parents, rewrittenNodeAndVars.node]);
          let paths: ReadonlyArray<ReadonlyArray<string>> = [simplePath];
          const fragmentDef = parents.find(({ kind }) => kind === 'FragmentDefinition') as
            | FragmentDefinitionNode
            | undefined;
          if (fragmentDef) {
            paths = fragmentTracer.prependFragmentPaths(fragmentDef.name.value, simplePath);
          }
          this.matches.push({
            rewriter,
            paths
          });
        }
        return isMatch;
      });
      return rewrittenNodeAndVars;
    });

    return { query: print(rewrittenDoc), variables: rewrittenVariables };
  }

  /**
   * Call this on the response returned from graphQL before passing it back to the client
   * This will change the output to match what the original query requires
   * @param response The graphQL response object
   */
  public rewriteResponse(response: any) {
    if (this.hasProcessedResponse) throw new Error('This handler has already returned a response');
    this.hasProcessedResponse = true;
    let rewrittenResponse = response;
    this.matches.reverse().forEach(({ rewriter, paths }) => {
      paths.forEach(path => {
        rewrittenResponse = rewriteResultsAtPath(rewrittenResponse, path, (parentResponse, key) =>
          rewriter.rewriteResponse(parentResponse, key)
        );
      });
    });
    return rewrittenResponse;
  }
}
