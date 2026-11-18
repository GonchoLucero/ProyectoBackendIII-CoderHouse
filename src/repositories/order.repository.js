import mongoose from 'mongoose';
import { OrderModel } from '../models/order.model.js';

const USER_PUBLIC_FIELDS = 'first_name last_name email role';

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

class OrderRepository {
  async getAll({ filter = {}, limit, skip = 0, sort = { createdAt: -1 } } = {}) {
    const [items, total] = await Promise.all([
      OrderModel.find(filter)
        .populate('user', USER_PUBLIC_FIELDS)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      OrderModel.countDocuments(filter),
    ]);
    return { items, total };
  }

  async getById(id) {
    if (!isValidId(id)) return null;
    return OrderModel.findById(id).populate('user', USER_PUBLIC_FIELDS).lean();
  }

  async getWithoutDelivery(orderIdsWithDelivery = [], limit) {
    return OrderModel.find({ _id: { $nin: orderIdsWithDelivery } }, { _id: 1, status: 1 })
      .limit(limit)
      .lean();
  }

  async create(data) {
    const created = await OrderModel.create(data);
    return created.toObject();
  }

  async insertMockMany(orders) {
    const docs = await OrderModel.insertMany(orders.map((o) => ({ ...o, isMock: true })));
    return docs.length;
  }

  async deleteMocks() {
    const { deletedCount } = await OrderModel.deleteMany({ isMock: true });
    return deletedCount;
  }
}

export default new OrderRepository();
