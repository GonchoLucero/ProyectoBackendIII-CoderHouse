import mongoose from 'mongoose';
import { ORDER_STATUS, ORDER_PRIORITY } from '../constants/index.js';
import { fileMetadataSchema } from './fileMetadata.schema.js';

const orderItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    street: { type: String, required: true },
    city: { type: String, required: true },
    province: { type: String, required: true },
    zipCode: { type: String, required: true },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [orderItemSchema], validate: (v) => v.length > 0 },
    total: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
    },
    priority: {
      type: String,
      enum: Object.values(ORDER_PRIORITY),
      default: ORDER_PRIORITY.NORMAL,
    },
    shippingAddress: { type: addressSchema, required: true },
    receipts: { type: [fileMetadataSchema], default: [] },
    isMock: { type: Boolean, default: false, select: false },
  },
  { timestamps: true, versionKey: false }
);

orderSchema.index({ status: 1, priority: 1, createdAt: -1 });
orderSchema.index({ user: 1, createdAt: -1 });

export const OrderModel = mongoose.model('Order', orderSchema);
