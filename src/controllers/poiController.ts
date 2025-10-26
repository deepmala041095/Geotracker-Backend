import { Request, Response } from 'express';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../db';
import { POI } from '../models/POI';

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

export const getNearbyPOIs = async (req: Request, res: Response) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusKm = Number(req.query.radius ?? 5);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ message: 'lat and lng are required query params' });
    }
    const query = `
      SELECT *,
        ST_Distance(location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography) AS distance
      FROM "POIs"
      WHERE location IS NOT NULL
        AND ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radiusMeters)
      ORDER BY distance ASC
      LIMIT 200;
    `;
    const pois = await sequelize.query(query, {
      replacements: { lat, lng, radiusMeters: radiusKm * 1000 },
      type: QueryTypes.SELECT,
    });
    res.json(pois);
  } catch (e: any) {
    res.status(500).json({ message: e?.message || 'Failed to fetch nearby POIs' });
  }
};
