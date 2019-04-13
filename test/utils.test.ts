import { identifyFunc } from '../src/utils';

describe('identifyFunc', () => {
  it('returns whatever is passed in', () => {
    expect(identifyFunc(17)).toBe(17);
    expect(identifyFunc(undefined)).toBe(undefined);
    const obj = { me: 'hi' };
    expect(identifyFunc(obj)).toBe(obj);
  });
});
