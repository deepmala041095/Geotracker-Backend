# Geotracker Backend – Setup Summary (Viva Prep)

## 🚀 Complete Deployment Guide: Docker + Render + PostgreSQL/PostGIS

### 🧱 1. Project Structure
```
backend/
├── Dockerfile
├── render.yaml
├── package.json
├── src/
│   ├── models/
│   ├── routes/
│   └── server.js
├── .env.example
└── README.md
```

### 🐳 2. Docker Setup (Optimized Multi-stage Build)
```dockerfile
# 1) Install dependencies (with dev deps for build)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# 2) Build TypeScript -> dist
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# 3) Install production-only dependencies
FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

# 4) Final production image
FROM node:20-alpine
WORKDIR /app
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./
ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000
CMD ["node", "dist/server.js"]
```

**Key Benefits:**
- 🚀 Smaller final image (no dev dependencies)
- 🔒 More secure (no source code in production)
- ⚡ Faster builds with proper layer caching
- 🛠️ Proper TypeScript compilation

### ⚙️ 3. Render Configuration (render.yaml)
```yaml
services:
  - type: web
    name: geotracker-backend
    env: docker
    plan: free
    branch: main
    autoDeploy: true
    envVars:
      - key: DATABASE_URL
        sync: false
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 5000
```

### 🚀 4. Deployment Steps

1. **Initialize Git (if new project)**
   ```bash
   git init
   git add .
   git commit -m "Initial commit with Docker and render.yaml"
   git branch -M main
   git remote add origin https://github.com/<your-username>/geotracker-backend.git
   git push -u origin main
   ```

2. **Deploy on Render**
   - Go to [Render.com](https://render.com)
   - Click "New +" → "Blueprint"
   - Connect GitHub repo
   - Click "Deploy Blueprint"

3. **Setup PostgreSQL + PostGIS**
   - In Render: "New +" → "PostgreSQL"
   - Create database (Free plan available)
   - In DB SQL Console, run:
     ```sql
     CREATE EXTENSION IF NOT EXISTS postgis;
     ```
   - Add `DATABASE_URL` to Environment Variables

### 🔄 Auto-Deployment Setup
For existing deployments:
1. Add `render.yaml` to your repo
2. Push to GitHub
3. In Render Dashboard → your service → Settings → Deploys
4. Connect GitHub repository
5. Toggle "Auto Deploy" to ON
6. Verify environment variables
7. Trigger manual deploy once

### ✅ Verification
- Check logs in Render Dashboard
- Test API endpoints
- Verify PostGIS functions:
  ```sql
  SELECT PostGIS_version();
  ```

### 🌐 Access Your API
Your API will be available at:
`https://geotracker-backend.onrender.com`

---

## Original Setup Summary (Below)

## Quick Guide: Deploy Backend API with Docker on Render

- Step 1: Prepare backend (already done)
  - Required files in backend/: Dockerfile, package.json, src/, .dockerignore, .env.example (optional)
  - Local test (optional):
    - `docker build -t geotracker-backend .`
    - `docker run -p 5002:3000 -e DATABASE_URL="postgresql://..." geotracker-backend`

- Step 2: Push to GitHub
  - Create repo (e.g., Geotracker-Backend) and push code (Dockerfile included).

- Step 3: Render deployment (recommended)
  - Render → New → Web Service → Deploy from Git Repository
  - Select your repo (Render auto-detects Dockerfile)
  - Set Environment Variables:
    - `DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DBNAME?sslmode=require`
    - `PORT` (Render auto-sets; app uses it)
  - Deploy. Render will build the image and run the container.
  - You’ll get a URL like: `https://<service>.onrender.com`

- Optional: Prebuilt Docker image path
  - Build/push to Docker Hub:
    - `docker build -t yourusername/geotracker-backend:v1 .`
    - `docker push yourusername/geotracker-backend:v1`
  - On Render: Deploy from Docker Image → `docker.io/yourusername/geotracker-backend:v1`

- Tips
  - List images: `docker images`
  - Clean old images: `docker image prune -a`
  - Logs: Render service → Logs tab
  - Health path: `/health`

Note: This project uses Sequelize + PostgreSQL/PostGIS (no Prisma). Ensure PostGIS is enabled on the DB (`CREATE EXTENSION IF NOT EXISTS postgis;`).


## Tech Stack and Structure
- Node.js (TypeScript), Express
- ORM: Sequelize (PostgreSQL + PostGIS)
- Folder structure:
  - src/app.ts (Express app + startup)
  - src/db.ts (Sequelize singleton, SSL)
  - src/models/POI.ts (Sequelize model, geometry Point 4326)
  - src/controllers/poiController.ts (CRUD + nearby)
  - src/routes/poiRoutes.ts (route definitions)
- Tooling: ts-node-dev (dev), TypeScript, Docker, docker-compose

## Why Sequelize + PostGIS
- Rich geospatial support with `GEOMETRY(Point,4326)`.
- Efficient radius/nearby search using `ST_DWithin` and `ST_Distance`.
- Works seamlessly with managed Postgres (Render) and SSL.

## Database Setup (Render PostgreSQL + PostGIS)
- DATABASE_URL example (Render):
  - postgresql://USER:PASSWORD@HOST:PORT/DBNAME?sslmode=require
- One-time DB extension:
  - CREATE EXTENSION IF NOT EXISTS postgis;

## Environment Configuration
- .env (for local/dev):
  - DATABASE_URL=postgresql://... (no quotes when used by Docker/compose)
  - PORT=3000
- src/db.ts: loads env, enforces SSL (`rejectUnauthorized=false`), and throws if DATABASE_URL missing.

## How to Create, Install, and Run (Local)
- Clone repo and enter backend folder
- Install deps: `npm install`
- Create `.env` with:
  - `DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DBNAME?sslmode=require`
  - `PORT=3000`
- Ensure PostGIS enabled on DB: `CREATE EXTENSION IF NOT EXISTS postgis;`
- Start dev server: `npm run dev`
- Health check: http://localhost:3000/health

## API Endpoints
- GET /api/pois (pagination: ?page=1&limit=50)
- POST /api/pois (name, description?, latitude?, longitude?, tags?, rating?)
- PUT /api/pois/:id
- DELETE /api/pois/:id
- GET /api/pois/nearby?lat=..&lng=..&radius=.. (km)

## Notable Implementation Details
- On startup (src/app.ts):
  - sequelize.authenticate()
  - CREATE EXTENSION IF NOT EXISTS postgis
  - sequelize.sync()
- POI model (src/models/POI.ts):
  - id (SERIAL), name, latitude, longitude, description, tags JSONB, rating, location GEOMETRY(Point,4326)
- Nearby search (controllers):
  - Raw SQL uses ST_DWithin + ST_Distance with geography casts to compute distances and filter by radius.

## Dockerization
- Dockerfile (multi-stage):
  1) deps: npm ci
  2) builder: tsc build to dist
  3) prod-deps: npm ci --omit=dev
  4) runner: copies dist + prod node_modules, sets NODE_ENV=production, healthcheck on /health
- .dockerignore excludes node_modules, git files, dist, env, etc.
- Build:
  - docker build -t geotracker-backend .
- Run (explicit env and free port on host):
  - docker run -p 5002:3000 -e DATABASE_URL="postgresql://..." geotracker-backend
  - Health: http://localhost:5002/health

## Docker Compose
- docker-compose.yml:
  - Builds image, runs container mapping host 5001->container 3000 (change if busy)
  - env_file: .env (ensure values are unquoted for compose)
  - healthcheck: /health
- Start:
  - docker compose up --build
- Stop:
  - docker compose down

## Deploying on Render (Backend + Database)
- Database: Render PostgreSQL (enable PostGIS once)
- Backend service: Use this repo and Dockerfile
  - Set environment variables:
    - `DATABASE_URL=postgresql://...` (Render provides)
    - `PORT` (Render auto-provides; app uses it)
  - Health check path: `/health`

## Common Issues Encountered and Resolutions
- SSL/TLS required (Render):
  - Enforce SSL in Sequelize dialectOptions and use `sslmode=require`.
- "type geometry does not exist":
  - Run `CREATE EXTENSION IF NOT EXISTS postgis` before syncing models.
- Port already in use (3000/5000/5001):
  - Map to another host port (e.g., 5002:3000) or free the port.
- Docker `--env-file` not loading DATABASE_URL:
  - Ensure .env uses `KEY=VALUE` without quotes for Docker/compose.
  - Alternatively pass `-e DATABASE_URL=...` directly.

## Git/GitHub
- Initialize, commit, set remote, and push to GitHub.
- If permission denied (403), authenticate with repo owner account using a Personal Access Token, or change remote to your own repo.

## How to Run (Local Dev vs Docker)
- Local dev:
  - `npm install`, create `.env`, `npm run dev`, health: http://localhost:3000/health
- Docker (single container):
  - Build and `docker run -p 5002:3000 -e DATABASE_URL=...`
- Docker Compose:
  - `docker compose up --build` (edit ports if busy)

## Talking Points for Viva
- Why Sequelize over alternatives: native PostGIS geometry support and raw spatial queries.
- Security: SSL enforced for managed Postgres; environment variables via .env; .env gitignored.
- Scalability: Pagination on list endpoint; DB connection singleton; containerized deployment.
- Geospatial logic: Point storage in EPSG:4326; ST_DWithin for radius filtering; ST_Distance for ordering.
- DevOps: Multi-stage Docker image for small runtime; healthcheck for readiness; compose for local run.

## Example curl commands
- List POIs (page 1, 50 per page)
```bash
curl -s "http://localhost:3000/api/pois?page=1&limit=50" | jq .
```

- Get a specific POI by ID
```bash
curl -s "http://localhost:3000/api/pois/1" | jq .
```

- Create a POI (sets geometry from lat/lng)
```bash
curl -s -X POST http://localhost:3000/api/pois \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Place",
    "description": "Nice spot",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "tags": ["park"],
    "rating": 4.5
  }' | jq .
```

- Update a POI
```bash
curl -s -X PUT http://localhost:3000/api/pois/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Name", "rating": 4.7}' | jq .
```

- Delete a POI
```bash
curl -s -X DELETE http://localhost:3000/api/pois/1 -i
```

- Nearby search (radius in km)
```bash
curl -s "http://localhost:3000/api/pois/nearby?lat=12.9716&lng=77.5946&radius=5" | jq .
```

Note: If running with Docker/compose and mapped to host port 5001 or 5002, replace 3000 accordingly.

## Simple ER Diagram (text)
- POI
  - id (PK, serial)
  - name (string, required)
  - description (string, nullable)
  - latitude (float, nullable)
  - longitude (float, nullable)
  - location (geometry(Point,4326), nullable)
  - tags (JSONB)
  - rating (float, nullable)
  - createdAt (timestamp)
  - updatedAt (timestamp)
