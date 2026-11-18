import mongoose from 'mongoose';
import { ProductModel } from '../models/product.model.js';

const DEFAULT_FILTER = Object.freeze({ isDeleted: false });
const PUBLIC_PROJECTION = '-isDeleted';

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

class ProductRepository {
  async getAll({ filter = {}, limit, skip = 0, sort = { createdAt: -1 } } = {}) {
    const query = { ...filter, ...DEFAULT_FILTER };
    const [items, total] = await Promise.all([
      ProductModel.find(query, PUBLIC_PROJECTION).sort(sort).skip(skip).limit(limit).lean(),
      ProductModel.countDocuments(query),
    ]);
    return { items, total };
  }

  async getById(id) {
    if (!isValidId(id)) return null;
    return ProductModel.findOne({ _id: id, ...DEFAULT_FILTER }, PUBLIC_PROJECTION).lean();
  }

  async getByCode(code) {
    return ProductModel.findOne({ code, ...DEFAULT_FILTER }, PUBLIC_PROJECTION).lean();
  }

  async create(data) {
    const created = await ProductModel.create(data);
    return this.getById(created._id);
  }

  async update(id, data) {
    if (!isValidId(id)) return null;
    return ProductModel.findOneAndUpdate({ _id: id, ...DEFAULT_FILTER }, data, {
      returnDocument: 'after',
      runValidators: true,
      projection: PUBLIC_PROJECTION,
    }).lean();
  }

  async softDelete(id) {
    if (!isValidId(id)) return null;
    return ProductModel.findOneAndUpdate(
      { _id: id, ...DEFAULT_FILTER },
      { isDeleted: true },
      { returnDocument: 'after', projection: PUBLIC_PROJECTION }
    ).lean();
  }
}

export default new ProductRepository();
