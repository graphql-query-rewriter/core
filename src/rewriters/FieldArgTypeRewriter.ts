import Rewriter, { Variables, RewriterOpts } from './Rewriter';
import { ASTNode, parseType, FieldNode, ArgumentNode, VariableNode, TypeNode } from 'graphql';
import { nodesMatch, NodeAndVarDefs } from '../ast';
import { identifyFunc } from '../utils';

interface FieldArgTypeRewriterOpts extends RewriterOpts {
  argName: string;
  oldType: string;
  newType: string;
  coerceVariable?: (variable: any) => any;
}

/**
 * Rewriter which replaces the type of a single argument of a field
 * ex: change from id: String! to id: ID!
 */
class FieldArgTypeRewriter extends Rewriter {
  protected argName: string;
  protected oldTypeNode: TypeNode;
  protected newTypeNode: TypeNode;
  protected coerceVariable: (variable: any) => any;

  constructor(options: FieldArgTypeRewriterOpts) {
    super(options);
    this.argName = options.argName;
    this.oldTypeNode = parseType(options.oldType);
    this.newTypeNode = parseType(options.newType);
    this.coerceVariable = options.coerceVariable || identifyFunc;
  }

  matches(nodeAndVars: NodeAndVarDefs, parents: ASTNode[]) {
    if (!super.matches(nodeAndVars, parents)) return false;
    const node = nodeAndVars.node as FieldNode;
    const { variableDefinitions } = nodeAndVars;
    // is this a field with the correct fieldName and arguments?
    if (node.kind !== 'Field') return false;
    if (node.name.value !== this.fieldName || !node.arguments) return false;
    // is there an argument with the correct name and type in a variable?
    const matchingArgument = node.arguments.find(arg => arg.name.value === this.argName);
    if (!matchingArgument || matchingArgument.value.kind !== 'Variable') return false;
    const varRef = matchingArgument.value.name.value;

    // does the referenced variable have the correct type?
    for (const varDefinition of variableDefinitions) {
      if (varDefinition.variable.name.value === varRef) {
        return nodesMatch(this.oldTypeNode, varDefinition.type);
      }
    }
    return false;
  }

  rewriteQuery({ node, variableDefinitions }: NodeAndVarDefs) {
    const varRefName = this.extractMatchingVarRefName(node as FieldNode);
    const newVarDefs = variableDefinitions.map(varDef => {
      if (varDef.variable.name.value !== varRefName) return varDef;
      return { ...varDef, type: this.newTypeNode };
    });
    return { node, variableDefinitions: newVarDefs };
  }

  rewriteVariables({ node }: NodeAndVarDefs, variables: Variables) {
    if (!variables) return variables;
    const varRefName = this.extractMatchingVarRefName(node as FieldNode);
    return { ...variables, [varRefName]: this.coerceVariable(variables[varRefName]) };
  }

  private extractMatchingVarRefName(node: FieldNode) {
    const matchingArgument = (node.arguments || []).find(arg => arg.name.value === this.argName);
    return ((matchingArgument as ArgumentNode).value as VariableNode).name.value;
  }
}

export default FieldArgTypeRewriter;
