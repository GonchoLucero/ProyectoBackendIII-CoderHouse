import faker from './faker.js';
import { USER_ROLES, VEHICLE_TYPES, MOCK_LIMITS } from '../constants/index.js';

const toEmailPart = (text) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') 
    .replace(/[^a-zA-Z]/g, '')
    .toLowerCase();

export const randomUserRole = () => {
  const n = faker.number.float({ min: 0, max: 1 });
  if (n < MOCK_LIMITS.ADMIN_RATIO) return USER_ROLES.ADMIN;
  if (n < MOCK_LIMITS.ADMIN_RATIO + MOCK_LIMITS.COURIER_RATIO) return USER_ROLES.COURIER;
  return USER_ROLES.USER;
};

export const generateUser = ({ role = USER_ROLES.USER } = {}) => {
  if (!Object.values(USER_ROLES).includes(role)) {
    throw new Error(`Rol inválido para mock: ${role}`);
  }

  const first_name = faker.person.firstName();
  const last_name = faker.person.lastName();
  const suffix = faker.string.alphanumeric({ length: 4, casing: 'lower' });

  const user = {
    _id: faker.database.mongodbObjectId(),
    first_name,
    last_name,
    email: `${toEmailPart(first_name)}.${toEmailPart(last_name)}.${suffix}@test.com`,
    age: faker.number.int({ min: 18, max: 70 }),
    phone: faker.phone.number({ style: 'national' }),
    role,
  };

  if (role === USER_ROLES.COURIER) {
    user.vehicle = faker.helpers.arrayElement(Object.values(VEHICLE_TYPES));
  }

  return user;
};

export const generateCourier = () => generateUser({ role: USER_ROLES.COURIER });
