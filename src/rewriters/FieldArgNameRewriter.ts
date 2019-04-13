import Rewriter from './Rewriter';
import { FieldNode } from 'graphql';
import { INodeAndVarDefs } from '../ast';

interface IFieldArgNameRewriterOpts {
  fieldName: string;
  oldArgName: string;
  newArgName: string;
}

/**
 * Rewriter which replaces the name of a single argument of a field
 * ex: change from thingID: ID! to thingId: ID!
 */
class FieldArgNameRewriter extends Rewriter {
  protected fieldName: string;
  protected oldArgName: string;
  protected newArgName: string;

  constructor(options: IFieldArgNameRewriterOpts) {
    super();
    this.fieldName = options.fieldName;
    this.oldArgName = options.oldArgName;
    this.newArgName = options.newArgName;
  }

  matches({ node }: INodeAndVarDefs) {
    // is this a field with the correct fieldName and arguments?
    if (node.kind !== 'Field') return false;
    if (node.name.value !== this.fieldName || !node.arguments) return false;
    // is there an argument with the correct name?
    return !!node.arguments.find(arg => arg.name.value === this.oldArgName);
  }

  rewriteQueryRequest({ node, variableDefinitions }: INodeAndVarDefs) {
    const newArguments = ((node as FieldNode).arguments || []).map(argument => {
      if (argument.name.value === this.oldArgName) {
        return { ...argument, name: { ...argument.name, value: this.newArgName } };
      }
      return argument;
    });
    return { node: { ...node, arguments: newArguments }, variableDefinitions } as INodeAndVarDefs;
  }
}

export default FieldArgNameRewriter;
