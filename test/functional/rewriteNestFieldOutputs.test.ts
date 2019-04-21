import RewriteHandler from '../../src/RewriteHandler';
import NestFieldOutputsRewriter from '../../src/rewriters/NestFieldOutputsRewriter';
import { gqlFmt } from '../testUtils';

describe('Rewrite field args to input type', () => {
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
});
