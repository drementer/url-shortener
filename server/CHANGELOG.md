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
- Passwords hashed with scrypt from `node:crypto`, refresh tokens stored as a
  SHA-256 hash
- `authAttempt` rate limit of 10 requests per 15 minutes on the credential routes
- Refresh tokens are consumed atomically, so two requests holding the same token
  cannot both walk away with a valid session

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
