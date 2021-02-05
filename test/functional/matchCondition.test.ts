import { mutationMatchCondition, queryMatchCondition } from '../../src/matchConditions';
import RewriteHandler from '../../src/RewriteHandler';
import ScalarFieldToObjectFieldRewriter from '../../src/rewriters/ScalarFieldToObjectFieldRewriter';
import { gqlFmt } from '../testUtils';

describe('matchCondition', () => {
  it('matches if any of the provided conditions matches', () => {
    const createHandler = () =>
      new RewriteHandler([
        new ScalarFieldToObjectFieldRewriter({
          fieldName: 'title',
          objectFieldName: 'text',
          matchConditions: [
            queryMatchCondition({
              queryNames: ['queryName1', 'queryName2'],
            }),
            mutationMatchCondition({
              mutationNames: ['mutationName1', 'mutationName2'],
            }),
          ],
        }),
      ]);

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
      query queryName1 {
        theThing {
          title
        }
      }
    `;
    const expectedRewrittenMatchingQuery = gqlFmt`
      query queryName1 {
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

    const matchingMutation = gqlFmt`
      mutation mutationName1 {
        theThing {
          title
        }
      }
    `;
    const expectedRewrittenMatchingMutation = gqlFmt`
      mutation mutationName1 {
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
});
