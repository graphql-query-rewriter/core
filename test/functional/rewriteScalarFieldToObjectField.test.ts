import RewriteHandler from '../../src/RewriteHandler';
import ScalarFieldToObjectFieldRewriter from '../../src/rewriters/ScalarFieldToObjectFieldRewriter';
import { gqlFmt } from '../testUtils';

describe('Rewrite scalar field to be a nested object with a single scalar field', () => {
  it('rewrites a scalar field to be an objet field with 1 scalar subfield', () => {
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
});
