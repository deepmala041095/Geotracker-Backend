# GeoTracker Backend API

A RESTful API for managing and querying Points of Interest (POI) with geospatial capabilities, built with Node.js, Express, TypeScript, and PostgreSQL/PostGIS.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- PostgreSQL 12+ with PostGIS extension
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and update with your database credentials
4. Start the development server:
   ```bash
   npm run dev
   ```

## 📦 Scripts

- `npm run dev` - Start development server with hot-reload
- `npm run build` - Build TypeScript to `dist/`
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint

## 🌐 API Endpoints

### POI Management
- `GET /api/pois` - List all POIs (paginated)
- `POST /api/pois` - Create new POI
- `GET /api/pois/:id` - Get POI by ID
- `PUT /api/pois/:id` - Update POI
- `DELETE /api/pois/:id` - Delete POI

### Geospatial Queries
- `GET /api/pois/nearby?lat=<number>&lng=<number>&radius=<number>` - Find POIs within radius (km)

### Health Check
- `GET /health` - API health status

## 🗄 Database

### Requirements
- PostgreSQL 12+
- PostGIS extension

### Setup
```sql
CREATE DATABASE geotracker;
\c geotracker;
CREATE EXTENSION IF NOT EXISTS postgis;
```

## 🐳 Docker

### Development
```bash
docker-compose up -d
```

### Production
```bash
docker build -t geotracker-backend .
docker run -p 5000:5000 geotracker-backend
```

## 🌟 Features

- TypeScript support
- JWT Authentication
- Geospatial queries with PostGIS
- Input validation
- Error handling
- Environment-based configuration

## 📄 License

MIT
