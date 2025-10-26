# GeoTracker Backend – Deployment & Setup Guide

## 🚀 Complete Deployment: Docker + Render + PostgreSQL/PostGIS

### Table of Contents
- [Project Structure](#-1-project-structure)
- [Docker Setup](#-2-docker-setup)
- [Local Development](#-3-local-development)
- [Render Deployment](#-4-render-deployment)
- [Database Configuration](#-5-database-configuration)
- [API Endpoints](#-6-api-endpoints)
- [Troubleshooting](#-troubleshooting)

### 🧱 1. Project Structure
```
backend/
├── Dockerfile                 # Multi-stage Docker build
├── docker-compose.yml         # Local development
├── render.yaml               # Render deployment config
├── package.json
├── tsconfig.json
├── .env.example              # Environment template
├── src/
│   ├── models/              # Database models
│   │   └── POI.ts           # Point of Interest model
│   ├── routes/              # API routes
│   │   └── poiRoutes.ts     # POI endpoints
│   ├── controllers/         # Request handlers
│   │   └── poiController.ts # POI logic
│   ├── db/                  # Database config
│   │   └── sequelize.ts     # Sequelize setup
│   └── app.ts               # Express app
└── README.md
```

### 🐳 2. Docker Setup (Optimized Multi-stage Build)

#### Development
```dockerfile
# Base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source
COPY . .

# Expose port
EXPOSE 5000

# Start development server
CMD ["npm", "run", "dev"]
```

#### Production (Multi-stage)
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
RUN npm ci --only=production

# 4) Final production image
FROM node:20-alpine
WORKDIR /app

# Copy production dependencies
COPY --from=prod-deps /app/node_modules ./node_modules

# Copy built files
COPY --from=builder /app/dist ./dist
COPY package.json ./

# Environment variables
ENV NODE_ENV=production
ENV PORT=5000
ENV TZ=UTC

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:${PORT}/health || exit 1

# Expose port
EXPOSE 5000

# Start command (using the correct entry point for your application)
CMD ["node", "dist/app.js"]
```

**Key Benefits:**
- 🚀 Smaller final image (no dev dependencies)
- 🔒 More secure (no source code in production)
- ⚡ Faster builds with proper layer caching
- 🛠️ Proper TypeScript compilation

### ⚙️ 3. Local Development

#### docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgres://postgres:postgres@db:5432/geotracker
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev

  db:
    image: postgis/postgis:15-3.3
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: geotracker
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

**Start local development:**
```bash
docker-compose up -d
```

### 🚀 4. Render Deployment

#### render.yaml
```yaml
services:
  - type: web
    name: geotracker-backend
    env: docker
    plan: free
    branch: main
    autoDeploy: true
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: DATABASE_URL
        fromDatabase:
          name: geotracker-db
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
        pattern: "\\\\w{32}"

databases:
  - name: geotracker-db
    databaseName: geotracker
    user: geotracker
    plan: free
    postgresExtensions:
      - name: postgis
        version: "3.3"
```

**Deployment Steps:**
1. Push code to GitHub
2. Connect GitHub repo to Render
3. Render will automatically detect `render.yaml`
4. Monitor build logs in Render dashboard

### 🗄️ 5. Database Configuration

#### Enable PostGIS Extension
```sql
-- Connect to your database
\c your_database_name

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Verify installation
SELECT PostGIS_version();
```

#### Sequelize Configuration
```typescript
// src/db/sequelize.ts
import { Sequelize } from 'sequelize';

const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://user:pass@localhost:5432/db', {
  dialect: 'postgres',
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' 
      ? { 
          require: true, 
          rejectUnauthorized: false 
        } 
      : false,
  },
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    // Using camelCase for model fields to match JavaScript conventions
    // Set to false since we're using camelCase in our models
    underscored: false,
  },
});

export default sequelize;
```

### 🌐 6. API Endpoints

#### Health Check
- `GET /health` - Check if the API is running
  - **Response**: `{ status: 'ok', timestamp: '2025-10-27T01:40:00Z' }`
  - **Authentication**: Not required
  - **Status Codes**:
    - `200`: Service is healthy
    - `503`: Service is not healthy

#### Points of Interest (POI)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/pois` | Get all POIs (paginated) |
| `GET`  | `/api/pois/nearby?lat=12.97&lng=77.59&radius=5` | Get POIs within radius (km) |
| `GET`  | `/api/pois/:id` | Get single POI |
| `POST` | `/api/pois` | Create new POI |
| `PUT`  | `/api/pois/:id` | Update POI |
| `DELETE` | `/api/pois/:id` | Delete POI |

#### Example Requests

**Create POI**
```bash
curl -X POST http://localhost:5000/api/pois \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Taj Mahal",
    "description": "Iconic marble mausoleum",
    "latitude": 27.1750,
    "longitude": 78.0422,
    "tags": ["landmark", "history", "unesco"],
    "rating": 4.8
  }' | jq .
```

**Nearby Search**
```bash
curl "http://localhost:5000/api/pois/nearby?lat=12.9716&lng=77.5946&radius=10" | jq .
```

### 🔍 Troubleshooting

#### Common Issues

1. **Database Connection Fails**
   - Verify `DATABASE_URL` in Render environment variables
   - Check if database is accessible from Render's network
   - Ensure SSL is properly configured

2. **PostGIS Functions Not Found**
   ```sql
   -- Verify PostGIS is installed
   SELECT PostGIS_version();
   
   -- If not installed, run:
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

3. **Build Failures**
   - Check build logs in Render dashboard
   - Verify all required environment variables are set
   - Ensure `package.json` has all required scripts

4. **CORS Issues**
   ```typescript
   // In your Express app
   import cors from 'cors';
   
   const app = express();
   app.use(cors({
     origin: [
       'http://localhost:3000',
       'https://your-frontend-domain.com'
     ]
   }));
   ```

### 🔄 Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection URL | `postgres://user:pass@host:5432/db` |
| `JWT_SECRET` | Yes | Secret for JWT signing | Random 32-char string |
| `NODE_ENV` | No | Environment mode | `production`/`development` |
| `PORT` | No | Port to run the app | `5000` (local), `10000` (Render) |

### 🛠️ Development Workflow

1. **Starting the app**
   ```bash
   # Install dependencies
   npm install
   
   # Start development server
   npm run dev
   ```

2. **Running tests**
   ```bash
   # Run tests
   npm test
   
   # Run tests with coverage
   npm run test:coverage
   ```

3. **Database migrations**
   ```bash
   # Create new migration
   npx sequelize-cli migration:generate --name add-column-to-table
   
   # Run migrations
   npx sequelize-cli db:migrate
   
   # Rollback last migration
   npx sequelize-cli db:migrate:undo
   ```

### 🌟 Quick Reference

#### Default Ports
- **API Server**: `5000` (development), `10000` (production on Render)
- **PostgreSQL**: `5432`

#### API Base URLs
- **Local**: `http://localhost:5000`
- **Production**: `https://your-render-app.onrender.com`

### 🚀 Deploy on Render

#### Prerequisites
- GitHub account with repository access
- Render account (free tier available)
- Docker installed (for local testing)

#### Step 1: Prepare Your Repository
1. Initialize Git repository and push to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit with Docker and render.yaml"
   git branch -M main
   git remote add origin https://github.com/<your-username>/geotracker-backend.git
   git push -u origin main
   ```

2. Verify `render.yaml` is in the root of your repository
3. Check that all environment variables are documented in `.env.example`

#### Step 2: Deploy to Render
1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the repository and branch to deploy
5. Configure the service:
   - **Name**: `geotracker-backend` (or your preferred name)
   - **Region**: Choose the closest to your users
   - **Branch**: `main` (or your deployment branch)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free (or select appropriate plan)
   - **Port**: `10000` (must match the PORT in your environment variables)
   - **Health Check Path**: `/health`

6. **Environment Variables**:
   - Add all variables from your `.env.example`
   - Set `NODE_ENV=production`
   - Set `PORT=10000` (must match Render's port)
   - Configure `DATABASE_URL` with your production database credentials
   - Add `JWT_SECRET` (generate a strong secret)

7. Click "Create Web Service"

#### Step 3: Set Up Database
1. In Render Dashboard, click "New +" → "PostgreSQL"
2. Create database (Free plan available)
3. In DB SQL Console, run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
4. Add `DATABASE_URL` to Environment Variables in your Render service configuration
5. Configure database:
   - **Name**: `geotracker-db`
   - **Database**: `geotracker`
   - **User**: `geotracker`
   - **Plan**: Free (or select appropriate plan)
   - **Region**: Same as your web service

3. After database creation:
   - Go to the database's "Shell" tab
   Run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   SELECT PostGIS_version();
   ```

#### Step 4: Verify Deployment
1. Once deployment completes, check the logs for any errors
2. Test the API:
   ```bash
   curl https://your-render-app.onrender.com/health
   ```
3. Verify endpoints:
   ```bash
   # Get all POIs
   curl https://your-render-app.onrender.com/api/pois
   
   # Test nearby search
   curl "https://your-render-app.onrender.com/api/pois/nearby?lat=12.97&lng=77.59&radius=5"
   ```

### 🚀 Deployment Checklist

1. **Before Deployment**
   - [ ] Set all required environment variables in Render
   - [ ] Verify `render.yaml` configuration
   - [ ] Test locally with `docker-compose up`
   - [ ] Ensure all tests pass
   - [ ] Update API documentation if needed

2. **After Deployment**
   - [ ] Verify health check endpoint: `GET /health`
   - [ ] Test all API endpoints
   - [ ] Check application logs in Render dashboard
   - [ ] Verify database connection and PostGIS functions
   - [ ] Test CORS configuration with frontend (if applicable)

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

## 📚 Additional Resources

- [PostGIS Documentation](https://postgis.net/documentation/)
- [Sequelize Documentation](https://sequelize.org/)
- [Render Documentation](https://render.com/docs)
- [Docker Documentation](https://docs.docker.com/)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)
