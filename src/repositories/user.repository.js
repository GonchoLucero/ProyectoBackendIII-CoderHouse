import mongoose from 'mongoose';
import { UserModel } from '../models/user.model.js';

const SAFE_PROJECTION = '-password';

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

class UserRepository {
  async getAll({ filter = {}, limit, skip = 0, sort = { createdAt: -1 } } = {}) {
    const [items, total] = await Promise.all([
      UserModel.find(filter, SAFE_PROJECTION).sort(sort).skip(skip).limit(limit).lean(),
      UserModel.countDocuments(filter),
    ]);
    return { items, total };
  }

  async getById(id) {
    if (!isValidId(id)) return null;
    return UserModel.findById(id, SAFE_PROJECTION).lean();
  }

  async getByEmail(email) {
    return UserModel.findOne({ email: email.toLowerCase() }, SAFE_PROJECTION).lean();
  }

  async getByEmailWithPassword(email) {
    return UserModel.findOne({ email: email.toLowerCase() }).lean();
  }

  async getIdsByRole(role) {
    const docs = await UserModel.find({ role }, { _id: 1 }).lean();
    return docs.map((d) => String(d._id));
  }

  async create(data) {
    const created = await UserModel.create(data);
    return this.getById(created._id);
  }

  async insertMockMany(users) {
    const docs = await UserModel.insertMany(users.map((u) => ({ ...u, isMock: true })));
    return docs.length;
  }

  async deleteMocks() {
    const { deletedCount } = await UserModel.deleteMany({ isMock: true });
    return deletedCount;
  }

  async addDocument(id, metadata) {
    const { matchedCount } = await UserModel.updateOne({ _id: id }, { $push: { documents: metadata } });
    return matchedCount ? this.getById(id) : null;
  }

  async update(id, data) {
    if (!isValidId(id)) return null;
    return UserModel.findByIdAndUpdate(id, data, {
      returnDocument: 'after',
      runValidators: true,
      projection: SAFE_PROJECTION,
    }).lean();
  }

  async delete(id) {
    if (!isValidId(id)) return null;
    return UserModel.findByIdAndDelete(id, { projection: SAFE_PROJECTION }).lean();
  }
}

export default new UserRepository();
