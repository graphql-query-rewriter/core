import { OperationDefinitionNode, parse } from 'graphql';
import {
  extractPath,
  extractVariableDefinitions,
  nodesMatch,
  replaceVariableDefinitions,
  rewriteResultsAtPath,
  FragmentTracer,
} from '../src/ast';

describe('ast utils', () => {
  describe('rewriteResultsAtPath', () => {
    it('rewrites the elements from within an object at the specified path', () => {
      const obj = {
        thing1: {
          moreThings: [{ type: 'dog' }, { type: 'cat' }, { type: 'lion' }],
        },
      };
      expect(
        rewriteResultsAtPath(obj, ['thing1', 'moreThings', 'type'], (elm, path) => ({
          ...elm,
          [path]: elm[path] + '!',
        }))
      ).toEqual({
        thing1: {
          moreThings: [{ type: 'dog!' }, { type: 'cat!' }, { type: 'lion!' }],
        },
      });
    });

    it("doesn't include null or undefined results", () => {
      const obj = {
        thing1: {
          moreThings: [{ type: 'dog' }, { type: 'cat' }, { type: 'lion' }],
        },
      };
      expect(rewriteResultsAtPath(obj, ['missing', 'otherMissing', 'bleh'], () => 'OMG!')).toEqual({
        thing1: {
          moreThings: [{ type: 'dog' }, { type: 'cat' }, { type: 'lion' }],
        },
      });
    });

    it('works at multiple levels of nested arrays', () => {
      const obj = {
        things: [
          {
            moreThings: [{ type: 'dog' }, { type: 'cat' }],
          },
          {
            moreThings: [{ type: 'bear' }, { type: 'cat' }],
          },
        ],
      };
      expect(
        rewriteResultsAtPath(obj, ['things', 'moreThings', 'type'], (elm, path) => ({
          ...elm,
          [path]: elm[path] + '!',
        }))
      ).toEqual({
        things: [
          {
            moreThings: [{ type: 'dog!' }, { type: 'cat!' }],
          },
          {
            moreThings: [{ type: 'bear!' }, { type: 'cat!' }],
          },
        ],
      });
      expect(
        rewriteResultsAtPath(obj, ['things', 'moreThings'], (elm, path, index) => {
          elm[path][index!] = { ...elm[path][index!], meh: '7' };
          return elm;
        })
      ).toEqual({
        things: [
          {
            moreThings: [
              { type: 'dog', meh: '7' },
              { type: 'cat', meh: '7' },
            ],
          },
          {
            moreThings: [
              { type: 'bear', meh: '7' },
              { type: 'cat', meh: '7' },
            ],
          },
        ],
      });
    });
  });

  describe('nodesMatch', () => {
    it('return true if the nodes match recursively, ignoring loc fields', () => {
      const node1: any = {
        kind: 'NonNullType',
        type: {
          kind: 'NamedType',
          name: { kind: 'Name', value: 'String', loc: { start: 10, end: 46 } },
          loc: { start: 1, end: 61 },
        },
        loc: { start: 0, end: 17 },
      };
      const node2: any = {
        kind: 'NonNullType',
        type: {
          kind: 'NamedType',
          name: { kind: 'Name', value: 'String', loc: { start: 0, end: 6 } },
          loc: { start: 0, end: 6 },
        },
        loc: { start: 0, end: 7 },
      };
      expect(nodesMatch(node1, node2)).toBe(true);
    });

    it('return false if the nodes do not match recursively, ignoring loc fields', () => {
      const node1: any = {
        kind: 'NonNullType',
        type: {
          kind: 'NamedType',
          name: { kind: 'Name', value: 'Int', loc: { start: 10, end: 46 } },
          loc: { start: 1, end: 61 },
        },
        loc: { start: 0, end: 17 },
      };
      const node2: any = {
        kind: 'NonNullType',
        type: {
          kind: 'NamedType',
          name: { kind: 'Name', value: 'String', loc: { start: 0, end: 6 } },
          loc: { start: 0, end: 6 },
        },
        loc: { start: 0, end: 7 },
      };
      expect(nodesMatch(node1, node2)).toBe(false);
    });

    it('return false if the nodes do not match due to different length array fields', () => {
      const node1: any = {
        kind: 'FakeField',
        objects: [1, 2, 3],
      };
      const node2: any = {
        kind: 'FakeField',
        objects: [1, 2],
      };
      expect(nodesMatch(node1, node2)).toBe(false);
    });

    it('return false if the nodes do not match due to different objects in array fields', () => {
      const node1: any = {
        kind: 'FakeField',
        objects: [{ man: 'bill' }],
      };
      const node2: any = {
        kind: 'FakeField',
        objects: [{ man: 'jack' }],
      };
      expect(nodesMatch(node1, node2)).toBe(false);
    });
  });

  describe('extractVariableDefinitions', () => {
    it('extracts the variable definitons from the doc', () => {
      const doc = parse(`
        fragment frag on Thing {
          getStuff(arg: $arg1)
        }

        query doStuff($arg1: String) {
          ... frag
        }
      `);
      const varDefs = extractVariableDefinitions(doc);
      expect(varDefs).toHaveLength(1);
      expect(varDefs[0].kind).toBe('VariableDefinition');
      expect(varDefs[0].variable.name.value).toBe('arg1');
    });
  });

  describe('replaceVariableDefinitions', () => {
    it('replaces the variable definitions in the doc', () => {
      const doc = parse(`
        fragment frag on Thing {
          getStuff(arg: $arg1)
        }

        query doStuff($arg1: String) {
          ... frag
        }
      `);

      const otherVarDefs = extractVariableDefinitions(
        parse(`query meh($species: Dog) { get(species: $species) }`)
      );
      const rewrittenDoc = replaceVariableDefinitions(doc, otherVarDefs);
      expect((rewrittenDoc.definitions[1] as OperationDefinitionNode).variableDefinitions).toBe(
        otherVarDefs
      );
    });
  });

  describe('extractPath', () => {
    it('returns the path to the current node in the final document', () => {
      const doc = parse(`
        query doStuff($arg1: String) {
          thing1 { thing2 { thing3 { thing4 } } }
        }
      `);
      const parents = [
        doc as any,
        (doc as any).definitions[0],
        (doc as any).definitions[0].selectionSet,
        (doc as any).definitions[0].selectionSet.selections[0],
        (doc as any).definitions[0].selectionSet.selections[0].selectionSet,
        (doc as any).definitions[0].selectionSet.selections[0].selectionSet.selections[0],
        (doc as any).definitions[0].selectionSet.selections[0].selectionSet.selections[0]
          .selectionSet,
        (doc as any).definitions[0].selectionSet.selections[0].selectionSet.selections[0]
          .selectionSet.selections[0],
        (doc as any).definitions[0].selectionSet.selections[0].selectionSet.selections[0]
          .selectionSet.selections[0].selectionSet,
        (doc as any).definitions[0].selectionSet.selections[0].selectionSet.selections[0]
          .selectionSet.selections[0].selectionSet.selections[0],
      ];
      expect(extractPath(parents)).toEqual(['thing1', 'thing2', 'thing3', 'thing4']);
    });
  });

  describe('FragmentTracer', () => {
    it('derives all nested paths to each fragment in the document', () => {
      const doc = parse(`
        query doStuff($arg1: String) {
          thing1 {
            thing2 {
              ... fragment1
            }
            ... fragment1
          }
          ... fragment2
        }

        fragment fragment1 on Thing {
          thing3 {
            ... fragment2
          }
          ... fragment2
        }

        fragment fragment2 on Thing {
          thing4
        }
      `);
      const tracer = new FragmentTracer(doc);
      expect(tracer.getPathsToFragment('fragment1')).toEqual([['thing1', 'thing2'], ['thing1']]);
      expect(tracer.getPathsToFragment('fragment2')).toEqual([
        [],
        ['thing1', 'thing2', 'thing3'],
        ['thing1', 'thing2'],
        ['thing1', 'thing3'],
        ['thing1'],
      ]);
    });

    it('return empty array if there are no paths to the fragment', () => {
      const doc = parse(`
        query doStuff($arg1: String) {
          thing1 {
            name
          }
        }
        fragment fragment2 on Thing {
          meh
        }
      `);
      const tracer = new FragmentTracer(doc);
      expect(tracer.getPathsToFragment('fragment2')).toEqual([]);
      expect(tracer.getPathsToFragment('nonExistentFragment')).toEqual([]);
    });

    it('does not get stuck in infinite loops in fragments', () => {
      const doc = parse(`
        query doStuff($arg1: String) {
          ... fragment1
        }

        fragment fragment1 on Thing {
          thing1 {
            ...fragment2
          }
        }

        fragment fragment2 on Thing {
          thing2 {
            ...fragment1
          }
        }
      `);
      const tracer = new FragmentTracer(doc);
      expect(tracer.getPathsToFragment('fragment1')).toEqual([[], ['thing1', 'thing2']]);
      expect(tracer.getPathsToFragment('fragment2')).toEqual([['thing1']]);
    });
  });
});
