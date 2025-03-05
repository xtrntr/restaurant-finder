import mongoose, { Schema, Document } from 'mongoose';

export interface IRestaurant extends Document {
  grabId: string;
  name: string;
  location: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };
  address: string;
  cuisines: string[];
  priceLevel: number;
  rating: number;
  reviewCount: number;
  photoUrl: string;
  isOpen: boolean;
  openingHours: {
    displayedHours: string;
    sun?: string;
    mon?: string;
    tue?: string;
    wed?: string;
    thu?: string;
    fri?: string;
    sat?: string;
  };
  distanceInKm: number;
  estimatedDeliveryTime: number;
  lastUpdated: Date;
  area: string;
}

const RestaurantSchema: Schema = new Schema({
  grabId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },
  address: { type: String, required: true },
  cuisines: { type: [String], default: [] },
  priceLevel: { type: Number },
  rating: { type: Number },
  reviewCount: { type: Number },
  photoUrl: { type: String },
  isOpen: { type: Boolean },
  openingHours: {
    displayedHours: { type: String },
    sun: { type: String },
    mon: { type: String },
    tue: { type: String },
    wed: { type: String },
    thu: { type: String },
    fri: { type: String },
    sat: { type: String },
  },
  distanceInKm: { type: Number },
  estimatedDeliveryTime: { type: Number },
  lastUpdated: { type: Date, default: Date.now },
  area: { type: String }
});

// Add geospatial index
RestaurantSchema.index({ location: '2dsphere' });

// Handle the case where the model may have been compiled already
export default mongoose.models.Restaurant as mongoose.Model<IRestaurant> || 
  mongoose.model<IRestaurant>('Restaurant', RestaurantSchema); 