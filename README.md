# POI Backend

TypeScript Express API for Points of Interest (POI) with Sequelize + PostgreSQL/PostGIS.

## Scripts
- dev: Run with ts-node-dev
- build: TypeScript build
- start: Run built server

## Env
Copy `.env.example` to `.env`.

## Endpoints
- GET /api/pois
- POST /api/pois
- PUT /api/pois/:id
- DELETE /api/pois/:id
- GET /api/pois/nearby?lat=..&lng=..&radius=..
