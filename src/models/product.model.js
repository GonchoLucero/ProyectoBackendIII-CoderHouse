import mongoose from 'mongoose';
import { PRODUCT_STATUS } from '../constants/index.js';

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    code: { type: String, required: true, unique: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    category: { type: String, default: 'general', trim: true },
    status: {
      type: String,
      enum: Object.values(PRODUCT_STATUS),
      default: PRODUCT_STATUS.AVAILABLE,
    },
    isDeleted: { type: Boolean, default: false, select: false },
  },
  { timestamps: true, versionKey: false }
);

productSchema.index({ isDeleted: 1, status: 1, category: 1, createdAt: -1 });

export const ProductModel = mongoose.model('Product', productSchema);
