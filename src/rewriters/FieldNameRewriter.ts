import { ASTNode, FieldNode } from 'graphql';
import { NodeAndVarDefs } from '../ast';
import Rewriter, { RewriterOpts } from './Rewriter';

interface IFieldNameRewriterOpts extends RewriterOpts {
  newFieldName: string;
}

export default class FieldNameRewriter extends Rewriter {
  protected newFieldName: string;

  constructor(options: IFieldNameRewriterOpts) {
    super(options);
    this.newFieldName = options.newFieldName;
  }

  public rewriteQuery(nodeAndVarDefs: NodeAndVarDefs): NodeAndVarDefs {
    const node = nodeAndVarDefs.node as FieldNode;
    const { variableDefinitions } = nodeAndVarDefs;
    const updatedNode = {
      ...node,
      name: { kind: 'Name', value: this.newFieldName }
    } as FieldNode;

    return { variableDefinitions, node: updatedNode };
  }
}
