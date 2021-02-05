import { ASTNode, FieldNode, SelectionSetNode } from 'graphql';
import { NodeAndVarDefs } from '../ast';
import Rewriter, { RewriterOpts } from './Rewriter';

interface ScalarFieldToObjectFieldRewriterOpts extends RewriterOpts {
  objectFieldName: string;
}

/**
 * Rewriter which nests a scalar field inside of a new output object
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
          name: { kind: 'Name', value: this.objectFieldName },
        },
      ],
    };

    return {
      variableDefinitions,
      node: { ...node, selectionSet },
    } as NodeAndVarDefs;
  }

  public rewriteResponse(response: any, key: string, index?: number) {
    // Extract the element we are working on
    const element = super.extractReponseElement(response, key, index);
    if (element === null) return response;

    // Undo the nesting in the response so it matches the original query
    const newElement = element[this.objectFieldName];
    return super.rewriteResponseElement(response, newElement, key, index);
  }
}

export default ScalarFieldToObjectFieldRewriter;
