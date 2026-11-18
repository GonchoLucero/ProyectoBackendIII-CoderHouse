import bcrypt from 'bcrypt';
import userRepository from '../repositories/user.repository.js';
import AppError from '../utils/AppError.js';
import config from '../config/index.js';
import { pick, parsePagination, buildPagination } from '../utils/query.utils.js';
import { validateEnum } from '../utils/validation.utils.js';
import { USER_ROLES, VEHICLE_TYPES, HTTP_STATUS } from '../constants/index.js';


const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UPDATABLE_FIELDS = ['first_name', 'last_name', 'age', 'phone', 'role', 'vehicle'];

const validateRole = (role) => validateEnum(role, USER_ROLES, 'Rol');

const validateVehicle = ({ role, vehicle }) => {
  validateEnum(vehicle, VEHICLE_TYPES, 'Vehículo');
  if (vehicle !== undefined && role !== undefined && role !== USER_ROLES.COURIER) {
    throw new AppError(`Solo los usuarios con rol ${USER_ROLES.COURIER} pueden tener vehículo`, HTTP_STATUS.BAD_REQUEST);
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
    if (!user) throw new AppError(`Usuario ${id} no encontrado`, HTTP_STATUS.NOT_FOUND);
    return user;
  }

  async createUser(data = {}) {
    const { first_name, last_name, email, password, age, phone, vehicle, role = USER_ROLES.USER } = data;

    if (!first_name || !last_name || !email || !password) {
      throw new AppError(
        'Faltan campos obligatorios: first_name, last_name, email, password',
        HTTP_STATUS.BAD_REQUEST
      );
    }
    if (!EMAIL_REGEX.test(email)) {
      throw new AppError('El email no tiene un formato válido', HTTP_STATUS.BAD_REQUEST);
    }
    validateRole(role);
    validateVehicle({ role, vehicle });

    const existing = await userRepository.getByEmail(email);
    if (existing) {
      throw new AppError(`El email ${email} ya está registrado`, HTTP_STATUS.CONFLICT);
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
      throw new AppError(
        `No hay campos válidos para actualizar. Permitidos: ${UPDATABLE_FIELDS.join(', ')}`,
        HTTP_STATUS.BAD_REQUEST
      );
    }
    validateRole(changes.role);
    validateEnum(changes.vehicle, VEHICLE_TYPES, 'Vehículo');

    const updated = await userRepository.update(id, changes);
    if (!updated) throw new AppError(`Usuario ${id} no encontrado`, HTTP_STATUS.NOT_FOUND);
    return updated;
  }

  async deleteUser(id) {
    const deleted = await userRepository.delete(id);
    if (!deleted) throw new AppError(`Usuario ${id} no encontrado`, HTTP_STATUS.NOT_FOUND);
    return deleted;
  }
}

export default new UserService();
