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

```js

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

## Usage

First you need to set up an appropriate middleware for your server. Currently, only [express-graphql](https://github.com/graphql/express-graphql) is supported, so we'll be using the `express-graphql-query-rewriter` middleware. This middleware goes directy before your `graphql` handler in express:

```js
import { graphqlRewriterMiddleware } from 'express-graphql-query-rewriter';

...
// graphqlRewriterMiddleware should go directly before the graphQL handler
app.use('/graphql',  graphqlRewriterMiddleware({
  rewriters: [ /* place rewriters here */]
})

app.use('/graphql', graphqlHTTP( ... ));
...
```

### FieldArgTypeRewriter

The `FieldArgTypeRewriter` rewrites the type of an argument to a graphQL query or mutation. For example, to change from `Int` to `Int!` in a mutation called `doTheThing(arg1: Int)` you could add the following:

```js
import { FieldArgTypeRewriter } from 'graphql-query-rewriter';

// add this to the rewriters array in graphqlRewriterMiddleware(...)
const rewriter = new FieldArgTypeRewriter({
  fieldName: 'doTheThing',
  argName: 'arg1',
  oldType: 'Int',
  newType: 'Int!'
})
```

Sometimes, you'll need to do some preprocessing on the variables submitted to the to this argument to make them into the type needed by the new schema. You can do this by passing in a `coerceVariable` function which returns a new value of the variable. For example, the following changes the value of `arg1` from `Int!` to  `String!`, and also changes the value of `arg1` to a string as well:

```js
import { FieldArgTypeRewriter } from 'graphql-query-rewriter';

// add this to the rewriters array in graphqlRewriterMiddleware(...)
const rewriter = new FieldArgTypeRewriter({
  fieldName: 'doTheThing',
  argName: 'arg1',
  oldType: 'Int!',
  newType: 'String!'
  coerceVariable: (val) => `${val}`,
})
```

### FieldArgNameRewriter

The `FieldArgNameRewriter` rewrites the name of an argument to a graphQL query or mutation. For example, to change an argument name from `userID` to `userId` in a mutation called `createUser(userID: ID!)` you could add the following:

```js
import { FieldArgNameRewriter } from 'graphql-query-rewriter';

// add this to the rewriters array in graphqlRewriterMiddleware(...)
const rewriter = new FieldArgNameRewriter({
  fieldName: 'createUser',
  oldArgName: 'userID',
  newArgName: 'userId'
})
```

### FieldArgsToInputTypeRewriter

The `FieldArgsToInputTypeRewriter` can be used to move mutation parameters into a single input object, by default named `input`. It's a best-practice to use a single input type for mutations in GraphQL, and it's required by the [Relay GraphQL Spec](https://facebook.github.io/relay/docs/en/graphql-server-specification.html#mutations). For example, to migrate the mutation `createUser(username: String!, password: String!)` to a mutation with a proper input type like:
```
mutation createUser(input: CreateUserInput!) { ... }

type CreateUserInput {
  username: String!
  password: String!
}
```

we can make this change with the following rewriter:

```js
import { FieldArgsToInputTypeRewriter } from 'graphql-query-rewriter';

// add this to the rewriters array in graphqlRewriterMiddleware(...)
const rewriter = new FieldArgsToInputTypeRewriter({
  fieldName: 'createUser',
  argNames: ['username', 'password'],
  inputArgName: 'input' // inputArgName can be left out to use 'input' by default
})
```

For example, This would rewrite the following mutation:

```
mutation createUser($username: String!, $password: String!) {
  createUser(username: $username, password: $password) {
    ...
  }
}
```

and turn it into:

```
mutation createUser($username: String!, $password: String!) {
  createUser(input: { username: $username, password: $password }) {
    ...
  }
}
```

### NestFieldOutputsRewriter

The `NestFieldOutputsRewriter` can be used to move mutation outputs into a nested payload object. It's a best-practice for each mutation in GraphQL to have its their own output type, and it's required by the [Relay GraphQL Spec](https://facebook.github.io/relay/docs/en/graphql-server-specification.html#mutations). For example, to migrate the mutation `createUser(input: CreateUserInput!): User!` to a mutation with a proper output payload type like:

```
mutation createUser(input: CreateUserInput!) CreateUserPayload

type User {
  id
  username
}

type CreateUserPayload {
  user: User!
}
```

we can make this change with the following rewriter:

```js
import { NestFieldOutputsRewriter } from 'graphql-query-rewriter';

// add this to the rewriters array in graphqlRewriterMiddleware(...)
const rewriter = new NestFieldOutputsRewriter({
  fieldName: 'createUser',
  newOutputName: 'user',
  outputsToNest: ['id', 'username']
})
```

For example, This would rewrite the following mutation:

```
mutation createUser(input: CreateUserInput!) {
  createUser(input: $input) {
    id
    username
  }
}
```

and turn it into:

```
mutation createUser(input: CreateUserInput!) {
  createUser(input: $input) {
    user {
      id
      username
    }
  }
}
```

## Current Limitations

Currently GraphQL Query Rewriter can only work with a single operation per query, and cannot properly handle aliased fields. These limitations should hopefully be fixed soon. Contributions are welcome!
