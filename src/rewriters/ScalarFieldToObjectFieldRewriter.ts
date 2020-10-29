import { ASTNode, FieldNode, SelectionSetNode } from 'graphql';
import { NodeAndVarDefs } from '../ast';
import Rewriter, { RewriterOpts } from './Rewriter';

interface ScalarFieldToObjectFieldRewriterOpts extends RewriterOpts {
  objectFieldName: string;
}

/**
 * Rewriter which nests output fields inside of a new output object
 * ex: change from `field { subField }` to `field { subField { objectfield } }`
 */
class ScalarFieldToObjectFieldRewriter extends Rewriter {
  protected objectFieldName: string;

  constructor(options: ScalarFieldToObjectFieldRewriterOpts) {
    super(options);
    this.objectFieldName = options.objectFieldName;
  }

  public matches(nodeAndVars: NodeAndVarDefs, parents: ASTNode[]): boolean {
    if (!super.matches(nodeAndVars, parents)) return false;
    const node = nodeAndVars.node as FieldNode;
    // make sure there's no subselections on this field
    if (node.selectionSet) return false;
    return true;
  }

  public rewriteQuery(nodeAndVarDefs: NodeAndVarDefs) {
    const node = nodeAndVarDefs.node as FieldNode;
    const { variableDefinitions } = nodeAndVarDefs;
    // if there's a subselection already, just return
    if (node.selectionSet) return nodeAndVarDefs;

    const selectionSet: SelectionSetNode = {
      kind: 'SelectionSet',
      selections: [
        {
          kind: 'Field',
          name: { kind: 'Name', value: this.objectFieldName }
        }
      ]
    };

    return {
      variableDefinitions,
      node: { ...node, selectionSet }
    } as NodeAndVarDefs;
  }

  public rewriteResponse(response: any, key: string | number) {
    if (typeof response === 'object') {
      const pathResponse = response[key];

      // undo the nesting in the response so it matches the original query
      return {
        ...response,
        [key]: pathResponse[this.objectFieldName]
      };
    }

    return response;
  }
}

export default ScalarFieldToObjectFieldRewriter;
