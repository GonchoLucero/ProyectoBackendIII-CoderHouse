import bcrypt from 'bcrypt';
import userRepository from '../repositories/user.repository.js';
import {
  ValidationError,
  MissingFieldsError,
  NoFieldsToUpdateError,
  InvalidEmailError,
  InvalidRoleError,
  InvalidVehicleError,
  UserNotFoundError,
  DuplicateEmailError,
} from '../errors/index.js';
import config from '../config/index.js';
import { pick, parsePagination, buildPagination } from '../utils/query.utils.js';
import { validateEnum } from '../utils/validation.utils.js';
import { USER_ROLES, VEHICLE_TYPES } from '../constants/index.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UPDATABLE_FIELDS = ['first_name', 'last_name', 'age', 'phone', 'role', 'vehicle'];

const validateRole = (role) => validateEnum(role, USER_ROLES, InvalidRoleError);

const validateVehicle = ({ role, vehicle }) => {
  validateEnum(vehicle, VEHICLE_TYPES, InvalidVehicleError);
  if (vehicle !== undefined && role !== undefined && role !== USER_ROLES.COURIER) {
    throw new ValidationError(`Solo los usuarios con rol ${USER_ROLES.COURIER} pueden tener vehículo`, {
      field: 'vehicle',
      role,
    });
  }
};

class UserService {
  async getUsers({ limit, page, role } = {}) {
    validateRole(role);
    const filter = role ? { role } : {};

    const pg = parsePagination({ limit, page });
    const { items, total } = await userRepository.getAll({ filter, limit: pg.limit, skip: pg.skip });

    return { users: items, pagination: buildPagination({ total, ...pg }) };
  }

  async getUserById(id) {
    const user = await userRepository.getById(id);
    if (!user) throw new UserNotFoundError(id);
    return user;
  }

  async createUser(data = {}) {
    const { first_name, last_name, email, password, age, phone, vehicle, role = USER_ROLES.USER } = data;

    const missing = ['first_name', 'last_name', 'email', 'password'].filter((f) => !data[f]);
    if (missing.length) throw new MissingFieldsError(missing);
    if (!EMAIL_REGEX.test(email)) throw new InvalidEmailError(email);
    validateRole(role);
    validateVehicle({ role, vehicle });

    const existing = await userRepository.getByEmail(email);
    if (existing) {
      throw new DuplicateEmailError(email);
    }

    const hashedPassword = await bcrypt.hash(password, config.bcryptSaltRounds);

    return userRepository.create({
      first_name,
      last_name,
      email,
      age,
      phone,
      role,
      vehicle,
      password: hashedPassword,
    });
  }

  async updateUser(id, data = {}) {
    const changes = pick(data, UPDATABLE_FIELDS);
    if (Object.keys(changes).length === 0) {
      throw new NoFieldsToUpdateError(UPDATABLE_FIELDS);
    }
    validateRole(changes.role);
    validateEnum(changes.vehicle, VEHICLE_TYPES, InvalidVehicleError);

    const updated = await userRepository.update(id, changes);
    if (!updated) throw new UserNotFoundError(id);
    return updated;
  }

  async deleteUser(id) {
    const deleted = await userRepository.delete(id);
    if (!deleted) throw new UserNotFoundError(id);
    return deleted;
  }
}

export default new UserService();
