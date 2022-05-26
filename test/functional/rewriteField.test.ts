import RewriteHandler from '../../src/RewriteHandler';
import FieldRewriter from '../../src/rewriters/FieldRewriter';
import { gqlFmt } from '../testUtils';

describe('Rewrite scalar field to be a nested object with a single scalar field', () => {
  it('rewrites a scalar field to be an object field with 1 scalar subfield', () => {
    const handler = new RewriteHandler([
      new FieldRewriter({
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

  it('rewrites a scalar field to be a renamed object field with 1 scalar subfield', () => {
    const handler = new RewriteHandler([
      new FieldRewriter({
        fieldName: 'subField',
        newFieldName: 'renamedSubField',
        objectFieldName: 'value'
      })
    ]);

    const query = gqlFmt`
      query getTheThing {
        theThing {
          thingField {
            id
            subField
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
            renamedSubField {
              value
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
            renamedSubField: {
              value: 'THING'
            },
            color: 'blue'
          }
        }
      })
    ).toEqual({
      theThing: {
        thingField: {
          id: 1,
          subField: 'THING',
          color: 'blue'
        }
      }
    });
  });

  it('rewrites a scalar field to be a renamed object field with variable arguments and with 1 scalar subfield', () => {
    const handler = new RewriteHandler([
      new FieldRewriter({
        fieldName: 'subField',
        newFieldName: 'renamedSubField',
        arguments: ['arg1'],
        objectFieldName: 'value'
      })
    ]);

    const query = gqlFmt`
      query getTheThing($arg1: String) {
        theThing {
          thingField {
            id
            subField
            color
          }
        }
      }
    `;
    const expectedRewritenQuery = gqlFmt`
      query getTheThing($arg1: String) {
        theThing {
          thingField {
            id
            renamedSubField(arg1: $arg1) {
              value
            }
            color
          }
        }
      }
    `;
    expect(handler.rewriteRequest(query, { arg1: 'thingArg' })).toEqual({
      query: expectedRewritenQuery,
      variables: { arg1: 'thingArg' }
    });
    expect(
      handler.rewriteResponse({
        theThing: {
          thingField: {
            id: 1,
            renamedSubField: {
              value: 'THING'
            },
            color: 'blue'
          }
        }
      })
    ).toEqual({
      theThing: {
        thingField: {
          id: 1,
          subField: 'THING',
          color: 'blue'
        }
      }
    });
  });

  it('renames a field', () => {
    const handler = new RewriteHandler([
      new FieldRewriter({
        fieldName: 'subField',
        newFieldName: 'renamedSubField'
      })
    ]);

    const query = gqlFmt`
      query getTheThing {
        theThing {
          thingField {
            id
            subField {
              value
            }
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
            renamedSubField {
              value
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
            renamedSubField: {
              value: 'THING'
            },
            color: 'blue'
          }
        }
      })
    ).toEqual({
      theThing: {
        thingField: {
          id: 1,
          subField: { value: 'THING' },
          color: 'blue'
        }
      }
    });
  });

  it('rewrites a scalar field to be a renamed object field with 1 scalar subfield', () => {
    const handler = new RewriteHandler([
      new FieldRewriter({
        fieldName: 'subField',
        newFieldName: 'renamedSubField',
        objectFieldName: 'value'
      })
    ]);

    const query = gqlFmt`
      query getTheThing {
        theThing {
          thingField {
            id
            subField
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
            renamedSubField {
              value
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
            renamedSubField: {
              value: 'THING'
            },
            color: 'blue'
          }
        }
      })
    ).toEqual({
      theThing: {
        thingField: {
          id: 1,
          subField: 'THING',
          color: 'blue'
        }
      }
    });
  });

  it('works with fragments', () => {
    const handler = new RewriteHandler([
      new FieldRewriter({
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
      new FieldRewriter({
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
      new FieldRewriter({
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
