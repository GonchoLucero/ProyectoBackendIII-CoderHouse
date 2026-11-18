import deliveryRepository from '../repositories/delivery.repository.js';
import AppError from '../utils/AppError.js';
import { validateEnum } from '../utils/validation.utils.js';
import { parsePagination, buildPagination } from '../utils/query.utils.js';
import { DELIVERY_STATUS, HTTP_STATUS } from '../constants/index.js';

class DeliveryService {
  async getDeliveries({ limit, page, status } = {}) {
    validateEnum(status, DELIVERY_STATUS, 'Estado');
    const filter = status ? { status } : {};

    const pg = parsePagination({ limit, page });
    const { items, total } = await deliveryRepository.getAll({ filter, limit: pg.limit, skip: pg.skip });
    return { deliveries: items, pagination: buildPagination({ total, ...pg }) };
  }

  async getDeliveryById(id) {
    const delivery = await deliveryRepository.getById(id);
    if (!delivery) throw new AppError(`Entrega ${id} no encontrada`, HTTP_STATUS.NOT_FOUND);
    return delivery;
  }
}

export default new DeliveryService();
