import mongoose from 'mongoose';
import { ALLOWED_MIME_TYPES } from '../constants/index.js';

export const fileMetadataSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    fileName: { type: String, required: true },
    path: { type: String, required: true },
    mimetype: { type: String, required: true, enum: Object.keys(ALLOWED_MIME_TYPES) },
    size: { type: Number, required: true, min: 0 },
    documentType: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);
