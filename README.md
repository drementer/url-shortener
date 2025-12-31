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

- Coming soon

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
│   ├── controllers/
│   ├── services/
│   ├── repositories/
│   ├── routers/
│   ├── utils/
│   ├── configs/
│   ├── lib/
│   ├── server.ts
│   └── index.ts
└── client/                 # Frontend (coming soon)
    └── CHANGELOG.md        # Client changelog
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

Server will start at `http://localhost:3000`

## Workspace Commands

| Command | Description |
|---------|-------------|
| `bun install` | Install all workspace dependencies |
| `bun run dev:server` | Run server in development mode |
| `bun run build:server` | Build server for production |
| `bun run start:server` | Start production server |
| `bun run dev:client` | Run client in development mode |
| `bun run build:client` | Build client for production |

## API Reference

### Create Short URL

```http
POST /api/url
Content-Type: application/json

{
  "url": "https://example.com",
  "expiresIn": 24             // optional, hours
}
```

**Response (201 Created):**

```json
{
  "id": "cmjpskm3j000012gdkaq2hbbz",
  "shortCode": "8XERSZ",
  "originalUrl": "https://example.com",
  "expiresAt": null,
  "createdAt": "2025-12-28T13:55:19.904Z"
}
```

### List All URLs

```http
GET /api/url
```

**Response:**

```json
[
  {
    "id": "cmjpskm3j000012gdkaq2hbbz",
    "shortCode": "8XERSZ",
    "originalUrl": "https://example.com",
    "expiresAt": null,
    "clicks": 0,
    "createdAt": "2025-12-28T13:55:19.904Z",
    "updatedAt": "2025-12-28T13:55:19.904Z"
  }
]
```

### Redirect to Original URL

```http
GET /:code
```

Returns `301 Moved Permanently` redirect to the original URL.

### Get URL Statistics

```http
GET /api/url/:code
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
  "updatedAt": "2025-12-28T13:55:27.062Z",
  "clickEvents": [
    {
      "id": "cmjpskvgr000312gdc21rlsqn",
      "urlId": "cmjpskrme000112gdyo5ehbh2",
      "userAgent": "Mozilla/5.0...",
      "referer": "https://twitter.com",
      "ip": "::1",
      "createdAt": "2025-12-28T13:55:32.043Z"
    }
  ]
}
```

### Delete URL

```http
DELETE /api/url/:code
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
DATABASE_URL="file:./dev.db"
PORT=3000
NODE_ENV=development
```

## License

ISC
