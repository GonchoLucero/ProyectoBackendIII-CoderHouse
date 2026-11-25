import mongoose from 'mongoose';
import { DELIVERY_STATUS } from '../constants/index.js';
import { fileMetadataSchema } from './fileMetadata.schema.js';

const deliverySchema = new mongoose.Schema(
  {
    trackingCode: { type: String, required: true, unique: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    courier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: {
      type: String,
      enum: Object.values(DELIVERY_STATUS),
      default: DELIVERY_STATUS.PENDING_ASSIGNMENT,
    },
    estimatedDeliveryDate: { type: Date },
    deliveredAt: { type: Date, default: null },
    receipts: { type: [fileMetadataSchema], default: [] },
    isMock: { type: Boolean, default: false, select: false },
  },
  { timestamps: true, versionKey: false }
);

export const DeliveryModel = mongoose.model('Delivery', deliverySchema);
