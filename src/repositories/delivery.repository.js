import mongoose from 'mongoose';
import { DeliveryModel } from '../models/delivery.model.js';

const ORDER_PUBLIC_FIELDS = 'code status priority total user';
const COURIER_PUBLIC_FIELDS = 'first_name last_name phone vehicle role';

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

class DeliveryRepository {
  async getAll({ filter = {}, limit, skip = 0, sort = { createdAt: -1 } } = {}) {
    const [items, total] = await Promise.all([
      DeliveryModel.find(filter)
        .populate('order', ORDER_PUBLIC_FIELDS)
        .populate('courier', COURIER_PUBLIC_FIELDS)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      DeliveryModel.countDocuments(filter),
    ]);
    return { items, total };
  }

  async getById(id) {
    if (!isValidId(id)) return null;
    return DeliveryModel.findById(id)
      .populate('order', ORDER_PUBLIC_FIELDS)
      .populate('courier', COURIER_PUBLIC_FIELDS)
      .lean();
  }

  async getOrderIds() {
    return DeliveryModel.distinct('order');
  }

  async create(data) {
    const created = await DeliveryModel.create(data);
    const { isMock, ...doc } = created.toObject();
    return doc;
  }

  async getByOrder(orderId) {
    if (!isValidId(orderId)) return null;
    return DeliveryModel.findOne({ order: orderId }).lean();
  }

  async update(id, data) {
    if (!isValidId(id)) return null;
    const { matchedCount } = await DeliveryModel.updateOne({ _id: id }, data, { runValidators: true });
    return matchedCount ? DeliveryModel.findById(id).populate('courier', COURIER_PUBLIC_FIELDS).lean() : null;
  }

  async addReceipt(id, metadata) {
    const { matchedCount } = await DeliveryModel.updateOne({ _id: id }, { $push: { receipts: metadata } });
    return matchedCount ? this.getById(id) : null;
  }

  async insertMockMany(deliveries) {
    const docs = await DeliveryModel.insertMany(deliveries.map((d) => ({ ...d, isMock: true })));
    return docs.length;
  }

  async deleteMocks() {
    const { deletedCount } = await DeliveryModel.deleteMany({ isMock: true });
    return deletedCount;
  }
}

export default new DeliveryRepository();
