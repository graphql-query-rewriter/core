import RewriteHandler from '../../src/RewriteHandler';
import ScalarFieldToObjectFieldRewriter from '../../src/rewriters/ScalarFieldToObjectFieldRewriter';
import { gqlFmt } from '../testUtils';

describe('Rewrite scalar field to be a nested object with a single scalar field', () => {
  it('rewrites a scalar field to be an object field with 1 scalar subfield', () => {
    const handler = new RewriteHandler([
      new ScalarFieldToObjectFieldRewriter({
        fieldName: 'title',
        objectFieldName: 'text'
      })
    ]);

    const query = gqlFmt`
      query getTheThing {
        theThing {
          thingField {
            id
            title
            color
          }
        }
      }
    `;
    const expectedRewritenQuery = gqlFmt`
      query getTheThing {
        theThing {
          thingField {
            id
            title {
              text
            }
            color
          }
        }
      }
    `;
    expect(handler.rewriteRequest(query)).toEqual({
      query: expectedRewritenQuery
    });
    expect(
      handler.rewriteResponse({
        theThing: {
          thingField: {
            id: 1,
            title: {
              text: 'THING'
            },
            color: 'blue'
          }
        }
      })
    ).toEqual({
      theThing: {
        thingField: {
          id: 1,
          title: 'THING',
          color: 'blue'
        }
      }
    });
  });

  it('works with fragments', () => {
    const handler = new RewriteHandler([
      new ScalarFieldToObjectFieldRewriter({
        fieldName: 'title',
        objectFieldName: 'text'
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
        title
      }
    `;
    const expectedRewritenQuery = gqlFmt`
      query getTheThing {
        theThing {
          ...thingFragment
        }
      }

      fragment thingFragment on Thing {
        id
        title {
          text
        }
      }
    `;
    expect(handler.rewriteRequest(query)).toEqual({
      query: expectedRewritenQuery
    });
    expect(
      handler.rewriteResponse({
        theThing: {
          id: 1,
          title: {
            text: 'THING'
          }
        }
      })
    ).toEqual({
      theThing: {
        id: 1,
        title: 'THING'
      }
    });
  });

  it('works within repeated and nested fragments', () => {
    const handler = new RewriteHandler([
      new ScalarFieldToObjectFieldRewriter({
        fieldName: 'title',
        objectFieldName: 'text'
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
        title
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
        title {
          text
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
    expect(
      handler.rewriteResponse({
        theThing: {
          id: 1,
          title: {
            text: 'THING'
          }
        },
        otherThing: {
          id: 3,
          edges: [
            {
              node: {
                title: {
                  text: 'NODE_TEXT1'
                }
              }
            },
            {
              node: {
                title: {
                  text: 'NODE_TEXT2'
                }
              }
            }
          ]
        }
      })
    ).toEqual({
      theThing: {
        id: 1,
        title: 'THING'
      },
      otherThing: {
        id: 3,
        edges: [
          {
            node: {
              title: 'NODE_TEXT1'
            }
          },
          {
            node: {
              title: 'NODE_TEXT2'
            }
          }
        ]
      }
    });
  });

  it('rewrites a scalar field array to be an array of object fields with 1 scalar subfield', () => {
    const handler = new RewriteHandler([
      new ScalarFieldToObjectFieldRewriter({
        fieldName: 'titles',
        objectFieldName: 'text'
      })
    ]);

    const query = gqlFmt`
      query getThing {
        thing {
          titles
        }
      }
    `;
    const expectedRewritenQuery = gqlFmt`
      query getThing {
        thing {
          titles {
            text
          }
        }
      }
    `;
    expect(handler.rewriteRequest(query)).toEqual({
      query: expectedRewritenQuery
    });
    expect(
      handler.rewriteResponse({
        thing: {
          titles: [
            {
              text: 'THING'
            }
          ]
        }
      })
    ).toEqual({
      thing: {
        titles: ['THING']
      }
    });
  });
});
