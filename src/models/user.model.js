import mongoose from 'mongoose';
import { USER_ROLES, VEHICLE_TYPES } from '../constants/index.js';
import { fileMetadataSchema } from './fileMetadata.schema.js';

const userSchema = new mongoose.Schema(
  {
    first_name: { type: String, required: true, trim: true },
    last_name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    age: { type: Number, min: 0 },
    phone: { type: String, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: Object.values(USER_ROLES),
      default: USER_ROLES.USER,
    },
    vehicle: { type: String, enum: Object.values(VEHICLE_TYPES) },
    documents: { type: [fileMetadataSchema], default: [] },
    isMock: { type: Boolean, default: false, select: false },
  },
  { timestamps: true, versionKey: false }
);

export const UserModel = mongoose.model('User', userSchema);
