import RewriteHandler from '../../src/RewriteHandler';
import FieldNameRewriter from '../../src/rewriters/FieldNameRewriter';
import { gqlFmt } from '../testUtils';

describe('Rewrite field name', () => {
  it('allows rewriting the name of a field', () => {
    const handler = new RewriteHandler([
      new FieldNameRewriter({
        fieldName: 'createThing',
        newFieldName: 'thingCreate'
      })
    ]);

    const query = gqlFmt`
      mutation createMyThings {
        createThing {
          myThingId
        }
        otherMutation {
          otherField
        }
      }
    `;
    const expectedRewritenQuery = gqlFmt`
      mutation createMyThings {
        thingCreate {
          myThingId
        }
        otherMutation {
          otherField
        }
      }
    `;
    expect(handler.rewriteRequest(query)).toEqual({
      query: expectedRewritenQuery,
      variables: undefined
    });

    const response = {
      thingCreate: {
        myThingId: 'meh'
      },
      otherMutation: {
        otherField: 18
      }
    };
    const expectedResponse = {
      createThing: {
        myThingId: 'meh'
      },
      otherMutation: {
        otherField: 18
      }
    };
    expect(handler.rewriteResponse(response)).toEqual(expectedResponse);
  });

  it('allows rewriting the name of a field in array', () => {
    const handler = new RewriteHandler([
      new FieldNameRewriter({
        fieldName: 'myThingId',
        newFieldName: 'id'
      })
    ]);

    const query = gqlFmt`
      mutation createMyThings {
        createThings {
          myThingId
        }
      }
    `;
    const expectedRewritenQuery = gqlFmt`
      mutation createMyThings {
        createThings {
          id
        }
      }
    `;
    expect(handler.rewriteRequest(query)).toEqual({
      query: expectedRewritenQuery,
      variables: undefined
    });

    const response = {
      createThings: [
        {
          id: '1'
        }
      ]
    };
    const expectedResponse = {
      createThings: [
        {
          myThingId: '1'
        }
      ]
    };
    expect(handler.rewriteResponse(response)).toEqual(expectedResponse);
  });
});
