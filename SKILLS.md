# Kodipoint Nest API Skills

This project is a NestJS backend for a property management workflow. It is organized around feature modules, Prisma ORM access, JWT-based authentication, and service-layer business logic for real-estate managers, properties, tenants, invoices, payments, receipts, documents, and reporting.

## Project overview

This backend is built for managing:

- real-estate manager accounts and authentication
- properties and landlord/manager ownership boundaries
- tenants and tenancy relationships
- invoices, payment allocations, payments, and receipts
- document generation and email/SMS workflows
- reporting and queue-driven background jobs

The app uses:

- NestJS 12 for the API layer
- Prisma 8 contract-first data access via `src/prisma/db.ts`
- PostgreSQL as the primary database target
- JWT authentication with Passport
- Swagger for API docs
- RabbitMQ-backed microservices for queue work

## Architecture and module layout

Follow the existing folder structure and keep feature logic in the same shape used across the project.

```text
src/
  app.module.ts
  main.ts
  auth/
  common/
  database/
  documents/
  invoices/
  payment-allocations/
  payments/
  prisma/
  properties/
  queues/
  receipts/
  reports/
  tenancies/
  tenants/
  users/
  test/
```

### Feature-module pattern

Each feature is a Nest module with the same basic pattern:

- `*.module.ts` for module registration
- `*.controller.ts` for HTTP endpoints
- `*.service.ts` for business logic
- `dto/` for request validation objects
- optional `strategies/` or `guards/` subfolders for auth concerns

Examples in this project:

- `src/auth/auth.module.ts`
- `src/properties/properties.service.ts`
- `src/tenants/tenants.service.ts`
- `src/users/users.controller.ts`

## Coding style and conventions

### 1. Match current NestJS formatting

Use the style already present in the codebase:

- 4-space indentation
- semicolons at the end of statements
- single quotes for strings
- trailing commas in multiline objects/arrays
- strong separation between imports, interfaces, and logic
- explicit dependency injection using constructors

Example:

```ts
@Injectable()
export class TenantsService {
    constructor(private readonly prisma: DatabaseService) {}

    async findOne(managerId: string, tenantId: string) {
        const tenant = await this.prisma.db.orm.public.Tenant
            .where({
                id: tenantId,
                managerId,
            })
            .first();

        if (!tenant) {
            throw new NotFoundException('Tenant not found');
        }

        return tenant;
    }
}
```

### 2. Prefer module-based, service-layer logic

Do not put business logic in controllers. Controllers should route requests and delegate to a service. Services should own validation, lookups, and database writes.

### 3. Use Prisma 8 ORM access through `DatabaseService`

The application exposes the database through `DatabaseService`:

```ts
import { DatabaseService } from '@/database/database.service';
```

Follow the established query style:

```ts
await this.prisma.db.orm.public.Property
    .where({
        id: propertyId,
        managerId,
    })
    .first();
```

Common patterns already used in the repo:

- `.where({ managerId }).all()` for listing records scoped to a manager
- `.where({ id, managerId }).first()` for fetch-by-id checks
- `if (!record) throw new NotFoundException('X not found')`
- `.update({ ... })` for mutating records
- explicit status values such as `'ACTIVE'` and `'INACTIVE'`

### 4. Scope data by `managerId` unless the domain explicitly allows otherwise

This is a core project convention. Most queries ensure the user is only acting on their own records. If a service works on a resource, include `managerId` in the lookup conditions.

### 5. Keep DTOs explicit and validation-driven

DTOs live in `dto/` folders and define request payloads clearly.

The project uses the global validation pipeline in `src/main.ts`:

```ts
new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
})
```

When adding new endpoints, keep DTOs narrow, typed, and aligned with the same validation pattern.

### 6. Use project-specific exception patterns

Follow the established exceptions already used in services:

- `NotFoundException` for missing entities
- `ConflictException` for duplicate email/account registration
- `UnauthorizedException` for failed auth checks
- `Error` for missing configuration values like JWT secrets

### 7. Keep auth and security patterns consistent

Authentication is implemented with:

- `PassportModule`
- `JwtModule`
- `JwtStrategy`
- `ConfigService` for secrets and expiry values

Password hashing uses `argon2`, and users are normalized before storage and lookup:

```ts
const email = dto.email.trim().toLowerCase();
```

Sensitive fields such as `passwordHash` are stripped before returning user objects.

## Documentation and comment style

The project docs are straightforward and product-oriented. They favor:

- clear headings
- short explanatory prose
- code blocks for commands and examples
- practical setup instructions
- concrete API details for local development

### Documentation patterns

- Use short sections with plain English
- Keep examples minimal but runnable
- Prefer command snippets over narrative setup
- Document environment variables and startup steps clearly
- Mention the feature scope and business domain when relevant

Typical README style in this repo:

- summary of the business problem
- installation command
- Prisma contract and database workflow
- local run instructions
- test commands
- Swagger docs URL

## Commands and workflows

Use the existing package scripts instead of inventing ad hoc commands.

```bash
npm install
npm run start
npm run start:dev
npm run build
npm run test
npm run test:e2e
npm run prisma:emit
npm run prisma:db-init
npm run prisma:db-update
```

### Prisma workflow

This project follows a contract-first Prisma process:

```text
contract.prisma / contract builder
  ↓
prisma contract emit
  ↓
generated Prisma runtime artifacts
  ↓
database sync or migration planning
```

Before database work, generate the Prisma contract artifacts and ensure the database runtime matches the project contract.

### API docs

The app exposes Swagger at:

```text
http://localhost:3000/docs
```

The docs are configured in `src/main.ts` and include bearer-auth support.

## Task guidance for AI work

When making changes in this repository:

1. Understand the feature before editing.
2. Keep the request aligned with the module structure already in place.
3. Prefer service-layer logic and `DatabaseService` access over direct application setup.
4. Keep manager-scoped access checks in place.
5. Add or update DTOs when introducing request inputs.
6. Reuse the same naming style: `create`, `findAll`, `findOne`, `update`, `archive`.
7. Maintain the app's existing documentation tone: concise, descriptive, and command-driven.
8. Keep changes minimal and consistent with the surrounding module.

## Domain-specific notes

This project is strongly centered on real-estate management. When adding features, aim for domain clarity and ownership boundaries.

Examples:

- properties belong to a manager
- tenants are created under a manager context
- invoices and payment allocations are linked to domain records, not generic global entities
- reports should reflect the relevant property/tenant/invoice relationships
- queues and document services should remain isolated and reusable

## Summary

The project prefers:

- NestJS modules and dependency injection
- service-oriented business logic
- Prisma contract-first database access
- manager-scoped record access
- DTO validation and explicit exceptions
- concise, practical documentation and command-oriented setup

When editing this codebase, match these conventions closely to remain consistent with the existing implementation and project style.
