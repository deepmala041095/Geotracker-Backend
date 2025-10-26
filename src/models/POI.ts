// models/POI.ts
import { DataTypes } from 'sequelize';
import { sequelize } from '../db';

export const POI = sequelize.define('POI', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  latitude: { type: DataTypes.FLOAT, allowNull: true },
  longitude: { type: DataTypes.FLOAT, allowNull: true },
  description: { type: DataTypes.STRING, allowNull: true },
  tags: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
  rating: { type: DataTypes.FLOAT, allowNull: true },
  location: { type: DataTypes.GEOMETRY('POINT', 4326), allowNull: true },
}, {
  tableName: 'POIs',
  timestamps: true,
});
