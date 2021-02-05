import { fragmentMatchCondition } from '../../src/matchConditions';
import RewriteHandler from '../../src/RewriteHandler';
import ScalarFieldToObjectFieldRewriter from '../../src/rewriters/ScalarFieldToObjectFieldRewriter';
import { gqlFmt } from '../testUtils';

describe('fragment match condition', () => {
  it('restricts matches to only fragments that meet the criteria specified', () => {
    const createHandler = () =>
      new RewriteHandler([
        new ScalarFieldToObjectFieldRewriter({
          fieldName: 'title',
          objectFieldName: 'text',
          matchConditions: [
            fragmentMatchCondition({
              fragmentNames: ['matchingName1', 'matchingName2'],
              fragmentTypes: ['Thingy'],
            }),
          ],
        }),
      ]);

    const noFragmentQuery = gqlFmt`
      query getTheThing {
        theThing {
          thingField {
            title
          }
        }
      }
    `;
    expect(createHandler().rewriteRequest(noFragmentQuery)).toEqual({ query: noFragmentQuery });

    const wrongFragmentNameQuery = gqlFmt`
      query getTheThing {
        theThing {
          ...wrongNameFragment
        }
      }
      
      fragment wrongNameFragment on Thingy {
        title
      }
    `;
    expect(createHandler().rewriteRequest(wrongFragmentNameQuery)).toEqual({
      query: wrongFragmentNameQuery,
    });

    const wrongFragmentTypeQuery = gqlFmt`
      query getTheThing {
        theThing {
          ...matchingName2
        }
      }
      
      fragment matchingName2 on WrongType {
        title
      }
    `;
    expect(createHandler().rewriteRequest(wrongFragmentTypeQuery)).toEqual({
      query: wrongFragmentTypeQuery,
    });

    const matchingFragmentQuery = gqlFmt`
      query getTheThing {
        theThing {
          ...matchingName2
        }
      }

      fragment matchingName2 on Thingy {
        title
      }
    `;
    const expectedRewrittenMatchingFragmentQuery = gqlFmt`
      query getTheThing {
        theThing {
          ...matchingName2
        }
      }

      fragment matchingName2 on Thingy {
        title {
          text
        }
      }
    `;
    expect(createHandler().rewriteRequest(matchingFragmentQuery)).toEqual({
      query: expectedRewrittenMatchingFragmentQuery,
    });
  });

  it('restricts matches to only fragments if no other criteria is specified', () => {
    const createHandler = () =>
      new RewriteHandler([
        new ScalarFieldToObjectFieldRewriter({
          fieldName: 'title',
          objectFieldName: 'text',
          matchConditions: [fragmentMatchCondition()],
        }),
      ]);

    const noFragmentQuery = gqlFmt`
      query getTheThing {
        theThing {
          thingField {
            title
          }
        }
      }
    `;
    expect(createHandler().rewriteRequest(noFragmentQuery)).toEqual({ query: noFragmentQuery });

    const matchingFragmentQuery = gqlFmt`
      query getTheThing {
        theThing {
          ...fragName
        }
      }

      fragment fragName on Thingy {
        title
      }
    `;
    const expectedRewrittenMatchingFragmentQuery = gqlFmt`
      query getTheThing {
        theThing {
          ...fragName
        }
      }

      fragment fragName on Thingy {
        title {
          text
        }
      }
    `;
    expect(createHandler().rewriteRequest(matchingFragmentQuery)).toEqual({
      query: expectedRewrittenMatchingFragmentQuery,
    });
  });

  it('can use path regexes to further restrict matches', () => {
    const createHandler = () =>
      new RewriteHandler([
        new ScalarFieldToObjectFieldRewriter({
          fieldName: 'title',
          objectFieldName: 'text',
          matchConditions: [
            fragmentMatchCondition({
              pathRegexes: [/^thingField.title$/],
            }),
          ],
        }),
      ]);

    const nonMatchingPathFragment = gqlFmt`
      query getTheThing {
        theThing {
          ...fragName
        }
      }

      fragment fragName on Thingy {
        title
      }
    `;
    expect(createHandler().rewriteRequest(nonMatchingPathFragment)).toEqual({
      query: nonMatchingPathFragment,
    });

    const matchingFragmentQuery = gqlFmt`
      query getTheThing {
        theThing {
          ...fragName
        }
      }

      fragment fragName on Thingy {
        thingField {
          title
        }
      }
    `;
    const expectedRewrittenMatchingFragmentQuery = gqlFmt`
      query getTheThing {
        theThing {
          ...fragName
        }
      }

      fragment fragName on Thingy {
        thingField {
          title {
            text
          }
        }
      }
    `;
    expect(createHandler().rewriteRequest(matchingFragmentQuery)).toEqual({
      query: expectedRewrittenMatchingFragmentQuery,
    });
  });
});
