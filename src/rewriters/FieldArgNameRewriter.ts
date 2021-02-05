import { ASTNode, FieldNode } from 'graphql';
import { NodeAndVarDefs } from '../ast';
import Rewriter, { RewriterOpts } from './Rewriter';

interface IFieldArgNameRewriterOpts extends RewriterOpts {
  oldArgName: string;
  newArgName: string;
}

/**
 * Rewriter which replaces the name of a single argument of a field
 * ex: change from thingID: ID! to thingId: ID!
 */
class FieldArgNameRewriter extends Rewriter {
  protected oldArgName: string;
  protected newArgName: string;

  constructor(options: IFieldArgNameRewriterOpts) {
    super(options);
    this.oldArgName = options.oldArgName;
    this.newArgName = options.newArgName;
  }

  public matches(nodeAndVars: NodeAndVarDefs, parents: ASTNode[]) {
    if (!super.matches(nodeAndVars, parents)) return false;
    const node = nodeAndVars.node as FieldNode;
    // is this a field with the correct arguments?
    if (!node.arguments) return false;
    // is there an argument with the correct name?
    return !!node.arguments.find((arg) => arg.name.value === this.oldArgName);
  }

  public rewriteQuery({ node, variableDefinitions }: NodeAndVarDefs) {
    const newArguments = ((node as FieldNode).arguments || []).map((argument) => {
      if (argument.name.value === this.oldArgName) {
        return { ...argument, name: { ...argument.name, value: this.newArgName } };
      }
      return argument;
    });
    return { variableDefinitions, node: { ...node, arguments: newArguments } } as NodeAndVarDefs;
  }
}

export default FieldArgNameRewriter;
