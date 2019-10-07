# GraphQL Query Rewriter

[![CircleCI](https://circleci.com/gh/ef-eng/graphql-query-rewriter/tree/master.svg?style=shield)](https://circleci.com/gh/ef-eng/graphql-query-rewriter/tree/master)
[![Coverage Status](https://coveralls.io/repos/github/chanind/graphql-query-rewriter/badge.svg?branch=master)](https://coveralls.io/github/ef-eng/graphql-query-rewriter?branch=master)
[![npm](https://badgen.net/npm/v/graphql-query-rewriter)](https://www.npmjs.com/package/graphql-query-rewriter)
[![license](https://badgen.net/npm/license/graphql-query-rewriter)](https://opensource.org/licenses/MIT)

Seamlessly turn breaking GraphQL schema changes into non-breaking changes by rewriting queries in middleware.

Full API docs are available at https://ef-eng.github.io/graphql-query-rewriter

## The Problem

GraphQL is great at enforcing a strict schema for APIs, but its lack of versioning makes it extremely difficult to make changes to GraphQL schemas without breaking existing clients. For example, take the following query:

```graphql
query getUserById($id: String!) {
  userById(id: $id) {
    ...
  }
}
```

Oh no! We should have used `ID!` as the type for `userById(id)` instead of `String!`, but it's already in production! Now if we change our schema to use `ID!` instead of `String!` then our old clients will start getting the error `Variable "$id" of type "String!" used in position expecting type "ID!"`. Currently your only options are to continue using the incorrect `String!` type forever (_eeew_), or make a new query with a new name, like `userByIdNew(id: ID!)` (_gross_)!

Wouldn't it be great if you could change the schema to use `ID!`, but just silently replace `String!` in old queries with `ID!` in your middleware so the old queries will continue to work just like they had been?

## Rewrite it!

GraphQL Query Rewriter provides a way to rewrite deprecated queries in middleware so they'll conform to your new schema without needing to sully your API with awkwardly renamed and deprecated fields like `doTheThingNew` or `doTheThingV3`.

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

```graphql
query getUserById($id: String!) {
  userById(id: $id) {
    ...
  }
}
```

It will be rewritten before it gets processed to:

```graphql
query getUserById($id: ID!) {
  userById(id: $id) {
    ...
  }
}
```

Now your schema is clean and up to date, and deprecated clients keep working! GraphQL Schema Rewriter can rewrite much more complex queries than just changing a single input type as well.

## Installation

Installation requires the base package `graphql-query-rewriter` and a middleware adapter for the web framework you use. Currently works with `express-graphql` and `apollo-server`.

#### For express-graphql

```
npm install graphql-query-rewriter express-graphql-query-rewriter
```

#### For Apollo-server

Apollo server works with `express-graphql-query-rewriter` via [Apollo server middleware](https://www.apollographql.com/docs/apollo-server/migration-two-dot/#adding-additional-middleware-to-apollo-server-2).

```
npm install graphql-query-rewriter express-graphql express-graphql-query-rewriter
```

## Usage

First you need to set up an appropriate middleware for your server.

#### For express-graphql

With [express-graphql](https://github.com/graphql/express-graphql), you can use the `express-graphql-query-rewriter` middleware. This middleware goes directy before your `graphql` handler in express:

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

#### For apollo-server

Apollo-server can also use the `express-graphql-query-rewriter` middleware like below:

```js
const { ApolloServer, gql } = require("apollo-server-express");
const express = require("express");
const { graphqlRewriterMiddleware } = require("express-graphql-query-rewriter");

// configure ApolloServer as usual
const server = new ApolloServer({ typeDefs, resolvers });

const app = express();
const path = "/graphql";
app.use(
  path,
  graphqlRewriterMiddleware({
    rewriters: [ /* place rewriters here */]
  })
);
server.applyMiddleware({ app, path, bodyParserConfig: false });
...
```

Note that you need to specify `bodyParserConfig: false` in `applyMiddleware()` since `express-graphql-query-rewriter` already parses the graphQL body in order to rewrite it.

### FieldArgTypeRewriter

`FieldArgTypeRewriter` rewrites the type of an argument to a graphQL query or mutation. For example, to change from `Int` to `Int!` in a mutation called `doTheThing(arg1: Int)` you could add the following:

```js
import { FieldArgTypeRewriter } from 'graphql-query-rewriter';

// add this to the rewriters array in graphqlRewriterMiddleware(...)
const rewriter = new FieldArgTypeRewriter({
  fieldName: 'doTheThing',
  argName: 'arg1',
  oldType: 'Int',
  newType: 'Int!'
});
```

Sometimes, you'll need to do some preprocessing on the variables submitted to the rewritten argument to make them into the type needed by the new schema. You can do this by passing in a `coerceVariable` function which returns a new value of the variable. For example, the following changes the value of `arg1` from `Int!` to `String!`, and also changes the value of `arg1` to a string as well:

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

`FieldArgNameRewriter` rewrites the name of an argument to a graphQL query or mutation. For example, to change an argument name from `userID` to `userId` in a mutation called `createUser(userID: ID!)` you could add the following:

```js
import { FieldArgNameRewriter } from 'graphql-query-rewriter';

// add this to the rewriters array in graphqlRewriterMiddleware(...)
const rewriter = new FieldArgNameRewriter({
  fieldName: 'createUser',
  oldArgName: 'userID',
  newArgName: 'userId'
});
```

### FieldArgsToInputTypeRewriter

`FieldArgsToInputTypeRewriter` can be used to move mutation parameters into a single input object, by default named `input`. It's a best-practice to use a single input type for mutations in GraphQL, and it's required by the [Relay GraphQL Spec](https://facebook.github.io/relay/docs/en/graphql-server-specification.html#mutations). For example, to migrate the mutation `createUser(username: String!, password: String!)` to a mutation with a proper input type like:

```graphql
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
});
```

For example, This would rewrite the following mutation:

```graphql
mutation createUser($username: String!, $password: String!) {
  createUser(username: $username, password: $password) {
    ...
  }
}
```

and turn it into:

```graphql
mutation createUser($username: String!, $password: String!) {
  createUser(input: { username: $username, password: $password }) {
    ...
  }
}
```

### ScalarFieldToObjectFieldRewriter

`ScalarFieldToObjectFieldRewriter` can be used to rewrite a scalar field into an object selecing a single scalar field. For example, imagine there's a `User` type with a `full_name` field that's of type `String!`. But to internationalize, that `full_name` field needs to support different names in different languges, something like `full_name: { default: 'Jackie Chan', 'cn': '成龙', ... }`. We could use the `ScalarFieldToObjectFieldRewriter` to rewriter `full_name` to instead select the `default` name. Specifically, given we have the schema below:

```graphql
type User {
  id: ID!
  full_name: String!
  ...
}
```

and we want to change it to

```graphql
type User {
  id: ID!
  full_name: {
    default: String!
    en: String
    cn: String
    ...
  }
  ...
}
```

we can make this change with the following rewriter:

```js
import { ScalarFieldToObjectFieldRewriter } from 'graphql-query-rewriter';

// add this to the rewriters array in graphqlRewriterMiddleware(...)
const rewriter = new ScalarFieldToObjectFieldRewriter({
  fieldName: 'full_name',
  objectFieldName: 'default'
});
```

For example, This would rewrite the following query:

```graphql
query getUser(id: ID!) {
  user {
    id
    full_name
  }
}
```

and turn it into:

```graphql
query getUser(id: ID!) {
  user {
    id
    full_name {
      default
    }
  }
}
```

### NestFieldOutputsRewriter

`NestFieldOutputsRewriter` can be used to move mutation outputs into a nested payload object. It's a best-practice for each mutation in GraphQL to have its own output type, and it's required by the [Relay GraphQL Spec](https://facebook.github.io/relay/docs/en/graphql-server-specification.html#mutations). For example, to migrate the mutation `createUser(input: CreateUserInput!): User!` to a mutation with a proper output payload type like:

```graphql
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
});
```

For example, This would rewrite the following mutation:

```graphql
mutation createUser(input: CreateUserInput!) {
  createUser(input: $input) {
    id
    username
  }
}
```

and turn it into:

```graphql
mutation createUser(input: CreateUserInput!) {
  createUser(input: $input) {
    user {
      id
      username
    }
  }
}
```

## Restricting Matches Further

Sometimes you need more control over which fields get rewritten to avoid accidentally rewriting fields which happen to have the same name in an unrelated query. This can be accomplished by providing a list of `matchConditions` to the `RewriteHandler`. There are 3 built-in match condition helpers you can use to make this easier, specifically `fragmentMatchCondition`, `queryMatchCondition`, and `mutationMatchCondition`. If any of the conditions passed in to `matchConditions` match, then the rewriter will proceed as normal.

For example, to restrict matches to only to the `title` field of fragments named `thingFragment`, on type `Thing`, we could use the following `matchConditions`:

```js
import { fragmentMatchCondition, ScalarFieldToObjectFieldRewriter } from 'graphql-query-rewriter';

const rewriter = new ScalarFieldToObjectFieldRewriter({
  fieldName: 'title',
  objectFieldName: 'text',
  matchConditions: [
    fragmentMatchCondition({
      fragmentNames: ['thingFragment'],
      fragmentTypes: ['Thing']
    })
  ]
});
```

Then, this will rewrite the following query as follows:

```graphql
query {
  articles {
    title # <- This will not get rewritten, it doesn't match the matchConditions
    things {
      ...thingFragment
    }
  }
}

fragment thingFragment on Thing {
  id
  title # <- This will be rewritten, because it matches the matchConditions
}
```

You can also pass a `pathRegexes` array of regexes to `fragmentMatchCondition` if you'd like to restrict the path to the object field within the fragment that you'd like to rewrite. For example:

```js
const rewriter = new ScalarFieldToObjectFieldRewriter({
  fieldName: 'title',
  objectFieldName: 'text',
  matchConditions: [
    fragmentMatchCondition({
      // rewrite only at exatly path innerThing.title
      pathRegexes: [/^innerThing.title$/]
    })
  ]
});
```

Then, this will rewrite the query below as follows:

```graphql
query {
  things {
    ...parentThingFragment
  }
}

fragment parentThingFragment on Thing {
  id
  title # <- not rewritten, it's not at the correct path
  innerThing {
    title # <- This will be rewritten, it's at path innerThing.title
  }
}
```

There are also `queryMatchCondition` and `mutationMatchCondition`. These work similarly to `fragmentMatchCondition`, except they match only fields directly inside of a query or a mutation, respectively.
All of these matches take `pathRegexes` to search for matching paths, but `queryMatchCondition` can also take `queryNames`, to match only named queries, and likewise `mutationMatchCondition` can take `mutationNames` to match named mutations.

If there are multiple `matchConditions` provided, then if any of the conditions match then the rewriter will continue as normal. For example:

```js
const rewriter = new ScalarFieldToObjectFieldRewriter({
  fieldName: 'title',
  objectFieldName: 'text',
  matchConditions: [
    fragmentMatchCondition({
      fragmentNames: ['thingFragment']
    }),
    queryMatchCondition({
      queryNames: ['getThing', 'getOtherThing']
    })
  ]
});
```

The above rewriter will only match on fragments named `thingFragment`, or queries named `getThing` or `getOtherThing`.

## Current Limitations

Currently GraphQL Query Rewriter can only work with a single operation per query, and cannot properly handle aliased fields. These limitations should hopefully be fixed soon. Contributions are welcome!

## License

GraphQL Query Rewriter is released under a [MIT License](https://opensource.org/licenses/MIT).

## Contributing

Contributions are welcome! These steps will guide you through contributing to this project:

- Fork the repo
- Clone it and install dependencies

  `git clone https://github.com/ef-eng/graphql-query-rewriter`

  `yarn install`

Make and commit your changes. Make sure the commands yarn run build and yarn run test:prod are working.

Finally send a [GitHub Pull Request](https://github.com/ef-eng/graphql-query-rewriter/compare?expand=1) with a clear list of what you've done. Make sure all of your commits are atomic (one feature per commit). Please add tests for any features that you add or change.
