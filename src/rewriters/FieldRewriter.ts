import { ASTNode, FieldNode, SelectionSetNode } from 'graphql';
import { NodeAndVarDefs } from '../ast';
import Rewriter, { RewriterOpts } from './Rewriter';

interface FieldRewriterOpts extends RewriterOpts {
  newFieldName?: string;
  objectFieldName?: string;
}

/**
 * More generic version of ScalarFieldToObjectField rewriter
 */
class FieldRewriter extends Rewriter {
  protected newFieldName?: string;
  protected objectFieldName?: string;

  constructor(options: FieldRewriterOpts) {
    super(options);
    this.newFieldName = options.newFieldName;
    this.objectFieldName = options.objectFieldName;
  }

  public matches(nodeAndVars: NodeAndVarDefs, parents: ASTNode[]): boolean {
    if (!super.matches(nodeAndVars, parents)) return false;
    const node = nodeAndVars.node as FieldNode;
    // if there's the intention of converting the field to a subselection
    // make sure there's no subselections on this field
    if (node.selectionSet && !!this.objectFieldName) return false;
    return true;
  }

  public rewriteQuery(nodeAndVarDefs: NodeAndVarDefs) {
    const node = nodeAndVarDefs.node as FieldNode;
    const { variableDefinitions } = nodeAndVarDefs;
    // if there's the intention of converting the field to a subselection
    // and there's a subselection already, just return
    if (node.selectionSet && !!this.objectFieldName) return nodeAndVarDefs;

    // if fieldName is meant to be renamed.
    if (this.newFieldName) {
      Object.assign(node.name, { value: this.newFieldName });
    }

    // if there's the intention of converting the field to a subselection
    // of objectFieldNames
    if (this.objectFieldName) {
      const selectionSet: SelectionSetNode = {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: this.objectFieldName }
          }
        ]
      };
      Object.assign(node, { selectionSet });
    }

    return {
      variableDefinitions,
      node
    } as NodeAndVarDefs;
  }

  public rewriteResponse(response: any, key: string, index?: number) {
    // Extract the element we are working on
    const element = super.extractReponseElement(response, key, index);
    if (element === null) return response;

    let originalKey = key;
    if (key === this.newFieldName) {
      delete response[key];
      if (this.fieldName) originalKey = this.fieldName;
    }
    // Undo the nesting in the response so it matches the original query
    let newElement = element;
    if (this.objectFieldName) {
      newElement = element[this.objectFieldName];
    }
    return super.rewriteResponseElement(response, newElement, originalKey, index);
  }
}

export default FieldRewriter;
