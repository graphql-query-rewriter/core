import { ASTNode, Kind, NameNode, OperationDefinitionNode } from 'graphql';
import { NodeAndVarDefs } from '../../src/ast';
import RewriteHandler from '../../src/RewriteHandler';
import CustomRewriter from '../../src/rewriters/CustomRewriter';
import { gqlFmt } from '../testUtils';

const matchesFn = ({ node }: NodeAndVarDefs, parents: ReadonlyArray<ASTNode>) => {
  const parent = parents.slice(-1)[0];
  if (node.kind === Kind.SELECTION_SET && parent.kind === Kind.OPERATION_DEFINITION) {
    return true;
  }
  return false;
};

const rewriteQueryFn = (nodeAndVarDefs: any) => {
  const newNode = nodeAndVarDefs.node;
  // Get 'queryObjectFields' so we can add the new queryField later.
  const queryObjectFields = newNode.selections;

  // Find the target field we want to hoist and remove it from its current position.
  const selectionSet = queryObjectFields[0].selectionSet;
  const theThingObjectFields = selectionSet.selections;
  const targetFieldNode = theThingObjectFields.pop();

  // Hoist the target field node.
  queryObjectFields.push(targetFieldNode);
  return { ...nodeAndVarDefs, node: newNode };
};

const rewriteResponseFn = (
  response: any,
  key: string,
  index?: number,
  nodeMatchAndParents?: ASTNode[]
) => {
  // If the key is the query name, then get into the response
  // and retrieve the targetField, then delete it and place it in the
  // desired position.
  if (nodeMatchAndParents) {
    const parentNode = nodeMatchAndParents.slice(-2)[0] as OperationDefinitionNode;
    if (parentNode && parentNode.name) {
      const queryName = parentNode.name.value;
      if (key === queryName) {
        const targetField = response.targetField;
        delete response.targetField;
        Object.assign(response.theThing, { targetField });
      }
    }
  }
  return response;
};

describe('Custom Rewriter, tests for specific rewriters.', () => {
  it('Hoists a target Field Node', () => {
    const handler = new RewriteHandler([
      new CustomRewriter({
        matchesFn,
        rewriteQueryFn,
        rewriteResponseFn,
        includeNonFieldPathsInMatch: true
      })
    ]);

    const query = gqlFmt`
      query getTheThing {
        theThing {
          thingField
          targetField
        }
      }
    `;
    const expectedRewritenQuery = gqlFmt`
      query getTheThing {
        theThing {
          thingField
        }
        targetField
      }
    `;
    expect(handler.rewriteRequest(query)).toEqual({
      query: expectedRewritenQuery
    });

    expect(
      handler.rewriteResponse({
        theThing: {
          thingField: 'thingFieldValue'
        },
        targetField: 'targetValue'
      })
    ).toEqual({
      theThing: {
        thingField: 'thingFieldValue',
        targetField: 'targetValue'
      }
    });
  });
});
