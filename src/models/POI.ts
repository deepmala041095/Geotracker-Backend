// models/POI.ts
import { Model, DataTypes, Optional } from 'sequelize';
import { sequelize } from '../db';

interface POIAttributes {
  id: number;
  name: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  tags: string[] | null;
  rating: number | null;
  location: any; // PostGIS geometry
  createdAt: Date;
  updatedAt: Date;
}

interface POICreationAttributes extends Optional<POIAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class POI extends Model<POIAttributes, POICreationAttributes> implements POIAttributes {
  public id!: number;
  public name!: string;
  public description!: string | null;
  public latitude!: number | null;
  public longitude!: number | null;
  public tags!: string[] | null;
  public rating!: number | null;
  public location!: any;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

POI.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.STRING, allowNull: true },
  latitude: { type: DataTypes.FLOAT, allowNull: true },
  longitude: { type: DataTypes.FLOAT, allowNull: true },
  tags: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: true, defaultValue: [] },
  rating: { type: DataTypes.FLOAT, allowNull: true },
  location: { type: DataTypes.GEOMETRY('POINT', 4326), allowNull: true },
  // Add these two lines
  createdAt: { type: DataTypes.DATE, allowNull: false },
  updatedAt: { type: DataTypes.DATE, allowNull: false }
}, {
  sequelize,
  tableName: 'POIs',
  timestamps: true,  // This will handle the automatic population
});

export { POI, POIAttributes, POICreationAttributes };
