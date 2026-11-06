# NestJS Interview Preparation Guide

## From Beginner to Advanced --- Banking BFF (Backend-for-Frontend) Focus

**Audience:** Developers with practical banking-project experience in a
BFF layer who are new to NestJS\
**Goal:** Understand NestJS concepts, remember them during interviews,
write basic code, and explain real-world banking scenarios.

------------------------------------------------------------------------

## 1. How to explain your experience honestly

You can position your experience like this:

> "I have around two years of experience working on a banking project in
> the Backend-for-Frontend layer. My work has involved building or
> supporting APIs that adapt backend services for frontend channels,
> handling request and response mapping, validations, error handling,
> and service integrations. I am now learning NestJS to build more
> structured and maintainable Node.js services using modules,
> controllers, providers, dependency injection, guards, pipes,
> interceptors, and exception filters."

Only mention responsibilities you have actually performed. If you have
not used NestJS professionally yet, say that you are learning it rather
than claiming production NestJS experience.

### BFF in one minute

A **BFF** is a backend service designed for a particular
frontend/channel. It sits between the frontend and domain/microservices
and shapes data for that frontend.

``` text
Mobile App ──┐
             ├──> BFF ───> Customer Service
Web App ─────┘       ├───> Account Service
                     └───> Transaction Service
```

**Remember:** "BFF adapts backend capabilities to frontend needs."

Typical BFF responsibilities: - Aggregate data from multiple backend
services. - Transform backend responses into frontend-friendly DTOs. -
Validate incoming requests. - Apply channel-specific orchestration. -
Handle authentication context propagation and authorization
integration. - Normalize errors and timeouts. - Avoid owning core
banking business rules that belong in domain services.

A BFF should not become a dumping ground for all business logic.

------------------------------------------------------------------------

# Part I --- NestJS Fundamentals

## 2. What is NestJS?

**Interview definition:** NestJS is a progressive Node.js framework for
building scalable, maintainable server-side applications. It uses
TypeScript by default and provides an architecture based on modules,
controllers, providers, and dependency injection.

NestJS commonly uses Express by default and can also use Fastify.

### Why use NestJS instead of plain Express?

  -----------------------------------------------------------------------
  Express                             NestJS
  ----------------------------------- -----------------------------------
  Minimal, unopinionated framework    Opinionated application
                                      architecture

  You decide project structure        Modules encourage clear boundaries

  Dependency injection is not built   Built-in dependency injection
  in as a core pattern                container

  Middleware and route handlers are   Controllers, guards, pipes,
  commonly assembled manually         interceptors, filters

  Flexible for small services         Helpful for large teams and
                                      enterprise applications
  -----------------------------------------------------------------------

**Memory line:** "Express gives me flexibility; NestJS gives me
structure."

NestJS does not automatically make an application faster or more secure.
Good architecture, coding, configuration, and operations are still
required.

## 3. Create a NestJS project

``` bash
npm i -g @nestjs/cli
nest new banking-bff
cd banking-bff
npm run start:dev
```

Useful CLI commands:

``` bash
nest generate module accounts
nest generate controller accounts
nest generate service accounts
nest generate resource transactions
```

`nest g resource` can generate a resource skeleton, including common
CRUD files. Review generated code rather than assuming it matches your
business requirements.

Typical structure:

``` text
src/
  app.module.ts
  main.ts
  accounts/
    accounts.module.ts
    accounts.controller.ts
    accounts.service.ts
    dto/
      get-account.dto.ts
```

## 4. The four building blocks

### 4.1 Module

**Definition:** A module groups related application capabilities and
declares their dependencies.

**Remember:** "Module = department or boundary."

``` ts
// accounts/accounts.module.ts
import { Module } from '@nestjs/common';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';

@Module({
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
```

Important metadata: - `controllers`: HTTP route handlers owned by the
module. - `providers`: services and other injectable dependencies. -
`imports`: other modules whose exported providers are needed. -
`exports`: providers this module makes available to importing modules.

A provider is not automatically available everywhere. Import the module
that exports it.

### 4.2 Controller

**Definition:** A controller receives incoming requests, selects the
route handler, reads request data, and returns a response.

**Remember:** "Controller = reception desk; it receives and routes."

``` ts
// accounts/accounts.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { AccountsService } from './accounts.service';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get(':accountId')
  getAccount(@Param('accountId') accountId: string) {
    return this.accountsService.getAccount(accountId);
  }
}
```

Keep controllers thin. Put reusable application logic in
providers/services.

### 4.3 Provider / Service

**Definition:** A provider is a class managed by NestJS dependency
injection. A service is a common kind of provider that contains
application logic.

**Remember:** "Service = worker who performs the task."

``` ts
// accounts/accounts.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class AccountsService {
  private readonly accounts = [
    { id: 'A101', currency: 'INR', status: 'ACTIVE' },
  ];

  getAccount(accountId: string) {
    const account = this.accounts.find((item) => item.id === accountId);

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return account;
  }
}
```

This in-memory example is for learning only. Real banking data must come
from an approved data/service layer and must not be stored in process
memory as the source of truth.

### 4.4 Dependency Injection (DI)

**Definition:** DI means a class receives the dependencies it needs from
an external container instead of creating those dependencies itself.

**Remember:** "Do not build your own tool; ask the framework to provide
it."

``` ts
@Injectable()
export class AccountsService {
  constructor(private readonly customerClient: CustomerClient) {}
}
```

NestJS creates and supplies `CustomerClient` if it is registered as a
provider and visible in the module graph.

**Advantages** - Loose coupling. - Easier unit testing with mocks. -
Centralized lifecycle and dependency management. - Easier replacement of
implementations.

**Disadvantages / risks** - Misconfigured modules can cause
dependency-resolution errors. - Too many abstractions can make
navigation harder. - Circular dependencies can indicate poor
boundaries. - Hidden dependencies can make code harder to understand.

**Improvement:** Use clear module boundaries, explicit provider tokens,
and small interfaces/contracts.

------------------------------------------------------------------------

# Part II --- Request Lifecycle and Core Building Blocks

## 5. NestJS request lifecycle

A useful simplified mental model:

``` text
Incoming request
   |
Middleware
   |
Guards
   |
Interceptors (before handler)
   |
Pipes (validate/transform arguments)
   |
Controller handler
   |
Service / provider
   |
Interceptors (after handler)
   |
Response
```

Exception filters handle uncaught exceptions and produce an HTTP
response. Exact execution details can vary by adapter and by where a
component is bound.

**Memory line:** "Middleware prepares, Guard permits, Pipe validates,
Controller routes, Service works, Interceptor wraps, Filter catches."

## 6. Middleware

**Definition:** Middleware runs before the route handler and can inspect
or modify the request and response objects.

Use cases: - Request correlation ID. - Basic request logging. - Parsing
or request enrichment. - Simple cross-cutting HTTP concerns.

``` ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = req.header('x-correlation-id') ?? randomUUID();
    res.setHeader('x-correlation-id', requestId);
    (req as Request & { requestId?: string }).requestId = requestId;
    next();
  }
}
```

Register middleware in a module using
`configure(consumer: MiddlewareConsumer)`.

**Interview distinction:** Middleware is generally route/request
oriented and does not have the same built-in execution context features
as guards, pipes, interceptors, and filters.

## 7. Guards

**Definition:** A guard decides whether a request is allowed to reach a
handler.

**Remember:** "Guard = security gate."

Common uses: - Authentication checks. - Role-based authorization. -
Permission checks. - Channel access rules.

``` ts
import {
  CanActivate, ExecutionContext, Injectable,
} from '@nestjs/common';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return Boolean(request.user);
  }
}
```

This is a simplified illustration. In production, a guard should
validate a trusted authentication result, typically created by a
verified JWT/session strategy or trusted identity provider integration.
Never trust a client-supplied `user` object or role header.

Use:

``` ts
@UseGuards(AuthGuard)
@Get('profile')
getProfile() {
  return { message: 'Authorized' };
}
```

**Authentication vs authorization** - Authentication: Who are you? -
Authorization: What are you allowed to do?

## 8. Pipes

**Definition:** Pipes transform or validate values before they reach a
controller handler.

**Remember:** "Pipe = quality check at the entry."

Built-in pipes include: - `ValidationPipe` - `ParseIntPipe` -
`ParseBoolPipe` - `ParseUUIDPipe` - `DefaultValuePipe`

``` ts
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
  return this.accountsService.findOne(id);
}
```

### DTO and validation

A DTO (Data Transfer Object) defines the shape of data crossing an
application boundary.

Install validation packages:

``` bash
npm install class-validator class-transformer
```

``` ts
import { IsEnum, IsString, Length } from 'class-validator';

export enum AccountType {
  SAVINGS = 'SAVINGS',
  CURRENT = 'CURRENT',
}

export class CreateAccountDto {
  @IsString()
  @Length(3, 40)
  customerId: string;

  @IsEnum(AccountType)
  accountType: AccountType;
}
```

Enable global validation:

``` ts
// main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);
```

-   `whitelist`: strips properties without validation decorators.
-   `forbidNonWhitelisted`: rejects unknown properties instead of
    silently stripping them.
-   `transform`: transforms values to declared DTO types where
    supported.

For financial amounts, validate format, range, currency, scale/decimal
precision, and business constraints. Do not rely on JavaScript
floating-point arithmetic for money calculations.

## 9. Interceptors

**Definition:** An interceptor runs before and/or after a handler. It
can transform results, add logging, measure duration, or implement
cross-cutting behavior.

**Remember:** "Interceptor = wrapper around the journey."

``` ts
import {
  CallHandler, ExecutionContext, Injectable, NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
      })),
    );
  }
}
```

Potential uses: - Response envelope normalization. - Timing and
metrics. - Safe response transformation. - Audit metadata propagation
(not a substitute for a durable audit system).

Avoid logging secrets, full account numbers, PINs, CVVs, access tokens,
or unnecessary personal data.

## 10. Exception filters

**Definition:** An exception filter catches exceptions and controls how
they are converted into HTTP responses.

**Remember:** "Filter = emergency response desk."

``` ts
import {
  ArgumentsHost, Catch, ExceptionFilter, HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json({
      statusCode: status,
      message:
        exception instanceof HttpException
          ? exception.message
          : 'Internal server error',
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
```

Production filters should avoid exposing stack traces or internal
exception details to clients. Log the full diagnostic context securely
on the server and return a stable, safe error contract.

## 11. Quick comparison: middleware vs guard vs pipe vs interceptor vs filter

  -----------------------------------------------------------------------
  Component               Main question           Easy example
  ----------------------- ----------------------- -----------------------
  Middleware              What should happen      Add correlation ID
                          before routing?         

  Guard                   Is this request         Check authenticated
                          allowed?                user/permission

  Pipe                    Is this input valid,    Validate DTO
                          and should it be        
                          transformed?            

  Interceptor             Should I wrap or        Add response envelope
                          transform               
                          execution/result?       

  Filter                  How should this         Normalize error
                          exception become a      response
                          response?               
  -----------------------------------------------------------------------

**Interview memory trick:** M-G-P-I-F = Prepare, Permit, Validate, Wrap,
Catch.

------------------------------------------------------------------------

# Part III --- APIs, Configuration, and Integration

## 12. Route parameters, query parameters, and body

``` ts
@Get(':accountId/transactions')
getTransactions(
  @Param('accountId') accountId: string,
  @Query('limit') limit = '20',
) {
  return this.transactionsService.list(accountId, Number(limit));
}

@Post()
create(@Body() dto: CreateAccountDto) {
  return this.accountsService.create(dto);
}
```

-   `@Param()`: part of the URL path.
-   `@Query()`: URL query string.
-   `@Body()`: request payload.
-   `@Headers()`: request headers.
-   `@Req()` / `@Res()`: raw adapter request/response; use carefully.

For a BFF, use DTOs at the external boundary and map internal service
contracts into a stable frontend response.

## 13. HTTP methods and status codes

  Method   Typical purpose         Idempotent by HTTP semantics?
  -------- ----------------------- ---------------------------------------
  GET      Read resource           Yes
  POST     Create/process action   Usually no
  PUT      Replace resource        Yes
  PATCH    Partial update          Not necessarily; depends on operation
  DELETE   Delete resource         Yes

Useful status codes: - `200 OK`: successful request. - `201 Created`:
resource created. - `202 Accepted`: accepted for asynchronous
processing. - `204 No Content`: successful with no response body. -
`400 Bad Request`: invalid request. - `401 Unauthorized`:
missing/invalid authentication. - `403 Forbidden`: authenticated but not
allowed. - `404 Not Found`: resource not found. - `409 Conflict`: state
conflict. - `422 Unprocessable Content`: syntactically valid but
semantically invalid input (if adopted by API contract). -
`429 Too Many Requests`: rate limit. - `500 Internal Server Error`:
unexpected server error. - `502 Bad Gateway`: invalid upstream
response. - `503 Service Unavailable`: service unavailable. -
`504 Gateway Timeout`: upstream timeout.

## 14. Calling another service with HttpModule

Install/use Nest's HTTP module:

``` bash
npm install @nestjs/axios axios
```

``` ts
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

@Module({
  imports: [HttpModule],
})
export class CustomersModule {}
```

``` ts
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout } from 'rxjs';

@Injectable()
export class CustomerClient {
  constructor(private readonly http: HttpService) {}

  async getCustomer(customerId: string) {
    try {
      const response = await firstValueFrom(
        this.http.get(
          `https://customer-service.example/customers/${encodeURIComponent(customerId)}`,
        ).pipe(timeout(3000)),
      );

      return response.data;
    } catch {
      throw new ServiceUnavailableException(
        'Customer service is temporarily unavailable',
      );
    }
  }
}
```

This is a learning example. In production: - Configure base URLs and
credentials securely. - Use connection/request timeouts. - Define retry
rules only for safe/retryable operations. - Add circuit
breaking/bulkheads where appropriate. - Validate upstream response
contracts. - Propagate trace/correlation IDs. - Do not blindly retry
money-moving POST requests. - Do not return raw upstream errors to
clients.

## 15. Configuration and environment variables

Install:

``` bash
npm install @nestjs/config
```

``` ts
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
})
export class AppModule {}
```

``` ts
constructor(private readonly config: ConfigService) {}

const baseUrl = this.config.get<string>('CUSTOMER_SERVICE_URL');
```

Best practices: - Keep secrets out of source control. - Validate
required environment variables at startup. - Use a secrets manager in
production. - Separate local, test, staging, and production
configuration. - Never log secret values.

## 16. Authentication and authorization

A common JWT flow:

``` text
Client -> Login / Identity Provider
       <- Access token

Client -> BFF + Bearer token
BFF -> Verify token / trusted identity integration
BFF -> Guard checks required permission
BFF -> Downstream call with approved identity context
```

Key concepts: - JWT: signed claims in a token; signing is not
encryption. - Access token: short-lived credential used to access
APIs. - Refresh token: used to obtain new access tokens, with secure
rotation/storage policies. - Authentication: verify identity. -
Authorization: enforce permissions. - RBAC: permissions based on
roles. - ABAC: decisions based on attributes/context. - Least privilege:
grant only the access required.

Banking considerations: - Validate issuer, audience, signature, expiry,
and allowed algorithms. - Do not accept unsigned or weakly validated
tokens. - Do not put secrets or sensitive account data in JWT claims. -
Enforce object-level authorization: a user must not access another
customer's account by changing an ID. - Propagate identity only through
trusted, authenticated service-to-service channels. - Treat headers from
the public client as untrusted.

## 17. Logging, monitoring, and tracing

Know the difference: - Logs: what happened. - Metrics: how often/how
much/how long. - Traces: where time was spent across services.

Important fields: - correlation ID / trace ID - service name and
version - route/template (avoid sensitive raw URL data) - status code -
latency - downstream dependency name - safe error category

Never log passwords, PINs, CVVs, full card numbers, full tokens, or
sensitive customer data. Mask or tokenize identifiers according to
organizational policy.

------------------------------------------------------------------------

# Part IV --- Architecture and Advanced NestJS

## 18. Provider scopes

NestJS provider scopes: - `DEFAULT` (singleton): one instance shared
within the application context. - `REQUEST`: a new instance per request
context. - `TRANSIENT`: a new instance for each consumer that injects
it.

**Interview point:** Singleton is usually the default and efficient.
Request scope can increase allocation and affect performance. Use it
only when request-specific state genuinely needs to live in a provider.

Avoid storing one customer's request data in a singleton service field.
That can cause cross-request data leakage.

## 19. Custom providers and tokens

Useful when injecting a value, external client, or alternative
implementation.

``` ts
export const PAYMENT_CLIENT = Symbol('PAYMENT_CLIENT');

@Module({
  providers: [
    {
      provide: PAYMENT_CLIENT,
      useValue: {
        async checkStatus() {
          return { status: 'UP' };
        },
      },
    },
  ],
  exports: [PAYMENT_CLIENT],
})
export class PaymentsModule {}
```

Inject it:

``` ts
@Injectable()
export class PaymentHealthService {
  constructor(
    @Inject(PAYMENT_CLIENT)
    private readonly paymentClient: {
      checkStatus(): Promise<{ status: string }>;
    },
  ) {}
}
```

Provider strategies: - `useValue`: fixed object/value, often useful in
tests. - `useClass`: choose an implementation class. - `useFactory`:
create dependency using a function. - `useExisting`: alias an existing
provider.

## 20. Circular dependencies

A circular dependency occurs when module/provider A depends on B and B
depends on A.

``` text
AccountsService -> CustomersService
       ^                 |
       |_________________|
```

Preferred fixes: 1. Reconsider ownership and module boundaries. 2.
Extract shared behavior into a third provider/module. 3. Use events or
an orchestration layer if synchronous direct dependency is unnecessary.
4. Use `forwardRef()` only when the circular relationship is genuinely
unavoidable.

`forwardRef()` can resolve some NestJS circular references, but it does
not fix poor architecture.

## 21. Database integration and transactions

NestJS can integrate with TypeORM, Prisma, Sequelize, or direct database
clients. The important interview topic is not just the ORM; it is
transaction correctness.

### Transaction concept

A database transaction groups operations into one atomic unit.

ACID: - Atomicity: all or nothing. - Consistency: constraints remain
valid. - Isolation: concurrent operations behave according to isolation
guarantees. - Durability: committed data survives failures.

### Banking example: prevent two withdrawals from spending the same balance

Suppose balance is ₹10,000 and two requests each try to withdraw ₹8,000.

A naive flow is unsafe:

``` text
Request A reads 10000
Request B reads 10000
A checks enough balance
B checks enough balance
A writes 2000
B writes 2000
```

Both requests may succeed incorrectly if the read/check/write sequence
is not protected.

A safer SQL pattern is an atomic conditional update:

``` sql
UPDATE accounts
SET balance = balance - 8000
WHERE account_id = 'A101'
  AND balance >= 8000;
```

Then inspect affected row count: - `1`: debit condition succeeded. -
`0`: account missing or insufficient balance (distinguish safely with a
follow-up query if required).

In real banking systems, use ledger entries, database transactions,
currency-safe decimal types, idempotency, account status checks, limits,
and audit controls. A balance column alone is not a complete ledger
design.

### Pessimistic vs optimistic locking

-   Pessimistic locking: lock a row while working with it,
    e.g. `SELECT ... FOR UPDATE`.
-   Optimistic locking: update only if a version number is unchanged.

Optimistic SQL example:

``` sql
UPDATE accounts
SET balance = ?, version = version + 1
WHERE account_id = ?
  AND version = ?;
```

If zero rows are updated, another transaction changed the row; reload
and handle the conflict.

## 22. Idempotency

**Definition:** An operation is idempotent when repeating the same
request does not create an additional effect after the first successful
execution.

**Banking example:** A client times out after submitting a transfer. It
does not know whether the transfer completed. Retrying must not debit
the customer twice.

Typical design: 1. Client sends an idempotency key. 2. Server scopes key
to customer/operation. 3. Store key, request fingerprint, status, and
result under a unique constraint. 4. First request processes the
operation. 5. A duplicate with the same key and same payload returns the
saved/in-progress result. 6. Same key with a different payload is
rejected. 7. Retention and expiry follow business/audit requirements.

``` ts
@Post('transfers')
createTransfer(
  @Headers('idempotency-key') key: string,
  @Body() dto: CreateTransferDto,
) {
  return this.transfersService.createIdempotently(key, dto);
}
```

The controller snippet only shows the boundary. Correctness must be
implemented atomically in the service/database layer.

## 23. Microservices communication

Common patterns: - Synchronous REST/HTTP: immediate response, but caller
depends on downstream availability/latency. - gRPC: typed contracts and
efficient service-to-service communication. - Messaging/events:
asynchronous communication and decoupling; requires handling retries,
duplicates, ordering, and dead letters.

Know: - API Gateway: entry point/routing/policy layer for APIs. - BFF:
frontend-specific API composition. - Service discovery: locating service
instances. - Circuit breaker: stop repeatedly calling a failing
dependency for a period. - Bulkhead: isolate resource pools so one
dependency cannot exhaust everything. - Retry: repeat transient failures
under a bounded policy. - Timeout: stop waiting after a defined
duration. - Dead-letter queue: isolate messages that cannot be processed
after policy-defined attempts. - Saga: coordinate a multi-service
business process using steps and compensating actions.

## 24. Events and CQRS

-   Event: a fact that has happened, e.g. `TransferCompleted`.
-   Command: asks the system to do something, e.g. `CreateTransfer`.
-   CQRS: separates the model used to change state from the model used
    to read state.
-   Event-driven architecture: services communicate through events.

Do not confuse an event with a command. An event is a past-tense fact; a
command is a request.

For banking, event publication should be reliable. Learn the
transactional outbox pattern: write business state and an outbox record
in the same DB transaction, then publish the outbox record
asynchronously. Consumers should be idempotent.

## 25. Caching

Possible BFF cache targets: - Product/catalog metadata. - Branch/ATM
reference data. - Non-sensitive configuration. - Carefully selected
read-only data with explicit freshness rules.

Be cautious caching: - Available balance. - Transaction status. -
Customer permissions. - Account ownership or restrictions.

Questions to ask before caching: - Is stale data safe? - Who invalidates
it? - What is the TTL? - Is the cache key tenant/customer/channel
aware? - Can one customer's data leak to another? - What happens when
Redis is unavailable?

## 26. Rate limiting and throttling

Rate limiting controls request volume per user, client, IP, or other
identity.

Use it to reduce abuse and protect dependencies. Banking systems may
require different limits for login, OTP, account reads, and money
movement. Avoid relying only on IP because many customers may share an
IP.

NestJS has throttling integrations available through ecosystem packages.
Configure policies based on the actual threat model and product
requirements.

## 27. API versioning

Version APIs when introducing breaking contract changes.

Examples: - URI: `/v1/accounts` - Header-based versioning - Media-type
versioning

A BFF should shield frontend clients from unnecessary downstream
contract changes, but it must still manage its own public API
compatibility.

## 28. Testing in NestJS

Types of tests: - Unit test: one provider/controller in isolation with
mocks. - Integration test: multiple real components working together,
often with a test database. - E2E test: full HTTP request through the
application.

Example unit test:

``` ts
describe('AccountsService', () => {
  let service: AccountsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [AccountsService],
    }).compile();

    service = moduleRef.get(AccountsService);
  });

  it('returns an account', () => {
    expect(service.getAccount('A101').id).toBe('A101');
  });
});
```

Mock a downstream provider:

``` ts
const moduleRef = await Test.createTestingModule({
  providers: [
    AccountsService,
    {
      provide: CustomerClient,
      useValue: { getCustomer: jest.fn() },
    },
  ],
}).compile();
```

Test: - success paths - invalid DTOs - unauthenticated and unauthorized
requests - downstream timeout/5xx - duplicate idempotency key -
concurrency/race conditions - sensitive-data redaction - contract
compatibility

------------------------------------------------------------------------

# Part V --- BFF Design in a Banking Project

## 29. Example: account overview API

Requirement: Mobile app needs customer profile, account summary, and
recent transactions.

``` text
Mobile App
   |
   v
GET /bff/v1/account-overview
   |
   v
BFF Controller
   |
   v
Overview Service
   |------------------|
   v                  v
Customer Service   Account Service
                      |
                      v
                Transaction Service
   |
   v
Map to mobile response DTO
   |
   v
Mobile App
```

Example response contract:

``` json
{
  "customer": {
    "displayName": "Customer"
  },
  "accounts": [
    {
      "accountId": "masked-or-approved-id",
      "currency": "INR",
      "availableBalance": "12500.00"
    }
  ],
  "recentTransactions": []
}
```

Use strings or a decimal-safe representation for monetary amounts in API
contracts where appropriate. Do not expose full account/card identifiers
unless explicitly approved.

### Parallel calls

If independent calls can run concurrently:

``` ts
const [customer, accounts] = await Promise.all([
  this.customerClient.getCustomer(customerId),
  this.accountClient.getAccounts(customerId),
]);
```

But think about failure behavior: - If customer is mandatory and
accounts are optional, define partial response behavior. - If all data
is required, fail the request safely when a required dependency fails. -
Set timeouts for each dependency. - Consider an overall request
deadline. - Avoid unbounded parallel fan-out.

`Promise.all` rejects when one promise rejects; it does not
automatically cancel the other operations. Use `Promise.allSettled` only
when partial-result behavior is intentionally designed.

## 30. Error mapping in a BFF

Do not blindly pass downstream status codes or messages to the frontend.

Define a stable error contract:

``` json
{
  "code": "ACCOUNT_SERVICE_UNAVAILABLE",
  "message": "Account information is temporarily unavailable",
  "correlationId": "safe-correlation-id"
}
```

Map: - Downstream timeout -\> usually 504 or an agreed
service-unavailable contract. - Downstream unavailable -\> 503 or a
documented BFF error. - Invalid frontend input -\> 400. -
Unauthenticated -\> 401. - Forbidden -\> 403. - Unexpected internal
error -\> 500 with generic client message.

The exact mapping depends on the API contract and gateway conventions.

## 31. Security checklist for a banking BFF

-   Authenticate every protected request.
-   Enforce authorization at the resource/object level.
-   Validate all input using DTOs and pipes.
-   Use TLS for network communication.
-   Protect service-to-service credentials.
-   Apply timeouts and bounded retries.
-   Rate-limit sensitive endpoints.
-   Avoid sensitive data in logs and error messages.
-   Mask account/card identifiers in responses and telemetry.
-   Use secure secret storage and key rotation.
-   Prevent mass assignment by allow-listing DTO properties.
-   Set appropriate CORS policy; CORS is not authentication.
-   Use security headers and appropriate CSRF protection where
    cookie-based authentication applies.
-   Maintain audit trails for security- and money-relevant actions.
-   Do not trust frontend calculations or client-supplied customer
    IDs/roles.
-   Follow organizational policies and applicable regulations.

------------------------------------------------------------------------

# Part VI --- Interview Questions and Answers

## 32. Beginner-level questions

### Q1. What is NestJS?

**Answer:** NestJS is a TypeScript-first Node.js framework for building
maintainable server-side applications. It provides modules, controllers,
providers, dependency injection, and request lifecycle components.

### Q2. What is a module?

**Answer:** A module groups related controllers and providers. It
defines which providers are available internally and which are exported
to other modules.

### Q3. What is a controller?

**Answer:** A controller handles incoming requests and maps routes to
application operations. It should remain thin and delegate work to
services.

### Q4. What is a provider?

**Answer:** A provider is a class/value/factory managed by NestJS DI.
Services are the most common providers.

### Q5. What is dependency injection?

**Answer:** DI supplies a class's dependencies from an external
container. It reduces tight coupling and makes testing easier.

### Q6. What does `@Injectable()` do?

**Answer:** It marks a class as available for NestJS dependency
injection metadata and provider registration.

### Q7. What is a DTO?

**Answer:** A DTO defines the structure of data entering or leaving an
application boundary. It helps keep API contracts explicit and supports
validation.

### Q8. What is a pipe?

**Answer:** A pipe transforms or validates input before it reaches the
route handler.

### Q9. What is a guard?

**Answer:** A guard decides whether a request is allowed to execute a
route handler, commonly for authentication and authorization.

### Q10. What is an interceptor?

**Answer:** An interceptor wraps handler execution and can add logging,
timing, or response transformation.

### Q11. What is an exception filter?

**Answer:** It catches exceptions and formats the HTTP response.

### Q12. What is middleware?

**Answer:** Middleware runs before route handling and can inspect or
modify request/response objects, such as adding a correlation ID.

### Q13. What is the difference between `@Param`, `@Query`, and `@Body`?

**Answer:** `@Param` reads path values, `@Query` reads query-string
values, and `@Body` reads the request payload.

### Q14. What is `main.ts`?

**Answer:** It is the application's bootstrap entry point. It creates
the Nest application and configures global pipes, filters, interceptors,
prefixes, and the listening port.

### Q15. What is the difference between Express and NestJS?

**Answer:** Express is a minimal HTTP framework. NestJS commonly uses
Express underneath but adds a structured architecture and built-in
patterns such as DI, modules, guards, pipes, and interceptors.

## 33. Intermediate-level questions

### Q16. Explain the NestJS request lifecycle.

**Answer:** A simplified flow is middleware, guards, interceptors before
handler, pipes, controller/service execution, interceptors after
handler, and response. Exception filters handle uncaught exceptions.

### Q17. What is the difference between authentication and authorization?

**Answer:** Authentication verifies identity; authorization decides what
that identity can access or do.

### Q18. What is `ValidationPipe`?

**Answer:** It validates DTOs using class-validator metadata and can
transform payloads. `whitelist` removes unknown properties;
`forbidNonWhitelisted` rejects them.

### Q19. What are provider scopes?

**Answer:** Default/singleton, request-scoped, and transient. Choose
request scope only when request-specific provider state is needed.

### Q20. How do modules share services?

**Answer:** The providing module exports a provider, and the consuming
module imports the providing module.

### Q21. What is a custom provider?

**Answer:** A provider registered with a token and a strategy such as
`useValue`, `useClass`, `useFactory`, or `useExisting`.

### Q22. How do you handle global errors?

**Answer:** Use exception filters for consistent response formatting,
and centralized secure logging for diagnostic details. Never expose
stack traces or sensitive information to clients.

### Q23. How do you call external APIs?

**Answer:** Use an HTTP client such as Nest `HttpModule`/`HttpService`,
configure timeouts, validate responses, propagate correlation context,
and map downstream errors to stable API errors.

### Q24. What is a dynamic module?

**Answer:** A dynamic module returns module metadata from a static
method, often to configure reusable modules with options such as a
database URL or feature configuration.

### Q25. What is `forwardRef()`?

**Answer:** It allows NestJS to resolve certain circular module/provider
references. It should be a last resort after considering better module
boundaries.

### Q26. What is the difference between unit and E2E testing?

**Answer:** Unit tests isolate a class and mock dependencies. E2E tests
exercise the application through HTTP routes and verify integrated
behavior.

### Q27. How do you protect an API?

**Answer:** Authenticate, authorize at resource level, validate inputs,
rate-limit, use TLS, protect secrets, apply safe error handling, and log
securely.

### Q28. How do you manage environment variables?

**Answer:** Use configuration management, validate required values at
startup, separate environments, and keep secrets in a secrets manager
rather than source control.

### Q29. What is a BFF?

**Answer:** A BFF is a backend tailored to a particular frontend. It
aggregates and adapts backend data and handles channel-specific
orchestration.

### Q30. Why should controllers be thin?

**Answer:** Thin controllers keep HTTP concerns separate from
business/application logic, improve reuse, and make unit testing easier.

## 34. Advanced-level questions

### Q31. How do you avoid duplicate money transfers after a client timeout?

**Answer:** Implement idempotency keys with a database uniqueness
constraint and persist request state/result. A duplicate request with
the same key and payload returns the existing result; a different
payload using the same key is rejected.

### Q32. How do you prevent race conditions during withdrawals?

**Answer:** Use atomic conditional updates or proper row
locking/transactions, check affected rows, and maintain a ledger. Never
rely on a separate unprotected read-check-write sequence.

### Q33. What is the transactional outbox pattern?

**Answer:** Store the business update and an outbox event in the same
database transaction. A separate publisher sends the event and marks it
delivered. Consumers must tolerate duplicate delivery.

### Q34. What is a circuit breaker?

**Answer:** It temporarily stops calls to a failing dependency, allowing
recovery and protecting the caller from repeated slow failures. Common
states are closed, open, and half-open.

### Q35. Why are retries dangerous in payment APIs?

**Answer:** A retry can repeat a non-idempotent action. Retry only when
the operation is safe, bounded, and protected by idempotency and clear
timeout semantics.

### Q36. How would you design a resilient BFF?

**Answer:** Define dependency criticality, per-call and overall
timeouts, bounded retries for safe operations, circuit breakers,
concurrency limits, fallback/partial response rules, tracing, and stable
error contracts.

### Q37. How do you handle partial failure in `Promise.all`?

**Answer:** Decide whether all results are mandatory. If partial data is
allowed, use `Promise.allSettled` and explicitly map fulfilled/rejected
results. Do not silently hide critical failures.

### Q38. What is optimistic locking?

**Answer:** It uses a version field or similar condition to detect
concurrent updates. If the version changed, the update affects zero rows
and the caller handles the conflict.

### Q39. What is pessimistic locking?

**Answer:** It locks a record during a transaction so competing
transactions cannot modify it in conflicting ways. It can reduce
concurrency and must use careful lock ordering/timeouts.

### Q40. How do you prevent one customer from accessing another customer's account?

**Answer:** Derive the customer identity from a verified authentication
context, then enforce ownership/permission in the service or data query.
Never rely only on an account ID supplied by the client.

### Q41. How do you avoid leaking sensitive information in logs?

**Answer:** Use structured logging, field allow-lists,
masking/tokenization, log-level controls, and automated tests. Never log
credentials, PINs, CVVs, or full tokens.

### Q42. How would you handle a slow downstream service?

**Answer:** Measure latency, set a strict timeout, use bounded
concurrency, circuit breaking, and a documented fallback/partial
response if safe. Escalate through metrics and traces rather than
increasing timeouts blindly.

### Q43. What is the difference between API Gateway and BFF?

**Answer:** An API Gateway is a shared edge layer for routing and
cross-cutting API policies. A BFF is tailored to a specific frontend and
composes/adapts data for that channel. They can coexist.

### Q44. How would you version a BFF API?

**Answer:** Use a versioning strategy such as URI or header versioning,
document compatibility, support migration windows, and avoid exposing
downstream version changes unnecessarily.

### Q45. How do you ensure events are not lost after a database commit?

**Answer:** Use a transactional outbox so the business update and event
record commit together. Publish asynchronously and make consumers
idempotent.

------------------------------------------------------------------------

# Part VII --- Scenario-Based Interview Questions

## 35. Scenario 1: Two ₹8,000 withdrawals from a ₹10,000 balance

**Question:** Two requests arrive at almost the same time. How do you
ensure the customer cannot withdraw ₹16,000?

**Answer:** 1. Authenticate the customer. 2. Verify ownership and
account status. 3. Validate amount and currency. 4. Start a database
transaction. 5. Use an atomic conditional debit or lock the account row.
6. Write a debit ledger entry in the same transaction. 7. Commit only if
all required steps succeed. 8. Return a clear
insufficient-funds/conflict response for the losing request. 9. Record
an audit event.

**Key interview phrase:** "I would enforce the invariant at the database
transaction boundary, not only in Node.js application code."

## 36. Scenario 2: Transfer request times out, and the client retries

**Question:** The BFF submits a transfer. The downstream service
processes it, but the response times out. The mobile app retries. What
do you do?

**Answer:** - Require an idempotency key for the transfer operation. -
Persist the key and request fingerprint under a unique constraint. - If
the same key is received again, return the stored or current operation
status. - Do not initiate a second debit. - Provide a status endpoint so
the client can check the transfer. - Keep the key/result long enough to
cover the business retry window.

**Follow-up:** What if the same key has a different amount? Reject it as
an idempotency conflict.

## 37. Scenario 3: Account service is slow, but customer service is healthy

**Question:** The mobile account overview needs customer and account
data. Customer service responds in 100 ms; account service takes 8
seconds.

**Answer:** - Set a realistic account-service timeout. - Do not let one
dependency consume all BFF resources. - Decide whether customer data can
be returned without account data. - If partial response is allowed,
return an explicit partial status and correlation ID. - If account data
is mandatory, fail with a stable dependency error. - Add metrics/traces
and alert on latency. - Consider circuit breaking and bounded
concurrency.

Do not return an empty account list if that could be interpreted as "the
customer has no accounts."

## 38. Scenario 4: One downstream API returns 500

**Question:** Your BFF calls three services using `Promise.all`. One
returns 500. What happens?

**Answer:** `Promise.all` rejects when one promise rejects. The other
calls are not automatically cancelled. I would first classify which
dependencies are mandatory. For optional data, use `Promise.allSettled`
and map partial results intentionally. For mandatory data, return a
stable failure response and log the downstream failure securely.

## 39. Scenario 5: User changes account ID in the URL

**Question:** A customer is authorized for account A101 but changes the
URL to A202. How do you prevent access?

**Answer:** The BFF must derive identity from a verified token/session
and check account ownership or permission for A202 on every request. A
valid login alone does not authorize every account. Prefer downstream
authorization as well where domain ownership is enforced.

## 40. Scenario 6: A new field is added by the frontend

**Question:** The frontend sends `isAdmin: true` in a create-account
request. What should happen?

**Answer:** The DTO should allow-list accepted fields. Configure
`ValidationPipe` with `whitelist` and `forbidNonWhitelisted` so
unexpected fields are rejected. Never bind arbitrary client fields
directly to privileged domain properties.

## 41. Scenario 7: Customer service changes its response format

**Question:** A downstream team renames `customerName` to `fullName`.
How do you protect the mobile app?

**Answer:** Keep a BFF adapter/mapper between the downstream contract
and frontend DTO. Update the adapter and contract tests. The mobile
response remains stable unless a deliberate public API version change is
required.

## 42. Scenario 8: Duplicate events arrive from a message broker

**Question:** Your transaction consumer receives `TransferCompleted`
twice.

**Answer:** Assume at-least-once delivery. Store a unique
event/operation ID and process the event transactionally with the
consumer's state update. If already processed, acknowledge without
repeating the side effect.

## 43. Scenario 9: BFF response contains another customer's data

**Question:** A production issue reveals cross-customer data in a
response.

**Answer:** 1. Treat it as a security incident and follow incident
response procedures. 2. Contain exposure and disable the unsafe path if
needed. 3. Identify affected requests/customers using trace and audit
records. 4. Check cache keys, request-scoped state, singleton mutable
fields, and authorization filters. 5. Fix the ownership boundary and add
regression tests. 6. Review logs safely without copying sensitive data
into tickets. 7. Follow required notification and remediation processes.

## 44. Scenario 10: A singleton service stores current customer ID

**Question:** A developer adds `this.customerId = request.user.id` to a
singleton service. What is wrong?

**Answer:** A singleton is shared across requests. Concurrent users can
overwrite the field, causing cross-request data leakage. Pass customer
ID as a method argument or use a suitable request-context design. Do not
store per-request mutable state in a singleton.

## 45. Scenario 11: A transfer succeeds but event publication fails

**Question:** The database commit succeeds, but Kafka is unavailable.

**Answer:** If the event is required for downstream processing, use a
transactional outbox. The transfer and outbox record commit together. A
publisher retries delivery later. Consumers must be idempotent. Do not
pretend a direct publish after commit is guaranteed.

## 46. Scenario 12: A new BFF endpoint aggregates five services

**Question:** How do you prevent the endpoint from becoming slow and
fragile?

**Answer:** - Map dependencies and criticality. - Parallelize only
independent calls. - Set per-dependency and overall deadlines. - Limit
fan-out/concurrency. - Use caching only for safe, freshness-tolerant
data. - Define partial-response behavior. - Add circuit breakers and
observability. - Avoid duplicate downstream calls. - Consider moving
complex domain orchestration to a domain service.

## 47. Scenario 13: An API is being called thousands of times

**Question:** How would you protect the BFF?

**Answer:** Apply identity-aware rate limits, request-size limits,
timeouts, concurrency limits, and upstream protection. Use stricter
controls for OTP, login, and transfer APIs. Monitor 429s, latency, and
dependency saturation. Do not use IP-only limiting as the sole policy.

## 48. Scenario 14: The BFF receives a valid token but downstream rejects it

**Question:** What do you investigate?

**Answer:** Check issuer/audience mismatch, expiry, scopes/claims,
signing-key rotation, clock skew, token propagation, and whether the
downstream expects a different service identity or token exchange. Never
log the raw token. Confirm whether the architecture requires token
forwarding or a separate service credential.

## 49. Scenario 15: A downstream service returns malformed JSON or an unexpected field type

**Question:** Should the BFF pass it through?

**Answer:** No. Validate or map the upstream response against the
expected contract. Treat invalid data as an upstream contract failure,
log safe diagnostics, and return a stable error or documented partial
result. Add contract tests.

------------------------------------------------------------------------

# Part VIII --- Practical Coding Exercises

## 50. Exercise: Create a transfer DTO

``` ts
import { IsString, IsNumber, IsPositive, Length } from 'class-validator';

export class CreateTransferDto {
  @IsString()
  @Length(3, 40)
  fromAccountId: string;

  @IsString()
  @Length(3, 40)
  toAccountId: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @IsString()
  @Length(3, 3)
  currency: string;
}
```

For production money handling, consider accepting a decimal string or
integer minor units rather than a JavaScript floating-point number.
Validate currency against an allow-list and enforce business limits in
the service/domain layer.

## 51. Exercise: Controller and service separation

``` ts
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  create(
    @Headers('idempotency-key') key: string,
    @Body() dto: CreateTransferDto,
  ) {
    return this.transfersService.create(key, dto);
  }
}
```

``` ts
@Injectable()
export class TransfersService {
  async create(key: string, dto: CreateTransferDto) {
    if (!key) {
      throw new BadRequestException('Idempotency key is required');
    }

    // Real implementation:
    // 1. Authenticate/authorize using trusted context.
    // 2. Validate transfer rules.
    // 3. Claim idempotency key atomically.
    // 4. Execute ledger/debit/credit transaction.
    // 5. Persist final result and audit/outbox records.
    return { status: 'PENDING_REVIEW' };
  }
}
```

This intentionally does not implement a real transfer. Never use a
placeholder as production money movement logic.

## 52. Exercise: Global prefix and validation

``` ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

------------------------------------------------------------------------

# Part IX --- Common Mistakes and Strong Interview Responses

## 53. Common mistakes

1.  Putting all business logic in controllers.
2.  Treating authentication as authorization.
3.  Trusting customer IDs or roles supplied by the frontend.
4.  Retrying every failed POST request.
5.  Using `Promise.all` without defining partial-failure behavior.
6.  Storing request-specific values in singleton service fields.
7.  Logging tokens or sensitive banking data.
8.  Returning raw downstream errors.
9.  Assuming a BFF should own all domain business rules.
10. Using floating-point numbers carelessly for money.
11. Assuming a successful HTTP response means a transfer is financially
    settled.
12. Using `forwardRef()` to hide architectural problems.
13. Caching balances without freshness and consistency rules.
14. Assuming CORS protects an API from unauthorized access.

## 54. How to answer when you do not know something

Use this structure:

1.  State what you understand.
2.  Explain the principle.
3.  Connect it to a real example.
4.  Be transparent about your hands-on experience.
5.  Explain how you would verify or implement it.

Example:

> "I have not implemented request-scoped providers in a production
> NestJS application yet. My understanding is that request scope creates
> a provider instance for each request context. I would use it only if
> request-specific state genuinely needs provider-level lifetime,
> because it can increase allocation and affect performance. Otherwise,
> I would pass request data explicitly as method parameters."

This is stronger than guessing.

------------------------------------------------------------------------

# Part X --- Revision and Memory Techniques

## 55. One-line revision sheet

  Concept                Remember it as
  ---------------------- -----------------------------------------
  Module                 Department / boundary
  Controller             Reception desk
  Provider               Worker
  Dependency injection   Receive tools instead of creating them
  Middleware             Prepare request
  Guard                  Permission gate
  Pipe                   Validate/transform input
  Interceptor            Wrap execution
  Filter                 Catch and format errors
  DTO                    Data contract
  BFF                    Adapter for a frontend
  JWT                    Signed claims, not encrypted by default
  Idempotency            Same request, no duplicate effect
  Transaction            All-or-nothing group of DB operations
  Optimistic lock        Detect changed version
  Pessimistic lock       Lock before changing
  Circuit breaker        Stop calling an unhealthy dependency
  Bulkhead               Isolate resources
  Outbox                 Commit data and event record together
  CQRS                   Separate write and read models
  Saga                   Multi-service steps with compensation

## 56. Seven-day study plan

  -----------------------------------------------------------------------
  Day                     Study                   Practice
  ----------------------- ----------------------- -----------------------
  1                       NestJS, modules,        Build Accounts module
                          controllers, providers, 
                          DI                      

  2                       Middleware, guards,     Validate account
                          pipes, DTOs             endpoint

  3                       Interceptors, filters,  Add response/error
                          config, HTTP clients    handling

  4                       JWT, authorization,     Protect account
                          logging, security       endpoint

  5                       DB transactions,        Explain
                          locking, idempotency    double-withdrawal
                                                  scenario

  6                       Microservices,          Design account overview
                          resilience, events,     BFF
                          outbox                  

  7                       Testing and scenario    Mock interview and
                          questions               revision
  -----------------------------------------------------------------------

## 57. Active recall questions

Try answering these without looking at the guide:

1.  What problem does NestJS solve compared with plain Express?
2.  Explain module, controller, and provider in 30 seconds.
3.  What is dependency injection, and how does it improve testing?
4.  Guard vs middleware: what is the difference?
5.  Pipe vs interceptor: what is the difference?
6.  How does `ValidationPipe` work?
7.  How do two modules share a provider?
8.  Why can a singleton service cause a data leak if it stores request
    state?
9.  How do you prevent duplicate transfers?
10. How do you prevent concurrent withdrawals from overspending?
11. What happens when one `Promise.all` call rejects?
12. What is a transactional outbox?
13. How do you protect account ownership?
14. How do you handle an unavailable downstream service?
15. What should never be written to banking logs?

## 58. Suggested 60-second NestJS answer

> "NestJS is a TypeScript-based Node.js framework that gives an
> application a structured architecture. A module groups a feature, a
> controller handles incoming HTTP requests, and providers contain
> reusable logic. Dependency injection supplies those providers and
> makes components easier to test. NestJS also provides guards for
> access control, pipes for validation and transformation, interceptors
> for wrapping request/response behavior, middleware for request-level
> processing, and exception filters for consistent error handling. In a
> banking BFF, I would use these building blocks to expose stable
> frontend APIs, aggregate downstream services, validate requests,
> enforce authorization, handle timeouts and errors, and avoid duplicate
> financial operations through idempotency and database transactions."

------------------------------------------------------------------------

## Final interview advice

For your background, prepare deeply in this order:

1.  **NestJS fundamentals:** modules, controllers, providers, DI.
2.  **Request lifecycle:** middleware, guards, pipes, interceptors,
    filters.
3.  **BFF design:** aggregation, mapping, DTOs, downstream calls, error
    contracts.
4.  **Banking correctness:** authorization, idempotency, transactions,
    concurrency, ledger thinking.
5.  **Resilience:** timeouts, retries, circuit breakers, partial
    failures, observability.
6.  **Testing:** unit tests with mocked providers and E2E tests.

Do not try to memorize every paragraph word for word. For each concept,
remember the one-line definition, explain why it exists, write a small
example, and connect it to one banking scenario.
