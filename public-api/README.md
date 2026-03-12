# JobHuntr Public API

This folder contains a standalone, read-only public API service for JobHuntr data.

It is designed for external developers who want to fetch public job and company data without access to private user information.

## What this API exposes

- Public active jobs
- Public company profiles (for companies with active jobs)
- Public marketplace stats

## What this API does NOT expose

- Authentication endpoints
- User emails or passwords
- Private seeker profile details
- Chat, match, swipe, or notification write endpoints

## Base URL

Local development default:

- http://localhost:5100/api/public

## Endpoints

### `GET /health`

Health check for uptime monitoring.

Example:

```bash
curl http://localhost:5100/api/public/health
```

### `GET /jobs`

Returns paginated active jobs.

Query params:

- `page` (default `1`)
- `limit` (default `20`, max `100`)
- `sort` (`newest` or `oldest`, default `newest`)
- `industry` (exact match, case-insensitive)
- `location` (partial match)
- `companyId` (MongoDB id)
- `q` (searches title, description, skills, and company name)

Example:

```bash
curl "http://localhost:5100/api/public/jobs?page=1&limit=10&industry=Software&q=react"
```

Sample response shape:

```json
{
  "data": [
    {
      "id": "664f...",
      "title": "Frontend Engineer",
      "description": "Build modern UI systems...",
      "salary": "$80k-$100k",
      "industry": "Software",
      "location": "London",
      "postcode": "EC1A 1BB",
      "requiredSkills": ["React", "TypeScript"],
      "createdAt": "2026-03-11T14:16:21.000Z",
      "updatedAt": "2026-03-11T14:16:21.000Z",
      "company": {
        "id": "664a...",
        "name": "Northstar Labs",
        "description": "AI powered talent workflows",
        "industry": "Software",
        "logo": "http://localhost:5000/uploads/company-logos/logo.png",
        "activeJobCount": 0
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 57,
    "totalPages": 6
  }
}
```

### `GET /jobs/:id`

Returns one public active job by id.

Example:

```bash
curl http://localhost:5100/api/public/jobs/664f1234567890abcdef123
```

### `GET /companies`

Returns paginated company profiles that currently have at least one active job.

Query params:

- `page` (default `1`)
- `limit` (default `20`, max `100`)
- `industry` (exact match, case-insensitive)
- `q` (searches company name, description, industry)

Example:

```bash
curl "http://localhost:5100/api/public/companies?page=1&limit=12&q=health"
```

### `GET /stats`

Returns public high-level metrics.

Example:

```bash
curl http://localhost:5100/api/public/stats
```

Sample response shape:

```json
{
  "data": {
    "activeJobs": 57,
    "companiesWithActiveJobs": 14,
    "topIndustries": [
      {
        "industry": "Software",
        "jobCount": 26
      }
    ]
  }
}
```

## Setup

### 1) Install dependencies

From this folder:

```bash
npm install
```

### 2) Configure environment

Copy `.env.example` to `.env` and set values:

```env
PORT=5100
MONGO_URI=mongodb://127.0.0.1:27017/jobhuntr
PUBLIC_API_CORS_ORIGIN=*
PUBLIC_API_KEY=
PUBLIC_API_RATE_LIMIT=120
```

Notes:

- Set `PUBLIC_API_KEY` to require `x-api-key` on all public endpoints.
- `PUBLIC_API_CORS_ORIGIN` can be `*` or comma-separated origins.

### 3) Start service

```bash
npm run dev
```

## Optional API key usage

If `PUBLIC_API_KEY` is set, include header:

```bash
curl \
  -H "x-api-key: your-key" \
  http://localhost:5100/api/public/jobs
```

## JavaScript usage example

```javascript
const apiBase = "http://localhost:5100/api/public";

async function fetchJobs() {
  const response = await fetch(`${apiBase}/jobs?limit=5&q=engineer`);
  if (!response.ok) {
    throw new Error("Public API request failed");
  }

  const payload = await response.json();
  return payload.data;
}

fetchJobs()
  .then((jobs) => {
    console.log("Public jobs:", jobs);
  })
  .catch((error) => {
    console.error(error);
  });
```

## Suggested production hardening

- Put this service behind HTTPS + CDN caching.
- Add a WAF and stricter rate limits per IP and API key.
- Add a static OpenAPI spec and client SDK generation.
