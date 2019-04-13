import Rewriter, { IVariables } from './Rewriter';
import { FieldNode, ArgumentNode, ObjectFieldNode, SelectionNode } from 'graphql';
import { INodeAndVarDefs } from '../ast';

interface INestFieldOutputsRewriterOpts {
  fieldName: string;
  newOutputName: string;
  outputsToNest: string[];
}

/**
 * Rewriter which nests output fields inside of a new output object
 * ex: change from `field { output1, output2 }` to `field { nestedOutputs { output1, output 2 } }`
 */
class NestFieldOutputsRewriter extends Rewriter {
  protected fieldName: string;
  protected newOutputName: string;
  protected outputsToNest: string[];

  constructor(options: INestFieldOutputsRewriterOpts) {
    super();
    this.fieldName = options.fieldName;
    this.newOutputName = options.newOutputName;
    this.outputsToNest = options.outputsToNest;
  }

  matches({ node }: INodeAndVarDefs) {
    // is this a field with the correct fieldName and selections?
    if (node.kind !== 'Field') return false;
    if (node.name.value !== this.fieldName || !node.selectionSet) return false;
    // if `newOutputName` already exists as an output, skip it
    if (
      node.selectionSet.selections.find(
        output => output.kind === 'Field' && output.name.value === this.newOutputName
      )
    ) {
      return false;
    }
    // is there an output with a matching name?
    return !!node.selectionSet.selections.find(
      output => output.kind === 'Field' && this.outputsToNest.indexOf(output.name.value) >= 0
    );
  }

  rewriteQueryRequest(nodeAndVarDefs: INodeAndVarDefs) {
    const node = nodeAndVarDefs.node as FieldNode;
    const { variableDefinitions } = nodeAndVarDefs;
    if (!node.selectionSet) return nodeAndVarDefs;
    const outputsToNest = (node.selectionSet.selections || []).filter(
      output => output.kind === 'Field' && this.outputsToNest.indexOf(output.name.value) >= 0
    );
    const newOutputs = (node.selectionSet.selections || []).filter(
      output => output.kind === 'Field' && this.outputsToNest.indexOf(output.name.value) === -1
    );
    const nestedOutput: FieldNode = {
      kind: 'Field',
      name: { kind: 'Name', value: this.newOutputName },
      selectionSet: {
        kind: 'SelectionSet',
        selections: outputsToNest
      }
    };
    newOutputs.push(nestedOutput);
    return {
      node: { ...node, selectionSet: { ...node.selectionSet, selections: newOutputs } },
      variableDefinitions
    } as INodeAndVarDefs;
  }

  rewriteQueryResponse(response: any) {
    if (typeof response === 'object') {
      // undo the nesting in the response so it matches the original query
      if (response[this.newOutputName] && typeof response[this.newOutputName] === 'object') {
        const rewrittenResponse = { ...response, ...response[this.newOutputName] };
        delete rewrittenResponse[this.newOutputName];
        return rewrittenResponse;
      }
    }
    return response;
  }
}

export default NestFieldOutputsRewriter;
