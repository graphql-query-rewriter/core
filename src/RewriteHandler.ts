import { ASTNode, FragmentDefinitionNode, parse, print } from 'graphql';
import { extractPath, FragmentTracer, rewriteDoc, rewriteResultsAtPath } from './ast';
import Rewriter, { Variables } from './rewriters/Rewriter';

interface RewriterMatch {
  rewriter: Rewriter;
  paths: ReadonlyArray<ReadonlyArray<string>>;
  // TODO:
  // - allPaths hasnt been tested for fragments
  // - Give that allPaths includes non-field paths, there might be paths
  // that don't match to a key in the results object traversed in
  // 'rewriteResultsAtPath'. For now the 'includesNonFieldPaths' flag is passed to
  // this function.
  allPaths: ReadonlyArray<ReadonlyArray<string>>;
  nodeMatchAndParents?: ASTNode[];
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
          rewrittenNodeAndVars = rewriter.rewriteQuery(rewrittenNodeAndVars, rewrittenVariables);
          const fieldPath = extractPath([...parents, rewrittenNodeAndVars.node]);
          const anyPath = extractPath([...parents, rewrittenNodeAndVars.node], true);
          let fieldPaths: ReadonlyArray<ReadonlyArray<string>> = [fieldPath];
          let allPaths: ReadonlyArray<ReadonlyArray<string>> = [anyPath];
          const fragmentDef = parents.find(({ kind }) => kind === 'FragmentDefinition') as
            | FragmentDefinitionNode
            | undefined;
          if (fragmentDef) {
            fieldPaths = fragmentTracer.prependFragmentPaths(fragmentDef.name.value, fieldPath);
            allPaths = fragmentTracer.prependFragmentPaths(fragmentDef.name.value, anyPath);
          }
          this.matches.push({
            rewriter,
            allPaths,
            paths: fieldPaths,
            nodeMatchAndParents: [...parents, rewrittenNodeAndVars.node]
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
    this.matches
      .reverse()
      .forEach(({ rewriter, paths: fieldPaths, allPaths, nodeMatchAndParents }) => {
        const paths = rewriter.includeNonFieldPathsInMatch ? allPaths : fieldPaths;
        paths.forEach(path => {
          rewrittenResponse = rewriteResultsAtPath(
            rewrittenResponse,
            path,
            (parentResponse, key, index) =>
              rewriter.rewriteResponse(parentResponse, key, index, nodeMatchAndParents),
            rewriter.includeNonFieldPathsInMatch
          );
        });
      });
    return rewrittenResponse;
  }
}
