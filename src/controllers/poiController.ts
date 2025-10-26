import { Request, Response } from 'express';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../db';
import { POI, POICreationAttributes } from '../models/POI';

export const getAllPOIs = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 50);
    const offset = (page - 1) * limit;
    const { rows, count } = await POI.findAndCountAll({
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });
    res.json({ data: rows, page, limit, total: count });
  } catch (e: any) {
    res.status(500).json({ message: e?.message || 'Failed to fetch POIs' });
  }
};

export const createPOI = async (req: Request, res: Response) => {
  try {
    const { name, description, latitude, longitude, tags, rating } = req.body;
    const location = latitude != null && longitude != null
      ? { type: 'Point', coordinates: [Number(longitude), Number(latitude)], crs: { type: 'name', properties: { name: 'EPSG:4326' } } }
      : null;
    const poi = await POI.create({ name, description, latitude, longitude, tags, rating, location });
    res.status(201).json(poi);
  } catch (e: any) {
    res.status(500).json({ message: e?.message || 'Failed to create POI' });
  }
};

export const updatePOI = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, latitude, longitude, tags, rating } = req.body;
    const poi = await POI.findByPk(id);
    if (!poi) return res.status(404).json({ message: 'POI not found' });
    const location = latitude != null && longitude != null
      ? { type: 'Point', coordinates: [Number(longitude), Number(latitude)], crs: { type: 'name', properties: { name: 'EPSG:4326' } } }
      : poi.get('location');
    await poi.update({ name, description, latitude, longitude, tags, rating, location });
    res.json(poi);
  } catch (e: any) {
    res.status(500).json({ message: e?.message || 'Failed to update POI' });
  }
};

export const deletePOI = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const poi = await POI.findByPk(id);
    if (!poi) return res.status(404).json({ message: 'POI not found' });
    await poi.destroy();
    res.status(204).send();
  } catch (e: any) {
    res.status(500).json({ message: e?.message || 'Failed to delete POI' });
  }
};

export const getPOIById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const poi = await POI.findByPk(id);
    if (!poi) {
      return res.status(404).json({ message: 'POI not found' });
    }
    res.json(poi);
  } catch (e: any) {
    res.status(500).json({ message: e?.message || 'Failed to fetch POI' });
  }
};

export const getNearbyPOIs = async (req: Request, res: Response) => {
  try {
    // Parse and validate input
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radiusKm = parseFloat((req.query.radius as string) ?? '5');

    if (isNaN(lat) || isNaN(lng) || isNaN(radiusKm)) {
      return res.status(400).json({ 
        message: 'Invalid parameters. lat, lng, and radius must be valid numbers.' 
      });
    }

    // Validate coordinate ranges
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        message: 'Invalid coordinates. Latitude must be between -90 and 90, and longitude between -180 and 180.'
      });
    }

    const radiusMeters = radiusKm * 1000;
    
    // First, check if the PostGIS extension is available
    try {
      await sequelize.query('SELECT PostGIS_version()', { type: QueryTypes.SELECT });
    } catch (e) {
      console.error('PostGIS extension not available:', e);
      return res.status(500).json({ 
        message: 'PostGIS extension is not available in the database' 
      });
    }

    const query = `
      SELECT 
        id, 
        name, 
        description, 
        latitude, 
        longitude,
        tags,
        rating,
        "createdAt",
        "updatedAt",
        ST_AsGeoJSON(location)::json AS location,
        ST_Distance(
          location::geography, 
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) AS distance
      FROM "POIs"
      WHERE 
        location IS NOT NULL
        AND ST_DWithin(
          location::geography, 
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 
          $3
        )
      ORDER BY distance ASC
      LIMIT 200;
    `;

    const pois = await sequelize.query(query, {
      bind: [lng, lat, radiusMeters],
      type: QueryTypes.SELECT,
    });

    // Format the response
    interface POIWithDistance extends Omit<POICreationAttributes, 'location'> {
      id: number;
      distance: string;
      location: any;  // GeoJSON location
    }
    
    const formattedPois = (pois as POIWithDistance[]).map(poi => ({
      ...poi,
      distance: Number(poi.distance)  // Convert string to number
    }));

    res.json(formattedPois);
  } catch (e: any) {
    console.error('Error in getNearbyPOIs:', e);
    res.status(500).json({ 
      message: 'Failed to fetch nearby POIs',
      error: process.env.NODE_ENV === 'development' ? e.message : undefined
    });
  }
};
