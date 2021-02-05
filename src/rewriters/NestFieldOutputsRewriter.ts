import { ASTNode, FieldNode } from 'graphql';
import { NodeAndVarDefs } from '../ast';
import Rewriter, { RewriterOpts } from './Rewriter';

interface NestFieldOutputsRewriterOpts extends RewriterOpts {
  newOutputName: string;
  outputsToNest: string[];
}

/**
 * Rewriter which nests output fields inside of a new output object
 * ex: change from `field { output1, output2 }` to `field { nestedOutputs { output1, output 2 } }`
 */
class NestFieldOutputsRewriter extends Rewriter {
  protected newOutputName: string;
  protected outputsToNest: string[];

  constructor(options: NestFieldOutputsRewriterOpts) {
    super(options);
    this.newOutputName = options.newOutputName;
    this.outputsToNest = options.outputsToNest;
  }

  public matches(nodeAndVars: NodeAndVarDefs, parents: ASTNode[]) {
    if (!super.matches(nodeAndVars, parents)) return false;
    const node = nodeAndVars.node as FieldNode;
    // is this a field with the correct selections?
    if (!node.selectionSet) return false;
    // if `newOutputName` already exists as an output, skip it
    if (
      node.selectionSet.selections.find(
        (output) => output.kind === 'Field' && output.name.value === this.newOutputName
      )
    ) {
      return false;
    }
    // is there an output with a matching name?
    return !!node.selectionSet.selections.find(
      (output) => output.kind === 'Field' && this.outputsToNest.indexOf(output.name.value) >= 0
    );
  }

  public rewriteQuery(nodeAndVarDefs: NodeAndVarDefs) {
    const node = nodeAndVarDefs.node as FieldNode;
    const { variableDefinitions } = nodeAndVarDefs;
    if (!node.selectionSet) return nodeAndVarDefs;
    const outputsToNest = (node.selectionSet.selections || []).filter(
      (output) => output.kind === 'Field' && this.outputsToNest.indexOf(output.name.value) >= 0
    );
    const newOutputs = (node.selectionSet.selections || []).filter(
      (output) => output.kind === 'Field' && this.outputsToNest.indexOf(output.name.value) === -1
    );
    const nestedOutput: FieldNode = {
      kind: 'Field',
      name: { kind: 'Name', value: this.newOutputName },
      selectionSet: {
        kind: 'SelectionSet',
        selections: outputsToNest,
      },
    };
    newOutputs.push(nestedOutput);
    return {
      variableDefinitions,
      node: { ...node, selectionSet: { ...node.selectionSet, selections: newOutputs } },
    } as NodeAndVarDefs;
  }

  public rewriteResponse(response: any, key: string, index?: number) {
    // Extract the element we are working on
    const element = super.extractReponseElement(response, key, index);
    if (element === null || typeof element !== 'object') return response;

    // Undo the nesting in the response so it matches the original query
    if (element[this.newOutputName] && typeof element[this.newOutputName] === 'object') {
      const newElement = { ...element, ...element[this.newOutputName] };
      delete newElement[this.newOutputName];

      return super.rewriteResponseElement(response, newElement, key, index);
    }

    return response;
  }
}

export default NestFieldOutputsRewriter;
