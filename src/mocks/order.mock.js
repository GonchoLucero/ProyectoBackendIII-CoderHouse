import faker from './faker.js';
import { AR_LOCATIONS } from './locations.data.js';
import { ORDER_STATUS, ORDER_PRIORITY, MOCK_LIMITS } from '../constants/index.js';

const PRIORITY_WEIGHTS = Object.freeze([
  { weight: 2, value: ORDER_PRIORITY.LOW },
  { weight: 5, value: ORDER_PRIORITY.NORMAL },
  { weight: 2, value: ORDER_PRIORITY.HIGH },
  { weight: 1, value: ORDER_PRIORITY.URGENT },
]);

const generateAddress = () => {
  const location = faker.helpers.arrayElement(AR_LOCATIONS);
  return {
    street: `${faker.location.street()} ${faker.number.int({ min: 1, max: 9999 })}`,
    city: faker.helpers.arrayElement(location.cities),
    province: location.province,
    zipCode: String(faker.number.int({ min: 1000, max: 9999 })),
  };
};

const generateItem = () => ({
  title: faker.commerce.productName(),
  quantity: faker.number.int({ min: 1, max: 4 }),
  unitPrice: Number(faker.commerce.price({ min: 500, max: 80000, dec: 0 })),
});

export const calculateOrderTotal = (items) =>
  items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);

/**
 * @param {object} params
 * @param {string} params.userId      
 * @param {string[]} [params.allowedStatuses] 
 */
export const generateOrder = ({ userId, allowedStatuses = Object.values(ORDER_STATUS) } = {}) => {
  if (!userId) throw new Error('generateOrder necesita el userId del cliente');

  const items = Array.from(
    { length: faker.number.int({ min: 1, max: MOCK_LIMITS.MAX_ITEMS_PER_ORDER }) },
    generateItem
  );

  return {
    _id: faker.database.mongodbObjectId(),
    code: `ORD-${faker.string.alphanumeric({ length: 8, casing: 'upper' })}`,
    user: String(userId),
    items,
    total: calculateOrderTotal(items),
    status: faker.helpers.arrayElement(allowedStatuses),
    priority: faker.helpers.weightedArrayElement(PRIORITY_WEIGHTS),
    shippingAddress: generateAddress(),
  };
};
