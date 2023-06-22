# Typescript monorepo

## What's inside?

This monorepo uses [Turborepo](https://turbo.build/repo) for managing and building the following packages/apps:

Note the documentation for self-hosting is currently in ⚠️ alpha status. Reach out to us on Discord or by email (founders@gloo.chat) if you run into any issues.

### Apps and Packages

- `web`: a [Next.js](https://nextjs.org/) app using the latest appDir
- `config`: `eslint` configurations (includes `eslint-config-next` and `eslint-config-prettier`)
- `database`: [Prisma](https://prisma.io/) ORM wrapper to manage & access your database
- `backend`: A containerized Express.js backend written in typescript. The endpoints are mostly generated from a YAML schema under `../fern` and uses [Fern](https://buildwithfern.com/docs/intro) to generate internal and public SDKs (for our managed cloud version) in Python / Typescript.
- `cdk`: [AWS CDK](https://aws.amazon.com/cdk/) used to deploy infrastructure, and generate DynamoDB tables and other resources.
- `tsconfig`: central tsconfig used throughout the monorepo

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Dependencies / Requirements

- User Management / Auth: [Clerk](https://clerk.com/)
- Secrets management: [Infisical](https://infisical.com/)
- Database:
  1. PostgresQL using [Prisma](https://prisma.io)
  2. AWS DynamoDB for storing secrets (in progress of moving this to Postgres as well)

Once you setup those dependencies, add the relevant secrets to infisical, to the Test stage.

### Setup Secrets

Note Gloo currently gets all config AND secrets from Infisical. Note that some of these aren't actual secrets.

**Clerk**

Note: we will make a change to not require these in dev-mode soon.

1. `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
2. `CLERK_SECRET_KEY`

**PRISMA**

Assuming you're using Supabase, you'll need different URLs since migrations only work using a certain port. We use the directUrl setting in the prisma schema to point to the migration env variable.

3. `DATABASE_URL`
4. `DATABASE_URL_MIGRATION`

**OTHER**

5. `STAGE`: Hardcode this to `dev` for local dev
6. `TABLE_SECRETS`: Hardcode to `secrets`
7. `GLOO_AUTH_SECRET`: Create your own string, and store it in the dynamoDB table called dev-secrets. We will make changes to not require this in dev-mode soon. This is used to generate secrets for our customers (but not needed if you're not vending out secrets to others)
8. `GLOO_SERVICE_URL`: `http://localhost:8080`

## Setup AWS resources

Go into `cdk`, configure your AWS access keys in your environment variables (see the [guide](https://docs.aws.amazon.com/cdk/v2/guide/cli.html)), and run

```bash
npm run build && cdk synth && cdk deploy
```

## Setup Postgres Database

We use [Prisma](https://prisma.io/) to manage & access our database. As such you will need a database for this project, either locally or hosted in the cloud.

We use Supabase to manage our database. Follow [these steps](https://supabase.com/docs/guides/getting-started/local-development#log-in-to-the-supabase-cli) to get started.

Once deployed & up & running, you will need to create & deploy migrations to your database to add the necessary tables. This can be done using [Prisma Migrate](https://www.prisma.io/migrate):

```bash
npx prisma migrate dev
```

If you need to push any existing migrations to the local database you can run

```bash
pnpm run db:migrate:local
```

[Prisma offers a breakdown on which migrate command is best to use](https://www.prisma.io/docs/concepts/components/prisma-migrate/db-push#choosing-db-push-or-prisma-migrate).

For further more information on migrations, seeding & more, we recommend reading through the [Prisma Documentation](https://www.prisma.io/docs/).

## Build

To build all apps and packages, run the following command from this `typescript` directory

```bash
turbo build
```

## Develop

To develop all apps and packages, run the following command:

```bash
turbo dev-local
```

The website should be accessible at http://localhost:3000
The backend service will be accessible at http://localhost:8080

## Deploying to your own cloud service

coming soon

## Useful Links

Learn more about Turborepo:

- [Tasks](https://turbo.build/repo/docs/core-concepts/monorepos/running-tasks)
- [Caching](https://turbo.build/repo/docs/core-concepts/caching)
- [Remote Caching](https://turbo.build/repo/docs/core-concepts/remote-caching)
- [Filtering](https://turbo.build/repo/docs/core-concepts/monorepos/filtering)
- [Configuration Options](https://turbo.build/repo/docs/reference/configuration)
- [CLI Usage](https://turbo.build/repo/docs/reference/command-line-reference)
