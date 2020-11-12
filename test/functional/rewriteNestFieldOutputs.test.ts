import RewriteHandler from '../../src/RewriteHandler';
import NestFieldOutputsRewriter from '../../src/rewriters/NestFieldOutputsRewriter';
import { gqlFmt } from '../testUtils';

describe('Rewrite output fields inside of a new output object', () => {
  it('allows nesting the args provided into an input type', () => {
    const handler = new RewriteHandler([
      new NestFieldOutputsRewriter({
        fieldName: 'createCat',
        newOutputName: 'cat',
        outputsToNest: ['name', 'color', 'id']
      })
    ]);

    const query = gqlFmt`
      mutation createACat($name: String!) {
        createCat(name: $name) {
          id
          name
          color
        }
      }
    `;
    const expectedRewritenQuery = gqlFmt`
      mutation createACat($name: String!) {
        createCat(name: $name) {
          cat {
            id
            name
            color
          }
        }
      }
    `;
    expect(handler.rewriteRequest(query, { name: 'jack' })).toEqual({
      query: expectedRewritenQuery,
      variables: { name: 'jack' }
    });
    expect(
      handler.rewriteResponse({
        createCat: {
          cat: {
            id: 1,
            name: 'jack',
            color: 'blue'
          }
        }
      })
    ).toEqual({
      createCat: {
        id: 1,
        name: 'jack',
        color: 'blue'
      }
    });
  });

  it("ignores outputs that aren't in the `outputsToNest` list", () => {
    const handler = new RewriteHandler([
      new NestFieldOutputsRewriter({
        fieldName: 'createCat',
        newOutputName: 'cat',
        outputsToNest: ['name', 'color', 'id']
      })
    ]);

    const query = gqlFmt`
      mutation createACat($name: String!) {
        createCat(name: $name) {
          name
          executionTime
        }
      }
    `;
    const expectedRewritenQuery = gqlFmt`
      mutation createACat($name: String!) {
        createCat(name: $name) {
          executionTime
          cat {
            name
          }
        }
      }
    `;
    expect(handler.rewriteRequest(query, { name: 'jack' })).toEqual({
      query: expectedRewritenQuery,
      variables: { name: 'jack' }
    });
    expect(
      handler.rewriteResponse({
        createCat: {
          cat: {
            name: 'jack'
          },
          executionTime: 10
        }
      })
    ).toEqual({
      createCat: {
        name: 'jack',
        executionTime: 10
      }
    });
  });

  it('allows nesting the args provided in an array', () => {
    const handler = new RewriteHandler([
      new NestFieldOutputsRewriter({
        fieldName: 'createCats',
        newOutputName: 'cat',
        outputsToNest: ['name', 'color', 'id']
      })
    ]);
    const query = gqlFmt`
      mutation createManyCats {
        createCats {
          id
          name
          color
        }
      }
    `;
    const expectedRewritenQuery = gqlFmt`
      mutation createManyCats {
        createCats {
          cat {
            id
            name
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
        createCats: [
          {
            cat: {
              id: 1,
              name: 'jack',
              color: 'blue'
            }
          }
        ]
      })
    ).toEqual({
      createCats: [
        {
          id: 1,
          name: 'jack',
          color: 'blue'
        }
      ]
    });
  });
});
