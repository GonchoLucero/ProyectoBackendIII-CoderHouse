import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { UserModel } from '../src/models/user.model.js';
import { OrderModel } from '../src/models/order.model.js';
import { DeliveryModel } from '../src/models/delivery.model.js';
import {
  generateUser,
  generateCourier,
  generateOrder,
  generateDelivery,
  calculateOrderTotal,
} from '../src/mocks/index.js';
import {
  USER_ROLES,
  ORDER_STATUS,
  ORDER_PRIORITY,
  DELIVERY_STATUS,
  ORDER_TO_DELIVERY_STATUS,
  DELIVERY_STATUSES_WITH_COURIER,
  VEHICLE_TYPES,
  MOCK_DEFAULT_PASSWORD,
} from '../src/constants/index.js';

const N = 200;
const range = (n) => Array.from({ length: n });

const assertValidAgainstModel = (Model, doc) => {
  const error = new Model(doc).validateSync();
  assert.equal(error, undefined, error?.message);
};

describe('Fábricas de mocks', () => {
  test('generateUser respeta el rol pedido y el modelo User', () => {
    for (const role of Object.values(USER_ROLES)) {
      const user = generateUser({ role });
      assert.equal(user.role, role);
      assert.match(user.email, /^[a-z]+\.[a-z]+\.[a-z0-9]{4}@test\.com$/);
      assert.equal(user.password, undefined, 'el mock no debe traer password');
      assertValidAgainstModel(UserModel, { ...user, password: MOCK_DEFAULT_PASSWORD });
    }
  });

  test('generateUser rechaza roles que no están en las constantes', () => {
    assert.throws(() => generateUser({ role: 'SUPERUSER' }), /Rol inválido/);
  });

  test('los repartidores tienen rol COURIER y un vehículo válido', () => {
    for (const _ of range(N)) {
      const courier = generateCourier();
      assert.equal(courier.role, USER_ROLES.COURIER);
      assert.ok(Object.values(VEHICLE_TYPES).includes(courier.vehicle));
    }
  });

  test('generateOrder usa estados/prioridades permitidos y calcula bien el total', () => {
    const user = generateUser();
    for (const _ of range(N)) {
      const order = generateOrder({ userId: user._id });
      assert.equal(order.user, user._id);
      assert.ok(Object.values(ORDER_STATUS).includes(order.status));
      assert.ok(Object.values(ORDER_PRIORITY).includes(order.priority));
      assert.equal(order.total, calculateOrderTotal(order.items));
      assert.ok(order.items.length >= 1);
      assertValidAgainstModel(OrderModel, order);
    }
  });

  test('generateOrder exige el usuario dueño del pedido', () => {
    assert.throws(() => generateOrder(), /userId/);
  });

  test('generateDelivery es coherente con el estado del pedido y el repartidor', () => {
    const user = generateUser();
    const courierIds = range(3).map(() => generateCourier()._id);

    for (const _ of range(N)) {
      const order = generateOrder({ userId: user._id });
      const delivery = generateDelivery({ order, courierIds });

      assert.equal(delivery.order, order._id);
      assert.ok(ORDER_TO_DELIVERY_STATUS[order.status].includes(delivery.status));

      if (DELIVERY_STATUSES_WITH_COURIER.includes(delivery.status)) {
        assert.ok(courierIds.includes(delivery.courier), 'debe tener un repartidor válido');
      } else {
        assert.equal(delivery.courier, null);
      }

      if (delivery.status === DELIVERY_STATUS.DELIVERED) assert.ok(delivery.deliveredAt);
      else assert.equal(delivery.deliveredAt, null);

      assertValidAgainstModel(DeliveryModel, delivery);
    }
  });

  test('generateDelivery falla si el estado necesita repartidor y no hay ninguno', () => {
    const order = { _id: generateUser()._id, status: ORDER_STATUS.SHIPPED };
    assert.throws(() => generateDelivery({ order, courierIds: [] }), /repartidor/);
  });
});
