# URL Shortener

A fast and simple URL shortener built with Express, Prisma, and SQLite.

## Features

- **URL Shortening** - Generate short codes for long URLs
- **Custom Slugs** - Create memorable custom short links
- **Analytics** - Track clicks with user agent, referer, and IP
- **Link Expiry** - Set expiration time for temporary links
- **Click Statistics** - View detailed click history and daily stats

## Tech Stack

- **Runtime**: Bun
- **Framework**: Express 5
- **Database**: SQLite with Prisma ORM
- **Security**: Helmet, CORS, Rate Limiting

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed

### Installation

```bash
cd server
bun install
```

### Database Setup

```bash
bunx prisma migrate dev
```

### Run Development Server

```bash
bun dev
```

Server will start at `http://localhost:3000`

## API Reference

### Create Short URL

```http
POST /api/urls
Content-Type: application/json

{
  "url": "https://example.com",
  "customSlug": "my-link",    // optional
  "expiresIn": 24             // optional, hours
}
```

**Response:**

```json
{
  "id": "cmjpskm3j000012gdkaq2hbbz",
  "shortCode": "8XERSZ",
  "customSlug": null,
  "originalUrl": "https://example.com",
  "expiresAt": null,
  "createdAt": "2025-12-28T13:55:19.904Z"
}
```

### Redirect to Original URL

```http
GET /:code
```

Returns `301 Moved Permanently` redirect to the original URL.

### Get URL Statistics

```http
GET /api/urls/:code/stats
```

**Response:**

```json
{
  "id": "cmjpskrme000112gdyo5ehbh2",
  "shortCode": "ggl",
  "originalUrl": "https://google.com",
  "customSlug": "ggl",
  "clicks": 5,
  "expiresAt": "2025-12-29T13:55:27.055Z",
  "createdAt": "2025-12-28T13:55:27.062Z",
  "clickEvents": [
    {
      "id": "cmjpskvgr000312gdc21rlsqn",
      "userAgent": "Mozilla/5.0...",
      "referer": "https://twitter.com",
      "ip": "::1",
      "createdAt": "2025-12-28T13:55:32.043Z"
    }
  ],
  "clicksByDate": {
    "2025-12-28": 5
  }
}
```

### Delete URL

```http
DELETE /api/urls/:code
```

### Health Check

```http
GET /health
```

## Project Structure

```
server/
├── prisma/
│   ├── schema.prisma       # Database models
│   └── migrations/         # Migration files
├── services/
│   ├── prisma.service.ts   # Prisma client singleton
│   └── url.service.ts      # URL CRUD & analytics
├── router/
│   ├── index.routes.ts     # Main router
│   └── url.routes.ts       # URL API routes
├── utils/
│   └── shortcode.ts        # Short code generator
├── config/
│   └── cors.config.ts      # CORS configuration
├── server.ts               # Express app setup
└── index.ts                # Entry point
```

## Environment Variables

Create a `.env` file in the server directory:

```env
DATABASE_URL="file:./dev.db"
PORT=3000
NODE_ENV=development
```

## License

ISC

