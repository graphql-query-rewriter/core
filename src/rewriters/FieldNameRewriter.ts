import { ASTNode, FieldNode } from 'graphql';
import Rewriter, { RewriterOpts } from './Rewriter';
import { NodeAndVarDefs } from '../ast';

interface FieldNameRewriterOpts extends RewriterOpts {
  newFieldName: string;
}

export default class FieldNameRewriter extends Rewriter {
  protected newFieldName: string;

  constructor(options: FieldNameRewriterOpts) {
    super(options);
    this.newFieldName = options.newFieldName;
  }

  public matches(nodeAndVars: NodeAndVarDefs, parents: ASTNode[]) {
    if (!super.matches(nodeAndVars, parents)) return false;
    const node = nodeAndVars.node as FieldNode;
    if (node.kind !== 'Field') return false;
    if (node.name.value !== this.fieldName) return false;
    return true;
  }

  public rewriteQuery(nodeAndVarDefs: NodeAndVarDefs): NodeAndVarDefs {
    const node = nodeAndVarDefs.node as FieldNode;
    const { variableDefinitions } = nodeAndVarDefs;
    const updatedNode = {
      ...node,
      name: { kind: 'Name', value: this.newFieldName }
    } as FieldNode;

    return { node: updatedNode, variableDefinitions };
  }

  public rewriteResponse(response: any, key: string, index?: number): any {
    const element = super.extractReponseElement(response, key, index);
    super.rewriteResponseElement(response, element, this.fieldName, index);
    return super.deleteResponseElement(response, this.newFieldName, index);
  }
}
