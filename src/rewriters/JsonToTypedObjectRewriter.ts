import { ASTNode, FieldNode, SelectionSetNode } from 'graphql';
import { NodeAndVarDefs } from '../ast';
import Rewriter, { RewriterOpts } from './Rewriter';

interface ObjectField {
  name: string;
  subfields?: ObjectField[];
}

interface JsonToTypedObjectRewriterOpts extends RewriterOpts {
  objectFields: ObjectField[];
}

export default class JsonToTypedObjectRewriter extends Rewriter {
  protected objectFields: ObjectField[];

  constructor({ fieldName, objectFields }: JsonToTypedObjectRewriterOpts) {
    super({ fieldName });
    this.objectFields = objectFields;
  }

  public matches(nodeAndVars: NodeAndVarDefs, parents: ASTNode[]): boolean {
    if (!super.matches(nodeAndVars, parents)) return false;
    const node = nodeAndVars.node as FieldNode;
    // make sure there's no subselections on this field
    if (node.selectionSet) return false;
    return true;
  }

  public rewriteQuery(nodeAndVarDefs: NodeAndVarDefs): NodeAndVarDefs {
    const node = nodeAndVarDefs.node as FieldNode;
    const { variableDefinitions } = nodeAndVarDefs;
    // if there's a subselection already, just return
    if (node.selectionSet) return nodeAndVarDefs;

    const selectionSet = this.generateSelectionSet(this.objectFields);

    return {
      variableDefinitions,
      node: { ...node, selectionSet }
    } as NodeAndVarDefs;
  }

  private generateSelectionSet(fields: ObjectField[]): SelectionSetNode {
    return {
      kind: 'SelectionSet',
      selections: fields.map(({ name, subfields }) => ({
        kind: 'Field',
        name: { kind: 'Name', value: name },
        ...(subfields && {
          selectionSet: this.generateSelectionSet(subfields)
        })
      }))
    } as SelectionSetNode;
  }
}
