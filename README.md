# GraphQL Query Rewriter

[![CircleCI](https://circleci.com/gh/chanind/graphql-query-rewriter/tree/master.svg?style=shield)](https://circleci.com/gh/chanind/graphql-query-rewriter/tree/master)
[![Coverage Status](https://coveralls.io/repos/github/chanind/graphql-query-rewriter/badge.svg?branch=master)](https://coveralls.io/github/chanind/graphql-query-rewriter?branch=master)
[![npm](https://badgen.net/npm/v/graphql-query-rewriter)](https://www.npmjs.com/package/graphql-query-rewriter)
[![license](https://badgen.net/npm/license/graphql-query-rewriter)](https://opensource.org/licenses/MIT)

Seamlessly turn breaking GraphQL schema changes into non-breaking changes by rewriting queries in middleware.

## The Problem

GraphQL is great at enforcing a strict schema for APIs, but its lack of versioning makes it extremely difficult to make changes to GraphQL schemas without breaking existing clients. For example, take the following query:

```
query getUserById($id: String!) {
  userById(id: $id) {
    ...
  }
}
```
Oh no! We should have used `ID!` as the type for `userById(id)` instead of `String!`, but it's already in production! Now if we change our schema to use `ID!` instead of `String!` then our old clients will start getting the error `Variable "$id" of type "String!" used in position expecting type "ID!"`. Currently your only options are to continue using the incorrect `String!` type forever (*eeew*), or make a new query with a new name, like `userByIdNew(id: ID!)` (*gross*)!

Wouldn't it be great if you could change the schema to use `ID!`, but just silently replace `String!` in old queries with `ID!` in your middleware so the old queries will continue to work just like they had been?

GraphQL Query Rewriter provides a way to rewrite deprecated queries in middleware so they'll conform to your new schema without needing to sully your API with gross names and deprecated fields like `doTheThingNew` or `doTheThingV3`.

In the above example, we can set up a rewrite rule so that `userById(id: String!)` will be seamlessly rewritten to `userById(id: ID!)` using the following middleware (assuming express-graphql):

```javascript

import { FieldArgTypeRewriter } from 'graphql-query-rewriter';
import { graphqlRewriterMiddleware } from 'express-graphql-query-rewriter';

const app = express();

// set up graphqlRewriterMiddleware right before graphQL gets processed
// to rewrite deprecated queries so they seamlessly work with your new schema
app.use('/graphql', graphqlRewriterMiddleware({
  rewriters: [
    new FieldArgTypeRewriter({
      fieldName: 'userById',
      argName: 'id',
      oldType: 'String!',
      newType: 'ID!'
    }),
  ]
}));

app.use('/graphql', graphqlHTTP( ... ));

...
```

Now, when old clients send the following query:
```
query getUserById($id: String!) {
  userById(id: $id) {
    ...
  }
}
```

It will be rewritten before it gets process to:
```
query getUserById($id: ID!) {
  userById(id: $id) {
    ...
  }
}
```

Now your schema is clean and up to date, and deprecated clients keep working! GraphQL Schema Rewriter can rewrite much more complex queries than just changing a single input type as well.


## Installation

Installation requires the base package `graphql-query-rewriter` and a middleware adapter for the web framework you use. Currently only `graphql-express` is supported, but `apollo-server` and more will be added soon!

```
# for express-graphql
npm install graphql-query-rewriter express-graphql-query-rewriter
```

