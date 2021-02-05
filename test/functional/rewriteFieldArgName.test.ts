import RewriteHandler from '../../src/RewriteHandler';
import FieldArgNameRewriter from '../../src/rewriters/FieldArgNameRewriter';
import { gqlFmt } from '../testUtils';

describe('Rewrite field arg name', () => {
  it('allows rewriting the name of args provided to queries', () => {
    const handler = new RewriteHandler([
      new FieldArgNameRewriter({
        fieldName: 'things',
        oldArgName: 'otherThingID',
        newArgName: 'otherThingId',
      }),
    ]);

    const query = gqlFmt`
      query doTheThings($arg1: ID!, $arg2: Int!, $arg3: String!) {
        things(otherThingID: $arg1, otherArg: $arg2) {
          cat
          dog {
            catdog
          }
        }
        otherThing(arg3: $arg3) {
          otherThingField
        }
      }
    `;
    const expectedRewritenQuery = gqlFmt`
      query doTheThings($arg1: ID!, $arg2: Int!, $arg3: String!) {
        things(otherThingId: $arg1, otherArg: $arg2) {
          cat
          dog {
            catdog
          }
        }
        otherThing(arg3: $arg3) {
          otherThingField
        }
      }
    `;
    expect(handler.rewriteRequest(query)).toEqual({
      query: expectedRewritenQuery,
      variables: undefined,
    });
  });

  it('works with non-parameterized queries too', () => {
    const handler = new RewriteHandler([
      new FieldArgNameRewriter({
        fieldName: 'things',
        oldArgName: 'otherThingID',
        newArgName: 'otherThingId',
      }),
    ]);

    const query = gqlFmt`
      {
        things(otherThingID: "1234") {
          cat
        }
      }
    `;
    const expectedRewritenQuery = gqlFmt`
      {
        things(otherThingId: "1234") {
          cat
        }
      }
    `;
    expect(handler.rewriteRequest(query)).toEqual({
      query: expectedRewritenQuery,
      variables: undefined,
    });
  });
});
