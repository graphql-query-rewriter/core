import { FieldNode, astFromValue, GraphQLInt, Kind } from 'graphql';
import RewriteHandler from '../../src/RewriteHandler';
import FieldArgTypeRewriter from '../../src/rewriters/FieldArgTypeRewriter';
import { gqlFmt } from '../testUtils';

describe('Rewrite field arg type', () => {
  it('allows rewriting the type of args provided to queries', () => {
    const handler = new RewriteHandler([
      new FieldArgTypeRewriter({
        fieldName: 'things',
        argName: 'identifier',
        oldType: 'String!',
        newType: 'Int!'
      })
    ]);

    const query = gqlFmt`
      query doTheThings($arg1: String!, $arg2: Int!, $arg3: String!) {
        things(identifier: $arg1, otherArg: $arg2) {
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
      query doTheThings($arg1: Int!, $arg2: Int!, $arg3: String!) {
        things(identifier: $arg1, otherArg: $arg2) {
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
      variables: undefined
    });
    const response = {
      things: {
        cat: 'meh',
        dog: [
          {
            catDog: '123'
          }
        ]
      },
      otherThing: {
        otherThingField: 18
      }
    };
    // shouldn't modify the response
    expect(handler.rewriteResponse(response)).toEqual(response);

    // shouldn't allow calling rewrite multiple times
    expect(() => handler.rewriteRequest(query)).toThrow();
    expect(() => handler.rewriteResponse(response)).toThrow();
  });

  it('can be passed a coerceVariable function to change variable values', () => {
    const query = gqlFmt`
      query doTheThings($arg1: String!, $arg2: String) {
        things(identifier: $arg1, arg2: $arg2) {
          cat
        }
      }
    `;
    const expectedRewritenQuery = gqlFmt`
      query doTheThings($arg1: Int!, $arg2: String) {
        things(identifier: $arg1, arg2: $arg2) {
          cat
        }
      }
    `;

    const handler = new RewriteHandler([
      new FieldArgTypeRewriter({
        fieldName: 'things',
        argName: 'identifier',
        oldType: 'String!',
        newType: 'Int!',
        coerceVariable: val => parseInt(val, 10)
      })
    ]);
    expect(handler.rewriteRequest(query, { arg1: '123', arg2: 'blah' })).toEqual({
      query: expectedRewritenQuery,
      variables: {
        arg1: 123,
        arg2: 'blah'
      }
    });
  });

  it('variable coercion comes with additional variables and arguments as context.', () => {
    const query = gqlFmt`
      query doTheThings($arg1: String!, $arg2: String) {
        things(identifier: $arg1, arg2: $arg2, arg3: "blah") {
          cat
        }
      }
    `;
    const expectedRewritenQuery = gqlFmt`
      query doTheThings($arg1: Int!, $arg2: String) {
        things(identifier: $arg1, arg2: $arg2, arg3: "blah") {
          cat
        }
      }
    `;

    const handler = new RewriteHandler([
      new FieldArgTypeRewriter({
        fieldName: 'things',
        argName: 'identifier',
        oldType: 'String!',
        newType: 'Int!',
        coerceVariable: (_, { variables = {}, args }) => {
          expect(args.length).toBe(3);
          expect(args[0].kind).toBe('Argument');
          expect(args[0].value.kind).toBe(Kind.VARIABLE);
          expect(args[1].kind).toBe('Argument');
          expect(args[1].value.kind).toBe(Kind.VARIABLE);
          expect(args[2].kind).toBe('Argument');
          expect(args[2].value.kind).toBe(Kind.STRING);
          const { arg2 = 0 } = variables;
          return parseInt(arg2, 10);
        }
      })
    ]);
    expect(handler.rewriteRequest(query, { arg1: 'someString', arg2: '123' })).toEqual({
      query: expectedRewritenQuery,
      variables: {
        arg1: 123,
        arg2: '123'
      }
    });
  });

  it('can be passed a coerceArgumentValue function to change argument values.', () => {
    const query = gqlFmt`
      query doTheThings {
        things(identifier: "123", arg2: "blah") {
          cat
        }
      }
    `;
    const expectedRewritenQuery = gqlFmt`
      query doTheThings {
        things(identifier: 123, arg2: "blah") {
          cat
        }
      }
    `;

    const handler = new RewriteHandler([
      new FieldArgTypeRewriter({
        fieldName: 'things',
        argName: 'identifier',
        oldType: 'String!',
        newType: 'Int!',
        coerceArgumentValue: argValue => {
          const value = argValue.value;
          const newArgValue = astFromValue(parseInt(value, 10), GraphQLInt);
          return newArgValue;
        }
      })
    ]);

    expect(handler.rewriteRequest(query)).toEqual({
      query: expectedRewritenQuery
    });
  });

  it('should fail if neither a fieldName or matchConditions are provided', () => {
    try {
      new FieldArgTypeRewriter({
        argName: 'identifier',
        oldType: 'String!',
        newType: 'Int!'
      });
    } catch (error) {
      expect(
        error.message.includes('Neither a fieldName or matchConditions were provided')
      ).toEqual(true);
    }
  });

  it('allows matching using matchConditions when fieldName is not provided.', () => {
    const query = gqlFmt`
      query doTheThings($arg1: String!, $arg2: String) {
        things(identifier: $arg1, arg2: $arg2) {
          cat
        }
      }
    `;
    const expectedRewritenQuery = gqlFmt`
      query doTheThings($arg1: Int!, $arg2: String) {
        things(identifier: $arg1, arg2: $arg2) {
          cat
        }
      }
    `;

    // Tests a dummy regex to match the "things" field.
    const fieldNameRegExp = '.hings';

    const handler = new RewriteHandler([
      new FieldArgTypeRewriter({
        argName: 'identifier',
        oldType: 'String!',
        newType: 'Int!',
        matchConditions: [
          nodeAndVars => {
            const node = nodeAndVars.node as FieldNode;
            const {
              name: { value: fieldName }
            } = node;
            return fieldName.search(new RegExp(fieldNameRegExp)) !== -1;
          }
        ],
        coerceVariable: val => parseInt(val, 10)
      })
    ]);
    expect(handler.rewriteRequest(query, { arg1: '123', arg2: 'blah' })).toEqual({
      query: expectedRewritenQuery,
      variables: {
        arg1: 123,
        arg2: 'blah'
      }
    });
  });

  it('works on deeply nested fields', () => {
    const query = gqlFmt`
      query doTheThings($arg1: String!, $arg2: String) {
        stuff {
          things(identifier: $arg1, arg2: $arg2) {
            cat
          }
        }
      }
    `;
    const expectedRewritenQuery = gqlFmt`
      query doTheThings($arg1: Int!, $arg2: String) {
        stuff {
          things(identifier: $arg1, arg2: $arg2) {
            cat
          }
        }
      }
    `;

    const handler = new RewriteHandler([
      new FieldArgTypeRewriter({
        fieldName: 'things',
        argName: 'identifier',
        oldType: 'String!',
        newType: 'Int!',
        coerceVariable: val => parseInt(val, 10)
      })
    ]);
    expect(handler.rewriteRequest(query, { arg1: '123', arg2: 'blah' })).toEqual({
      query: expectedRewritenQuery,
      variables: {
        arg1: 123,
        arg2: 'blah'
      }
    });
  });
});
