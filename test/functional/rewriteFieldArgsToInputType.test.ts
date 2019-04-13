import { GraphqlQueryRewriteHandler } from '../../src/graphql-query-rewriter';
import FieldArgsToInputTypeRewriter from '../../src/rewriters/FieldArgsToInputTypeRewriter';
import { gqlFmt } from '../testUtils';

describe('Rewrite field args to input type', () => {
  it('allows nesting the args provided into an input type', () => {
    const handler = new GraphqlQueryRewriteHandler([
      new FieldArgsToInputTypeRewriter({
        fieldName: 'things',
        argNames: ['arg1', 'arg2']
      })
    ]);

    const query = gqlFmt`
      query doTheThings($arg1: ID!, $arg2: Int!) {
        things(arg1: $arg1, arg2: $arg2) {
          cat
        }
      }
    `;
    const expectedRewritenQuery = gqlFmt`
      query doTheThings($arg1: ID!, $arg2: Int!) {
        things(input: {arg1: $arg1, arg2: $arg2}) {
          cat
        }
      }
    `;
    expect(handler.rewriteRequest(query)).toEqual({
      query: expectedRewritenQuery,
      variables: undefined
    });
  });

  it('only nests the args listed, and leaves the others alone', () => {
    const handler = new GraphqlQueryRewriteHandler([
      new FieldArgsToInputTypeRewriter({
        fieldName: 'things',
        argNames: ['arg1', 'arg2']
      })
    ]);

    const query = gqlFmt`
      query doTheThings($arg1: ID!, $arg2: Int!, $arg3: String!) {
        things(arg1: $arg1, arg2: $arg2, arg3: $arg3) {
          cat
        }
      }
    `;
    const expectedRewritenQuery = gqlFmt`
      query doTheThings($arg1: ID!, $arg2: Int!, $arg3: String!) {
        things(arg3: $arg3, input: {arg1: $arg1, arg2: $arg2}) {
          cat
        }
      }
    `;
    expect(handler.rewriteRequest(query)).toEqual({
      query: expectedRewritenQuery,
      variables: undefined
    });
  });

  it('allows setting a custom input field name instead of "input"', () => {
    const handler = new GraphqlQueryRewriteHandler([
      new FieldArgsToInputTypeRewriter({
        fieldName: 'things',
        inputArgName: 'submission',
        argNames: ['arg1', 'arg2']
      })
    ]);

    const query = gqlFmt`
      query doTheThings($arg1: ID!, $arg2: Int!) {
        things(arg1: $arg1, arg2: $arg2) {
          cat
        }
      }
    `;
    const expectedRewritenQuery = gqlFmt`
      query doTheThings($arg1: ID!, $arg2: Int!) {
        things(submission: {arg1: $arg1, arg2: $arg2}) {
          cat
        }
      }
    `;
    expect(handler.rewriteRequest(query)).toEqual({
      query: expectedRewritenQuery,
      variables: undefined
    });
  });

  it('leaves fields alone if there is already an existing input argument', () => {
    const handler = new GraphqlQueryRewriteHandler([
      new FieldArgsToInputTypeRewriter({
        fieldName: 'things',
        argNames: ['arg1', 'arg2']
      })
    ]);

    const query = gqlFmt`
      query doTheThings($arg1: ID!, $arg2: Int!) {
        things(arg1: $arg1, arg2: $arg2, input: {name: "Jim"}) {
          cat
        }
      }
    `;
    const expectedRewritenQuery = query;
    expect(handler.rewriteRequest(query)).toEqual({
      query: expectedRewritenQuery,
      variables: undefined
    });
  });
});
