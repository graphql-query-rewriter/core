import { nodesMatch } from '../src/ast';

describe('nodesMatch', () => {
  it('return true if the nodes match recursively, ignoring loc fields', () => {
    const node1: any = {
      kind: 'NonNullType',
      type: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'String', loc: { start: 10, end: 46 } },
        loc: { start: 1, end: 61 }
      },
      loc: { start: 0, end: 17 }
    };
    const node2: any = {
      kind: 'NonNullType',
      type: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'String', loc: { start: 0, end: 6 } },
        loc: { start: 0, end: 6 }
      },
      loc: { start: 0, end: 7 }
    };
    expect(nodesMatch(node1, node2)).toBe(true);
  });

  it('return false if the nodes do not match recursively, ignoring loc fields', () => {
    const node1: any = {
      kind: 'NonNullType',
      type: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Int', loc: { start: 10, end: 46 } },
        loc: { start: 1, end: 61 }
      },
      loc: { start: 0, end: 17 }
    };
    const node2: any = {
      kind: 'NonNullType',
      type: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'String', loc: { start: 0, end: 6 } },
        loc: { start: 0, end: 6 }
      },
      loc: { start: 0, end: 7 }
    };
    expect(nodesMatch(node1, node2)).toBe(false);
  });
});
