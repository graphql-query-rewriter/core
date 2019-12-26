import RewriteHandler from '../../src/RewriteHandler';
import JsonToTypedObjectRewriter from '../../src/rewriters/JsonToTypedObjectRewriter';
import { gqlFmt } from '../testUtils';

describe('Rewrite query for GraphQLJSON field to be a query for a nested object with multiple scalar and/or object types', () => {
  it('rewrites a GraphQLJSON field query to be an object field query with multiple scalar subfields', () => {
    const handler = new RewriteHandler([
      new JsonToTypedObjectRewriter({
        fieldName: 'thingJSON',
        objectFields: [{ name: 'title' }, { name: 'description' }]
      })
    ]);

    const query = gqlFmt`
      query getTheThing {
        theThing {
          thingField {
            id
            thingJSON
            color
          }
        }
      }
    `;
    const expectedRewrittenQuery = gqlFmt`
      query getTheThing {
        theThing {
          thingField {
            id
            thingJSON {
              title
              description
            }
            color
          }
        }
      }
    `;

    expect(handler.rewriteRequest(query)).toEqual({
      query: expectedRewrittenQuery
    });
  });

  it('rewrites a GraphQLJSON field query to be an object field query with multiple nested object types and subfields', () => {
    const handler = new RewriteHandler([
      new JsonToTypedObjectRewriter({
        fieldName: 'thingJSON',
        objectFields: [
          {
            name: 'user',
            subFields: [
              { name: 'userId' },
              { name: 'userHandle' },
              {
                name: 'item',
                subFields: [{ name: 'itemMeta' }]
              }
            ]
          }
        ]
      })
    ]);

    const query = gqlFmt`
      query getTheThing {
        theThing {
          thingField {
            id
            thingJSON
            color
          }
        }
      }
    `;
    const expectedRewrittenQuery = gqlFmt`
      query getTheThing {
        theThing {
          thingField {
            id
            thingJSON {
              user {
                userId
                userHandle
                item {
                  itemMeta
                }
              }
            }
            color
          }
        }
      }
    `;

    expect(handler.rewriteRequest(query)).toEqual({
      query: expectedRewrittenQuery
    });
  });

  it('works with fragments', () => {
    const handler = new RewriteHandler([
      new JsonToTypedObjectRewriter({
        fieldName: 'thingJSON',
        objectFields: [{ name: 'title' }, { name: 'description' }]
      })
    ]);

    const query = gqlFmt`
      query getTheThing {
        theThing {
          ...thingFragment
        }
      }

      fragment thingFragment on Thing {
        id
        thingJSON
      }
    `;
    const expectedRewrittenQuery = gqlFmt`
      query getTheThing {
        theThing {
          ...thingFragment
        }
      }

      fragment thingFragment on Thing {
        id
        thingJSON {
          title
          description
        }
      }
    `;

    expect(handler.rewriteRequest(query)).toEqual({
      query: expectedRewrittenQuery
    });
  });

  it('works within repeated and nested fragments', () => {
    const handler = new RewriteHandler([
      new JsonToTypedObjectRewriter({
        fieldName: 'thingJSON',
        objectFields: [
          {
            name: 'user',
            subFields: [
              { name: 'userId' },
              { name: 'userHandle' },
              {
                name: 'item',
                subFields: [{ name: 'itemMeta' }]
              }
            ]
          }
        ]
      })
    ]);

    const query = gqlFmt`
      query getTheThing {
        theThing {
          ...thingFragment
        }
        otherThing {
          ...otherThingFragment
        }
      }

      fragment thingFragment on Thing {
        id
        thingJSON
      }

      fragment otherThingFragment on Thing {
        id
        edges {
          node {
            ...thingFragment
          }
        }
      }
    `;
    const expectedRewritenQuery = gqlFmt`
      query getTheThing {
        theThing {
          ...thingFragment
        }
        otherThing {
          ...otherThingFragment
        }
      }

      fragment thingFragment on Thing {
        id
        thingJSON {
          user {
            userId
            userHandle
            item {
              itemMeta
            }
          }
        }
      }

      fragment otherThingFragment on Thing {
        id
        edges {
          node {
            ...thingFragment
          }
        }
      }
    `;

    expect(handler.rewriteRequest(query)).toEqual({
      query: expectedRewritenQuery
    });
  });
});
