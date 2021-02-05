import Rewriter, { RewriterOpts } from '../../src/rewriters/Rewriter';

describe('rewriter', () => {
  class TestRewriter extends Rewriter {
    constructor(options: RewriterOpts) {
      super(options);
    }

    public extractReponseElement(response: any, key: string, index?: number): any {
      return super.extractReponseElement(response, key, index);
    }

    public rewriteResponseElement(
      response: any,
      newElement: any,
      key: string,
      index?: number
    ): any {
      return super.rewriteResponseElement(response, newElement, key, index);
    }
  }

  describe('extractResponseElement', () => {
    const rewriter = new TestRewriter({ fieldName: 'test' });

    it('can extract element in object', () => {
      const key = 'key';
      const element = { a: 1 };
      const response = { [key]: element };

      expect(rewriter.extractReponseElement(response, key)).toEqual(element);
    });

    it('can extract element in array', () => {
      const key = 'key';
      const element = { a: 1 };
      const response = { [key]: [element] };

      expect(rewriter.extractReponseElement(response, key, 0)).toEqual(element);
    });

    it('does not fail on null, empty or malformed response', () => {
      const key = 'key';

      expect(rewriter.extractReponseElement(null, key)).toEqual(null);
      expect(rewriter.extractReponseElement('string', key)).toEqual(null);
      expect(rewriter.extractReponseElement({ a: 1 }, key)).toEqual(null);
    });
  });

  describe('rewriteResponseElement', () => {
    const rewriter = new TestRewriter({ fieldName: 'test' });

    it('can replace element in object', () => {
      const key = 'key';
      const newElement = { a: 1 };
      const response = { [key]: 1 };

      expect(rewriter.rewriteResponseElement(response, newElement, key)).toEqual({
        [key]: newElement,
      });
    });

    it('can replace element in array', () => {
      const key = 'key';
      const newElement = { a: 1 };
      const response = { [key]: [1] };

      expect(rewriter.rewriteResponseElement(response, newElement, key, 0)).toEqual({
        [key]: [newElement],
      });
    });

    it('does not fail on null, empty or malformed response', () => {
      const key = 'key';
      const newElement = { a: 1 };

      expect(rewriter.rewriteResponseElement(null, newElement, key)).toEqual(null);
      expect(rewriter.rewriteResponseElement('string', newElement, key)).toEqual('string');
      expect(rewriter.rewriteResponseElement({ a: 1 }, newElement, key)).toEqual({
        a: 1,
        [key]: newElement,
      });
    });
  });
});
