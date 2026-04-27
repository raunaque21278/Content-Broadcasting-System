# Content Broadcasting System Backend

Backend-only assignment using Node.js, Express and PostgreSQL.

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- JWT
- bcryptjs
- multer

## Setup

### Install dependencies

```bash
npm install
Redis Caching:

The /api/content/live endpoint is cached using Redis to improve performance.

- Cache key is generated based on teacherId and subject
- Cached responses expire after 30 seconds
- If cached data exists, it is returned directly without querying the database
- Falls back to database if cache is not available

Example:
live:2:maths