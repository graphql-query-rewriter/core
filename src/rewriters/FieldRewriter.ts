import { ArgumentNode, ASTNode, FieldNode, SelectionSetNode } from 'graphql';
import { astArgVarNode, NodeAndVarDefs } from '../ast';
import Rewriter, { RewriterOpts, Variables } from './Rewriter';

interface FieldRewriterOpts extends RewriterOpts {
  newFieldName?: string;
  arguments?: string[];
  objectFieldName?: string;
}

/**
 * More generic version of ScalarFieldToObjectField rewriter
 */
class FieldRewriter extends Rewriter {
  protected newFieldName?: string;
  protected arguments?: string[];
  protected objectFieldName?: string;

  constructor(options: FieldRewriterOpts) {
    super(options);
    this.newFieldName = options.newFieldName;
    this.arguments = options.arguments;
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

  public rewriteQuery(nodeAndVarDefs: NodeAndVarDefs, variables: Variables) {
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
    // of objectFieldNames assign SelectionSetNode to the field accordingly.
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

    // If, 1) the field is a SelectionSet,
    // 2) this.arguments is not empty nor undefined, and
    // 3) query comes with variables, then assign ArgumentNodes to the field accordingly.
    if (node.selectionSet && !!this.arguments && variables) {
      // field may already come with some arguments
      const newArguments: ArgumentNode[] = [...(node.arguments || [])];
      this.arguments.forEach(argName => {
        if (
          this.isArgumentInVariables(argName, variables) &&
          !this.isArgumentInArguments(argName, newArguments)
        ) {
          newArguments.push(astArgVarNode(argName));
        }
      });
      if (!!newArguments) Object.assign(node, { arguments: newArguments });
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

  private isArgumentInArguments(argName: string, argumentNodes: ArgumentNode[]) {
    return argumentNodes.map(argNode => argNode.name.value).includes(argName);
  }

  private isArgumentInVariables(argName: string, variables: Variables): boolean {
    if (variables && Object.keys(variables).includes(argName)) return true;
    return false;
  }
}

export default FieldRewriter;
