import Rewriter, { IVariables } from './Rewriter';
import { ASTNode, parseType, VariableDefinitionNode } from 'graphql';
import { nodesMatch, INodeContext } from '../ast';
import { identifyFunc } from '../utils';

interface IFieldArgTypeRewriterOpts {
  fieldName: string;
  argName: string;
  oldType: string;
  newType: string;
  coerceVariable?: (variable: any) => any;
}

class FieldArgTypeRewriter extends Rewriter {
  protected fieldName: string;
  protected argName: string;
  protected oldTypeNode: ASTNode;
  protected newTypeNode: ASTNode;
  protected coerceVariable: (variable: any) => any;

  constructor(options: IFieldArgTypeRewriterOpts) {
    super();
    this.fieldName = options.fieldName;
    this.argName = options.argName;
    this.oldTypeNode = parseType(options.oldType);
    this.newTypeNode = parseType(options.newType);
    this.coerceVariable = options.coerceVariable || identifyFunc;
  }

  matches(node: ASTNode, { parents, variableMap }: INodeContext) {
    if (parents.length === 0) return false;
    if (node.kind !== 'VariableDefinition') return false;
    if (!nodesMatch(node.type, this.oldTypeNode)) return false;

    const argRefs = variableMap[node.variable.name.value];
    for (const argRef of argRefs) {
      const argParents = argRef.parents;
      const argNode = argRef.node;
      if (argParents.length > 0) {
        const parent = argParents[0];
        if (
          argNode.name.value === this.argName &&
          parent.kind === 'Field' &&
          parent.name.value === this.fieldName
        ) {
          return true;
        }
      }
    }
    return false;
  }

  rewriteQueryRequest(node: ASTNode) {
    return { ...node, type: { ...this.newTypeNode } } as VariableDefinitionNode;
  }

  rewriteQueryVariables(node: ASTNode, _ctx: INodeContext, variables: IVariables) {
    if (!variables) return variables;
    const varName = (node as VariableDefinitionNode).variable.name.value;
    return { ...variables, [varName]: this.coerceVariable(variables[varName]) };
  }
}

export default FieldArgTypeRewriter;
