# URL Shortener

A fast and simple URL shortener monorepo built with Bun workspaces.

## Features

- **Accounts** - Email and password sign up, every link owned by its creator
- **URL Shortening** - Generate short codes for long URLs
- **Analytics** - Track clicks with user agent, referer, and IP
- **Link Expiry** - Set expiration time for temporary links
- **Click Statistics** - View detailed click history

## Tech Stack

### Server

- **Runtime**: Bun
- **Framework**: Express 5
- **Database**: SQLite with Prisma ORM
- **Security**: Helmet, CORS, Rate Limiting

### Client

- **Framework**: Vue 3 + Vite
- **State**: Pinia
- **Routing**: Vue Router
- **Styling**: Tailwind CSS with reka-ui components
- **HTTP**: Axios

## Project Structure

```
url-shortener/
├── package.json            # Root package with workspaces
├── server/                 # Backend API
│   ├── CHANGELOG.md        # Server changelog
│   ├── package.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── routes/             # Route definitions and middleware wiring
│   ├── controllers/        # Request parsing and response shaping
│   ├── use-cases/          # One file per use case, wired in each index.ts
│   ├── domain/             # Link rules, free of storage and transport
│   ├── repositories/       # Prisma implementations of the storage contracts
│   ├── mappers/            # Domain to API response mapping
│   ├── validators/         # Request validation schemas (zod)
│   ├── middlewares/        # Rate limiting, validation, error handling
│   ├── errors/             # Domain error types
│   ├── configs/            # Environment and CORS configuration
│   ├── utils/
│   ├── db/                 # Prisma client instance
│   ├── tests/
│   ├── types.ts            # Domain shapes and storage contracts
│   ├── server.ts
│   └── index.ts
└── client/                 # Frontend (Vue 3)
    ├── CHANGELOG.md        # Client changelog
    └── src/
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed

### Installation

Install all dependencies from the root directory:

```bash
bun install
```

Or install for a specific workspace:

```bash
bun install --filter server
```

### Database Setup

```bash
cd server
bunx prisma migrate dev
```

### Development

Run the server in development mode:

```bash
# From root directory
bun run dev:server

# Or from server directory
cd server
bun dev
```

Server will start at `http://localhost:3001`

## Workspace Commands

| Command | Description |
|---------|-------------|
| `bun install` | Install all workspace dependencies |
| `bun run dev:server` | Run server in development mode |
| `bun run build:server` | Build server for production |
| `bun run start:server` | Start production server |
| `bun run dev:client` | Run client in development mode |
| `bun run build:client` | Build client for production |

Run the server test suite from the server directory:

```bash
cd server
bun test
```

The suite creates a throwaway SQLite database (`prisma/test.db`) and migrates it
from scratch on every run, so it never touches development data.

## API Reference

### Authentication

Every `/api/urls` route belongs to an account and requires an access token. Only
the redirect (`GET /:code`), the health check and the auth routes themselves are
public.

```http
POST /api/auth/register
POST /api/auth/login
Content-Type: application/json

{ "email": "user@example.com", "password": "correct horse battery" }
```

**Response (201 Created for register, 200 OK for login):**

```json
{
  "user": { "id": "cmjps...", "email": "user@example.com", "createdAt": "..." },
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "3f0c1d1e9a7b4c2d...",
  "expiresIn": 900
}
```

Send the access token on every other request:

```http
Authorization: Bearer <accessToken>
```

Once it expires, exchange the refresh token for a new pair with
`POST /api/auth/refresh`. Each refresh token works exactly once: the exchange
retires it, and replaying a retired one is treated as a leak and ends every
session of that user. `POST /api/auth/logout` ends a single session, and
`GET /api/auth/me` answers with the account behind an access token.

### Create Short URL

```http
POST /api/urls
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "url": "https://example.com",
  "customSlug": "my-link",    // optional, 3-32 chars of [A-Za-z0-9_-]
  "expiresIn": 24             // optional, whole hours, 1-8760
}
```

**Response (201 Created):**

```json
{
  "id": "cmjpskm3j000012gdkaq2hbbz",
  "shortCode": "my-link",
  "originalUrl": "https://example.com",
  "clicks": 0,
  "expiresAt": null,
  "createdAt": "2025-12-28T13:55:19.904Z"
}
```

Invalid input answers `400` with the failing rule, and a custom slug that is
already taken answers `409`:

```json
{ "error": "This custom slug is already in use" }
```

Reserved slugs: `api`, `404`, `expired`, `stats`.

### List All URLs

```http
GET /api/urls
Authorization: Bearer <accessToken>
```

Answers with the links of the signed in user only.

**Response:**

```json
[
  {
    "id": "cmjpskm3j000012gdkaq2hbbz",
    "shortCode": "8XERSZ",
    "originalUrl": "https://example.com",
    "clicks": 0,
    "expiresAt": null,
    "createdAt": "2025-12-28T13:55:19.904Z"
  }
]
```

### Redirect to Original URL

```http
GET /:code
```

Returns a `302 Found` redirect to the original URL. A click is
recorded only for a live link. An unknown code redirects to `CLIENT_URL/404` and
an expired one to `CLIENT_URL/expired/:code`.

### Get URL Statistics

```http
GET /api/urls/:code
Authorization: Bearer <accessToken>
```

**Response:**

```json
{
  "id": "cmjpskrme000112gdyo5ehbh2",
  "shortCode": "abc123",
  "originalUrl": "https://google.com",
  "clicks": 5,
  "expiresAt": "2025-12-29T13:55:27.055Z",
  "createdAt": "2025-12-28T13:55:27.062Z",
  "clickEvents": [
    {
      "id": "cmjpskvgr000312gdc21rlsqn",
      "userAgent": "Mozilla/5.0...",
      "referer": "https://twitter.com",
      "createdAt": "2025-12-28T13:55:32.043Z"
    }
  ]
}
```

`clicks` is derived from the recorded click events, so the list and the
statistics endpoint always agree. Visitor IP addresses are stored but never
returned.

A code belonging to another account answers `404`, exactly like an unknown one,
so the endpoint cannot be used to find out which short codes are taken. Deleting
one (`DELETE /api/urls/:code`) follows the same rule.

### Delete URL

```http
DELETE /api/urls/:code
```

**Response:**

```json
{
  "message": "URL deleted successfully"
}
```

### Health Check / Status

```http
GET /api/status
```

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2025-12-28T13:55:19.904Z"
}
```

## Changelogs

- [Server Changelog](server/CHANGELOG.md)
- [Client Changelog](client/CHANGELOG.md)

## Environment Variables

Copy the template and fill it in. It lists every variable with its default and
says which ones are required:

```bash
cd server
cp .env.example .env
```

The only value without a sensible default is `JWT_ACCESS_SECRET`; generate one
with `openssl rand -hex 32`.

These are validated on boot in `server/configs/env.ts`. A missing or malformed
value stops the process with an explicit message instead of failing later on a
request.

## License

ISC
