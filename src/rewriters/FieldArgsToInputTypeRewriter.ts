import Rewriter from './Rewriter';
import { FieldNode, ArgumentNode, ObjectFieldNode } from 'graphql';
import { INodeAndVarDefs } from '../ast';

interface IFieldArgsToInputTypeRewriterOpts {
  fieldName: string;
  argNames: string[];
  inputArgName?: string;
}

/**
 * Rewriter which replaces the args to a field with an input type
 * ex: change from field(id: $id, arg2: $arg2) to field(input: { id: $id, arg2: $arg2 })
 */
class FieldArgsToInputTypeRewriter extends Rewriter {
  protected fieldName: string;
  protected argNames: string[];
  protected inputArgName: string = 'input';

  constructor(options: IFieldArgsToInputTypeRewriterOpts) {
    super();
    this.fieldName = options.fieldName;
    this.argNames = options.argNames;
    if (options.inputArgName) this.inputArgName = options.inputArgName;
  }

  matches({ node }: INodeAndVarDefs) {
    // is this a field with the correct fieldName and arguments?
    if (node.kind !== 'Field') return false;
    if (node.name.value !== this.fieldName || !node.arguments) return false;
    // if there's already an input type in this field, skip it
    if (node.arguments.find(arg => arg.name.value === this.inputArgName)) {
      return false;
    }
    // is there an argument with the correct name?
    return !!node.arguments.find(arg => this.argNames.indexOf(arg.name.value) >= 0);
  }

  rewriteQueryRequest({ node, variableDefinitions }: INodeAndVarDefs) {
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
    return { node: { ...node, arguments: newArguments }, variableDefinitions } as INodeAndVarDefs;
  }
}

export default FieldArgsToInputTypeRewriter;
