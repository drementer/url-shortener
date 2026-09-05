# URL Shortener

A fast and simple URL shortener monorepo built with Bun workspaces.

## Features

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
│   ├── services/           # Business rules
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

### Create Short URL

```http
POST /api/urls
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
```

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
returned, since this endpoint requires no authentication.

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

Create a `.env` file in the server directory:

```env
DATABASE_URL="file:./dev.db"   # required
PORT=3001                      # optional, defaults to 3001
CLIENT_URL=http://localhost:8080   # optional, defaults to http://localhost:8080
NODE_ENV=development           # optional, defaults to development
```

These are validated on boot in `server/configs/env.ts`. A missing or malformed
value stops the process with an explicit message instead of failing later on a
request.

## License

ISC
