# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Email and password accounts with `POST /api/v1/auth/register` and `/api/v1/auth/login`
- Bearer access tokens (15 minutes by default) plus refresh tokens exchanged at
  `POST /api/v1/auth/refresh`, with `POST /api/v1/auth/logout` ending a session
- Refresh token rotation: every exchange retires the old token, and replaying a
  retired one is treated as a leak and ends all sessions of that user
- `GET /api/v1/auth/me` for the account behind an access token
- Password reset and change endpoints (`POST /api/v1/auth/password/forgot`,
  `POST /api/v1/auth/password/reset`, `PATCH /api/v1/auth/password`) using
  single-use SHA-256-hashed reset tokens (`PASSWORD_RESET_TTL_MINUTES`, 30
  minutes by default) and Resend mail delivery (`RESEND_API_KEY`, `MAIL_FROM`;
  logs the link to the console outside production when `RESEND_API_KEY` is
  unset); resetting or changing a password revokes all active sessions, and
  changing a password returns a fresh token pair
- Passwords hashed with scrypt from `node:crypto`, refresh tokens stored as a
  SHA-256 hash
- `authAttempt` rate limit of 10 requests per 15 minutes on the credential routes
- Refresh tokens are consumed atomically, so two requests holding the same token
  cannot both walk away with a valid session
- Dynamic database-backed roles (`USER` with 5 active links, `EDITOR` with 10,
  `ADMIN` with unlimited seeded on startup) and atomic per-role active link
  quota enforcement during URL creation
- Admin-only role management endpoints under `/api/v1/roles` (`GET`, `POST`,
  `PATCH`, `DELETE`) and `PUT /api/v1/users/:id/role`, with role claims in JWT
  access tokens validated against the database on authorization
- Strict JSON content negotiation on the JSON API surface (`/api/v1/*` and
  `/health`), returning `415 Unsupported Media Type` for non-JSON request bodies
  and `406 Not Acceptable` when `Accept` excludes `application/json`
- Append-only `AuditLog` stored in a dedicated Prisma SQLite database
  (`prisma-audit/schema.prisma`, configured via `AUDIT_DATABASE_URL`) recording
  authentication events (`auth.register`, `auth.login.succeeded`,
  `auth.login.failed`, `auth.logout`, `auth.refresh.reused`,
  `auth.access.denied`), admin role changes (`role.created`, `role.updated`,
  `role.deleted`, `user.role.assigned`), URL lifecycle events (`url.created`,
  `url.deleted`), and audit log views (`audit.logs.viewed`) without failing
  requests if an audit write errors
- `GET /api/v1/audit-logs` admin-only endpoint with pagination and `action`,
  `actorId`, `from`, and `to` filters

### Changed

- Links now belong to the user who created them; every `/api/v1/urls` route
  requires an access token and only ever sees that user's links
- A link owned by another user answers `404` rather than `403`, so short codes
  cannot be enumerated through the API
- `linkCreate` and `linkDelete` rate limits count per user instead of per IP
- Requires `JWT_ACCESS_SECRET` in the environment, optionally
  `ACCESS_TOKEN_TTL_SECONDS` and `REFRESH_TOKEN_TTL_DAYS`
- Renamed API endpoint from `/api/url` to `/api/urls` for RESTful compliance (plural resource naming)
- Adjusted rate limit windows from 15min/1hr to 1min for faster reset
- Reduced `linkCreate` limit from 30 to 10 requests per window
- Downgraded `standardHeaders` from draft-7 to draft-6 for broader compatibility
- Removed Turkish inline comments from rate limit middleware
- Aligned endpoints with REST conventions: `GET /api/v1/urls` returns a
  paginated `{ data, meta }` envelope instead of a bare array,
  `DELETE /api/v1/urls/:code` and `POST /api/v1/auth/logout` answer `204` with
  no body, URL responses expose `shortCode` without internal `id`, validation
  errors include field-level `details`, and role assignment moved to
  `PUT /api/v1/users/:id/role`
- Switched database primary key defaults from `cuid` to `uuid`
- Resources moved under a version prefix: every `/api/*` route is now
  `/api/v1/*`, so a future breaking change can ship as `v2` while `v1` keeps
  answering
- The health check moved out of the version prefix, from `/api/status` to
  `/health`, so uptime monitors and container probes survive a version bump;
  `health` joins the reserved slugs, since that route would shadow a link
  claiming it
- Server sources regrouped under `src/` into four layers (`domain`,
  `application`, `infrastructure`, `presentation`), so which way a dependency
  may run is visible from the path; tests mirror the same layers
- The role check behind `requireRole` moved into an `authorizeRole` use case,
  so no middleware reaches into a repository
- Relicensed under `AGPL-3.0-or-later` with Section 7(b) attribution terms

### Fixed

- Trim and lowercase email addresses before format validation
- Propagate `body-parser` status codes (`400`, `413`) instead of returning `500`
- Advertise `PUT` and `PATCH` in CORS `allowedMethods`, stabilize URL pagination
  ordering across identical timestamps, and guard role deletion against
  concurrent assignment

## [1.0.0] - 2025-12-28

### Added

- URL shortening with auto-generated short codes using nanoid
- Link expiration with configurable TTL (in hours)
- Click tracking with user agent, referer, and IP logging
- Click statistics endpoint with daily breakdown
- Health check endpoint
- SQLite database with Prisma ORM
- CORS configuration
- Security headers with Helmet
- Bun runtime support

[Unreleased]: https://github.com/drementer/url-shortener/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/drementer/url-shortener/releases/tag/v1.0.0
