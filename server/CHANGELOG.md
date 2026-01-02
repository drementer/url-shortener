# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Renamed API endpoint from `/api/url` to `/api/urls` for RESTful compliance (plural resource naming)

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

[Unreleased]: https://github.com/username/url-shortener/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/username/url-shortener/releases/tag/v1.0.0
