import { queryMatchCondition } from '../../src/matchConditions';
import RewriteHandler from '../../src/RewriteHandler';
import ScalarFieldToObjectFieldRewriter from '../../src/rewriters/ScalarFieldToObjectFieldRewriter';
import { gqlFmt } from '../testUtils';

describe('query match condition', () => {
  it('restricts matches to only queries that meet the criteria specified', () => {
    const createHandler = () =>
      new RewriteHandler([
        new ScalarFieldToObjectFieldRewriter({
          fieldName: 'title',
          objectFieldName: 'text',
          matchConditions: [
            queryMatchCondition({
              queryNames: ['matchingName1', 'matchingName2'],
            }),
          ],
        }),
      ]);

    const noQuery = gqlFmt`
      mutation getTheThing {
        theThing {
          thingField {
            title
          }
        }
      }
    `;
    expect(createHandler().rewriteRequest(noQuery)).toEqual({ query: noQuery });

    const wrongNameQuery = gqlFmt`
      query getTheThing {
        theThing {
          title
        }
      }
    `;
    expect(createHandler().rewriteRequest(wrongNameQuery)).toEqual({
      query: wrongNameQuery,
    });

    const matchingQuery = gqlFmt`
      query matchingName2 {
        theThing {
          title
        }
      }
    `;
    const expectedRewrittenMatchingQuery = gqlFmt`
      query matchingName2 {
        theThing {
          title {
            text
          }
        }
      }
    `;
    expect(createHandler().rewriteRequest(matchingQuery)).toEqual({
      query: expectedRewrittenMatchingQuery,
    });
  });

  it('restricts matches to only querys if no other criteria is specified', () => {
    const createHandler = () =>
      new RewriteHandler([
        new ScalarFieldToObjectFieldRewriter({
          fieldName: 'title',
          objectFieldName: 'text',
          matchConditions: [queryMatchCondition()],
        }),
      ]);

    const noQuery = gqlFmt`
      mutation getTheThing {
        theThing {
          thingField {
            title
          }
        }
      }
    `;
    expect(createHandler().rewriteRequest(noQuery)).toEqual({ query: noQuery });

    const matchingQuery = gqlFmt`
      query getTheThing {
        theThing {
          title
        }
      }
    `;
    const expectedRewrittenMatchingQuery = gqlFmt`
      query getTheThing {
        theThing {
          title {
            text
          }
        }
      }
    `;
    expect(createHandler().rewriteRequest(matchingQuery)).toEqual({
      query: expectedRewrittenMatchingQuery,
    });
  });

  it('can use path regexes to further restrict matches', () => {
    const createHandler = () =>
      new RewriteHandler([
        new ScalarFieldToObjectFieldRewriter({
          fieldName: 'title',
          objectFieldName: 'text',
          matchConditions: [
            queryMatchCondition({
              pathRegexes: [/^thingField.title$/],
            }),
          ],
        }),
      ]);

    const nonMatchingPathFragment = gqlFmt`
      query getTheThing {
        wrongField {
          title
        }
      }
    `;
    expect(createHandler().rewriteRequest(nonMatchingPathFragment)).toEqual({
      query: nonMatchingPathFragment,
    });

    const matchingQuery = gqlFmt`
      query getTheThing {
        thingField {
          title
        }
      }
    `;
    const expectedRewrittenMatchingQuery = gqlFmt`
      query getTheThing {
        thingField {
          title {
            text
          }
        }
      }
    `;
    expect(createHandler().rewriteRequest(matchingQuery)).toEqual({
      query: expectedRewrittenMatchingQuery,
    });
  });
});
