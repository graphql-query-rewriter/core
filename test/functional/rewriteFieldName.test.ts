import RewriteHandler from '../../src/RewriteHandler';
import FieldNameRewriter from '../../src/rewriters/FieldNameRewriter';
import { gqlFmt } from '../testUtils';
import queryMatchCondition from '../../src/matchConditions/queryMatchCondition';

describe('Rewrite a field name on a node', () => {
  it('allows rewriting the names of fields in a query', () => {
    const handler = new RewriteHandler([
      new FieldNameRewriter({
        fieldName: 'title',
        newFieldName: 'newTitle'
      })
    ]);

    const query = gqlFmt`
      query getPerson {
        person {
          title
        }
      }
    `;

    const expectedQuery = gqlFmt`
      query getPerson {
        person {
          newTitle
        }
      }
    `;

    expect(handler.rewriteRequest(query)).toEqual({ query: expectedQuery });
    expect(
      handler.rewriteResponse({
        person: { newTitle: 'Boss Baby ' }
      })
    ).toEqual({
      person: { title: 'Boss Baby ' }
    });
  });

  it('supports nested renames', () => {
    const handler = new RewriteHandler([
      new FieldNameRewriter({
        fieldName: 'person',
        newFieldName: 'employee'
      })
    ]);

    const query = gqlFmt`
      query someThing {
        person {
          name
          age
        }
      }
    `;

    const expectedQuery = gqlFmt`
      query someThing {
        employee {
          name
          age
        }
      }
    `;

    expect(handler.rewriteRequest(query)).toEqual({ query: expectedQuery });
  });

  it('supports matchConditions', () => {
    const handler = new RewriteHandler([
      new FieldNameRewriter({
        fieldName: 'name',
        newFieldName: 'full_name',
        matchConditions: [
          queryMatchCondition({
            // rewrite only at exatly path innerThing.title
            pathRegexes: [/employee.name/]
          })
        ]
      })
    ]);

    const query = gqlFmt`
      query someThing {
        employee {
          name
        }
        manager {
          name
        }
      }
    `;

    const expectedQuery = gqlFmt`
      query someThing {
        employee {
          full_name
        }
        manager {
          name
        }
      }
    `;

    expect(handler.rewriteRequest(query)).toEqual({ query: expectedQuery });
  });
});
