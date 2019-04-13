import { rewriteResultsAtPath } from '../src/ast';

describe('ast utils', () => {
  describe('rewriteResultsAtPath', () => {
    it('rewrites the elements from within an object at the specified path', () => {
      const obj = {
        thing1: {
          moreThings: [{ type: 'dog' }, { type: 'cat' }, { type: 'lion' }]
        }
      };
      expect(rewriteResultsAtPath(obj, ['thing1', 'moreThings', 'type'], elm => elm + '!')).toEqual(
        {
          thing1: {
            moreThings: [{ type: 'dog!' }, { type: 'cat!' }, { type: 'lion!' }]
          }
        }
      );
    });

    it("doesn't include null or undefined results", () => {
      const obj = {
        thing1: {
          moreThings: [{ type: 'dog' }, { type: 'cat' }, { type: 'lion' }]
        }
      };
      expect(rewriteResultsAtPath(obj, ['missing', 'otherMissing', 'bleh'], () => 'OMG!')).toEqual({
        thing1: {
          moreThings: [{ type: 'dog' }, { type: 'cat' }, { type: 'lion' }]
        }
      });
    });

    it('works at multiple levels of nested arrays', () => {
      const obj = {
        things: [
          {
            moreThings: [{ type: 'dog' }, { type: 'cat' }]
          },
          {
            moreThings: [{ type: 'bear' }, { type: 'cat' }]
          }
        ]
      };
      expect(rewriteResultsAtPath(obj, ['things', 'moreThings', 'type'], elm => elm + '!')).toEqual(
        {
          things: [
            {
              moreThings: [{ type: 'dog!' }, { type: 'cat!' }]
            },
            {
              moreThings: [{ type: 'bear!' }, { type: 'cat!' }]
            }
          ]
        }
      );
      expect(
        rewriteResultsAtPath(obj, ['things', 'moreThings'], elm => ({ ...elm, meh: '7' }))
      ).toEqual({
        things: [
          {
            moreThings: [{ type: 'dog', meh: '7' }, { type: 'cat', meh: '7' }]
          },
          {
            moreThings: [{ type: 'bear', meh: '7' }, { type: 'cat', meh: '7' }]
          }
        ]
      });
    });
  });
});
