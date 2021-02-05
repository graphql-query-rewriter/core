import { mutationMatchCondition } from '../../src/matchConditions';
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
            mutationMatchCondition({
              mutationNames: ['matchingName1', 'matchingName2'],
            }),
          ],
        }),
      ]);

    const noMutation = gqlFmt`
      query getTheThing {
        theThing {
          thingField {
            title
          }
        }
      }
    `;
    expect(createHandler().rewriteRequest(noMutation)).toEqual({ query: noMutation });

    const wrongNameMutation = gqlFmt`
      mutation getTheThing {
        theThing {
          title
        }
      }
    `;
    expect(createHandler().rewriteRequest(wrongNameMutation)).toEqual({
      query: wrongNameMutation,
    });

    const matchingMutation = gqlFmt`
      mutation matchingName2 {
        theThing {
          title
        }
      }
    `;
    const expectedRewrittenMatchingMutation = gqlFmt`
      mutation matchingName2 {
        theThing {
          title {
            text
          }
        }
      }
    `;
    expect(createHandler().rewriteRequest(matchingMutation)).toEqual({
      query: expectedRewrittenMatchingMutation,
    });
  });

  it('restricts matches to only mutations if no other criteria is specified', () => {
    const createHandler = () =>
      new RewriteHandler([
        new ScalarFieldToObjectFieldRewriter({
          fieldName: 'title',
          objectFieldName: 'text',
          matchConditions: [mutationMatchCondition()],
        }),
      ]);

    const noMutation = gqlFmt`
      query getTheThing {
        theThing {
          thingField {
            title
          }
        }
      }
    `;
    expect(createHandler().rewriteRequest(noMutation)).toEqual({ query: noMutation });

    const matchingMutation = gqlFmt`
      mutation getTheThing {
        theThing {
          title
        }
      }
    `;
    const expectedRewrittenMatchingMutation = gqlFmt`
      mutation getTheThing {
        theThing {
          title {
            text
          }
        }
      }
    `;
    expect(createHandler().rewriteRequest(matchingMutation)).toEqual({
      query: expectedRewrittenMatchingMutation,
    });
  });

  it('can use path regexes to further restrict matches', () => {
    const createHandler = () =>
      new RewriteHandler([
        new ScalarFieldToObjectFieldRewriter({
          fieldName: 'title',
          objectFieldName: 'text',
          matchConditions: [
            mutationMatchCondition({
              pathRegexes: [/^thingField.title$/],
            }),
          ],
        }),
      ]);

    const nonMatchingPathFragment = gqlFmt`
      mutation getTheThing {
        wrongField {
          title
        }
      }
    `;
    expect(createHandler().rewriteRequest(nonMatchingPathFragment)).toEqual({
      query: nonMatchingPathFragment,
    });

    const matchingMutation = gqlFmt`
      mutation getTheThing {
        thingField {
          title
        }
      }
    `;
    const expectedRewrittenMatchingMutation = gqlFmt`
      mutation getTheThing {
        thingField {
          title {
            text
          }
        }
      }
    `;
    expect(createHandler().rewriteRequest(matchingMutation)).toEqual({
      query: expectedRewrittenMatchingMutation,
    });
  });
});
