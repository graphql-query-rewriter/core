import {
  ArgumentNode,
  ASTNode,
  FieldNode,
  isValueNode,
  Kind,
  parseType,
  TypeNode,
  ValueNode,
  VariableNode
} from 'graphql';
import Maybe from 'graphql/tsutils/Maybe';
import { NodeAndVarDefs, nodesMatch } from '../ast';
import { identifyFunc } from '../utils';
import Rewriter, { RewriterOpts, Variables } from './Rewriter';

interface FieldArgTypeRewriterOpts extends RewriterOpts {
  argName: string;
  oldType: string;
  newType: string;
  coerceVariable?: (variable: any, context: { variables: Variables; args: ArgumentNode[] }) => any;
  /**
   * EXPERIMENTAL:
   *  This allows to coerce value of argument when their value is not stored in a variable
   *  but comes in the query node itself.
   *  NOTE: At the moment, the user has to return the ast value node herself.
   */
  coerceArgumentValue?: (
    variable: any,
    context: { variables: Variables; args: ArgumentNode[] }
  ) => Maybe<ValueNode>;
}

/**
 * Rewriter which replaces the type of a single argument of a field
 * ex: change from id: String! to id: ID!
 */
class FieldArgTypeRewriter extends Rewriter {
  protected argName: string;
  protected oldTypeNode: TypeNode;
  protected newTypeNode: TypeNode;
  // Passes context with rest of arguments and variables.
  // Quite useful for variable coercion that depends on other arguments/variables
  // (e.g., [offset, limit] to [pageSize, pageNumber] coercion)
  protected coerceVariable: (
    variable: any,
    context: { variables: Variables; args: ArgumentNode[] }
  ) => any;
  // (Experimental): Used to coerce arguments whose value
  // does not come in a variable.
  protected coerceArgumentValue: (
    variable: any,
    context: { variables: Variables; args: ArgumentNode[] }
  ) => Maybe<ValueNode>;

  constructor(options: FieldArgTypeRewriterOpts) {
    super(options);
    this.argName = options.argName;
    this.oldTypeNode = parseType(options.oldType);
    this.newTypeNode = parseType(options.newType);
    this.coerceVariable = options.coerceVariable || identifyFunc;
    this.coerceArgumentValue = options.coerceArgumentValue || identifyFunc;
  }

  public matches(nodeAndVars: NodeAndVarDefs, parents: ASTNode[]) {
    if (!super.matches(nodeAndVars, parents)) return false;
    const node = nodeAndVars.node as FieldNode;
    const { variableDefinitions } = nodeAndVars;
    // is this a field with the correct fieldName and arguments?
    if (node.kind !== 'Field') return false;

    // does this field contain arguments?
    if (!node.arguments) return false;

    // is there an argument with the correct name and type in a variable?
    const matchingArgument = node.arguments.find(arg => arg.name.value === this.argName);

    if (!matchingArgument) return false;

    // argument value is stored in a variable
    if (matchingArgument.value.kind === 'Variable') {
      const varRef = matchingArgument.value.name.value;
      // does the referenced variable have the correct type?
      for (const varDefinition of variableDefinitions) {
        if (varDefinition.variable.name.value === varRef) {
          return nodesMatch(this.oldTypeNode, varDefinition.type);
        }
      }
    }
    // argument value comes in query doc.
    else {
      const argValueNode = matchingArgument.value;
      return isValueNode(argValueNode);
      // Would be ideal to do a nodesMatch in here, however argument value nodes
      // have different format for their values than when passed as variables.
      // For instance, are parsed with Kinds as "graphql.Kind" (e.g., INT="IntValue") and not "graphql.TokenKinds" (e.g., INT="Int")
      // So they might not match correctly. Also they dont contain additional parsed syntax
      // as the non-optional symbol "!". So just return true if the argument.value is a ValueNode.
      //
      // return nodesMatch(this.oldTypeNode, parseType(argRef.kind));
    }

    return false;
  }

  public rewriteQuery(
    { node: astNode, variableDefinitions }: NodeAndVarDefs,
    variables: Variables
  ) {
    const node = astNode as FieldNode;
    const varRefName = this.extractMatchingVarRefName(node);
    // If argument value is stored in a variable
    if (varRefName) {
      const newVarDefs = variableDefinitions.map(varDef => {
        if (varDef.variable.name.value !== varRefName) return varDef;
        return { ...varDef, type: this.newTypeNode };
      });
      return { node, variableDefinitions: newVarDefs };
    }
    // If argument value is not stored in a variable but in the query node.
    const matchingArgument = (node.arguments || []).find(arg => arg.name.value === this.argName);
    if (node.arguments && matchingArgument) {
      const args = [...node.arguments];
      const newValue = this.coerceArgumentValue(matchingArgument.value, { variables, args });
      /**
       * TODO: If somewhow we can get the schema here, we could make the coerceArgumentValue
       * even easier, as we would be able to construct the ast node for the argument value.
       * as of now, the user has to take care of correctly constructing the argument value ast node herself.
       *
       * const schema = makeExecutableSchema({typeDefs})
       * const myCustomType = schema.getType("MY_CUSTOM_TYPE_NAME")
       * const newArgValue = astFromValue(newValue, myCustomType)
       * Object.assign(matchingArgument, { value: newArgValue })
       */
      if (newValue) Object.assign(matchingArgument, { value: newValue });
    }
    return { node, variableDefinitions };
  }

  public rewriteVariables({ node: astNode }: NodeAndVarDefs, variables: Variables) {
    const node = astNode as FieldNode;
    if (!variables) return variables;
    const varRefName = this.extractMatchingVarRefName(node);
    const args = [...(node.arguments ? node.arguments : [])];
    return {
      ...variables,
      ...(varRefName
        ? { [varRefName]: this.coerceVariable(variables[varRefName], { variables, args }) }
        : {})
    };
  }

  private extractMatchingVarRefName(node: FieldNode) {
    const matchingArgument = (node.arguments || []).find(
      arg => arg.name.value === this.argName
    ) as ArgumentNode;
    const variableNode = matchingArgument.value as VariableNode;
    return variableNode.kind === Kind.VARIABLE && variableNode.name.value;
  }
}

export default FieldArgTypeRewriter;
