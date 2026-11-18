import faker from './faker.js';
import {
  ORDER_STATUS,
  DELIVERY_STATUS,
  ORDER_TO_DELIVERY_STATUS,
  DELIVERY_STATUSES_WITH_COURIER,
} from '../constants/index.js';

export const deliveryNeedsCourier = (status) => DELIVERY_STATUSES_WITH_COURIER.includes(status);

export const allowedDeliveryStatuses = (orderStatus, hasCouriers) =>
  ORDER_TO_DELIVERY_STATUS[orderStatus].filter((s) => hasCouriers || !deliveryNeedsCourier(s));

export const allowedOrderStatuses = (hasCouriers) =>
  Object.values(ORDER_STATUS).filter((s) => allowedDeliveryStatuses(s, hasCouriers).length > 0);

/**
 * @param {object} params
 * @param {{_id: string, status: string}} params.order 
 * @param {string[]} [params.courierIds]                
 */
export const generateDelivery = ({ order, courierIds = [] } = {}) => {
  if (!order?._id || !order?.status) throw new Error('generateDelivery necesita un pedido con _id y status');

  const options = allowedDeliveryStatuses(order.status, courierIds.length > 0);
  if (options.length === 0) {
    throw new Error(`El pedido ${order._id} (${order.status}) necesita un repartidor y no hay ninguno`);
  }

  const status = faker.helpers.arrayElement(options);
  const isDelivered = status === DELIVERY_STATUS.DELIVERED;

  return {
    _id: faker.database.mongodbObjectId(),
    trackingCode: `SN-${faker.string.alphanumeric({ length: 10, casing: 'upper' })}`,
    order: String(order._id),
    courier: deliveryNeedsCourier(status) ? String(faker.helpers.arrayElement(courierIds)) : null,
    status,
    estimatedDeliveryDate: isDelivered ? faker.date.recent({ days: 10 }) : faker.date.soon({ days: 7 }),
    deliveredAt: isDelivered ? faker.date.recent({ days: 5 }) : null,
  };
};
