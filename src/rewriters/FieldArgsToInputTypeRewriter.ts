import { ArgumentNode, ASTNode, FieldNode, ObjectFieldNode } from 'graphql';
import { NodeAndVarDefs } from '../ast';
import Rewriter, { RewriterOpts } from './Rewriter';

interface FieldArgsToInputTypeRewriterOpts extends RewriterOpts {
  argNames: string[];
  inputArgName?: string;
}

/**
 * Rewriter which replaces the args to a field with an input type
 * ex: change from field(id: $id, arg2: $arg2) to field(input: { id: $id, arg2: $arg2 })
 */
class FieldArgsToInputTypeRewriter extends Rewriter {
  protected argNames: string[];
  protected inputArgName: string = 'input';

  constructor(options: FieldArgsToInputTypeRewriterOpts) {
    super(options);
    this.fieldName = options.fieldName;
    this.argNames = options.argNames;
    if (options.inputArgName) this.inputArgName = options.inputArgName;
  }

  public matches(nodeAndVars: NodeAndVarDefs, parents: ASTNode[]) {
    if (!super.matches(nodeAndVars, parents)) return false;
    const node = nodeAndVars.node as FieldNode;
    // is this a field with the correct fieldName and arguments?
    if (node.name.value !== this.fieldName || !node.arguments) return false;
    // if there's already an input type in this field, skip it
    if (node.arguments.find(arg => arg.name.value === this.inputArgName)) {
      return false;
    }
    // is there an argument with the correct name?
    return !!node.arguments.find(arg => this.argNames.indexOf(arg.name.value) >= 0);
  }

  public rewriteQuery({ node, variableDefinitions }: NodeAndVarDefs) {
    const argsToNest = ((node as FieldNode).arguments || []).filter(
      argument => this.argNames.indexOf(argument.name.value) >= 0
    );
    const newArguments = ((node as FieldNode).arguments || []).filter(
      argument => this.argNames.indexOf(argument.name.value) === -1
    );
    const inputArgument: ArgumentNode = {
      kind: 'Argument',
      name: { kind: 'Name', value: this.inputArgName },
      value: {
        kind: 'ObjectValue',
        fields: argsToNest.map(
          (arg): ObjectFieldNode => ({
            kind: 'ObjectField',
            name: arg.name,
            value: arg.value
          })
        )
      }
    };
    newArguments.push(inputArgument);
    return { variableDefinitions, node: { ...node, arguments: newArguments } } as NodeAndVarDefs;
  }
}

export default FieldArgsToInputTypeRewriter;
