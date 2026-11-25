import userRepository from '../repositories/user.repository.js';
import orderRepository from '../repositories/order.repository.js';
import deliveryRepository from '../repositories/delivery.repository.js';
import logger from '../config/logger.js';
import { resolveUploadPath, toStoredPath } from '../config/multer.config.js';
import { moveFile, removeFile } from '../utils/file.utils.js';
import { validateEnum } from '../utils/validation.utils.js';
import {
  AppError,
  FileRequiredError,
  FileSaveError,
  MissingFieldsError,
  InvalidDocumentTypeError,
  UserNotFoundError,
  OrderNotFoundError,
  DeliveryNotFoundError,
} from '../errors/index.js';
import {
  USER_ROLES,
  UPLOAD_FIELDS,
  UPLOAD_FOLDERS,
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_FOLDERS,
  COURIER_ONLY_DOCUMENTS,
  ORDER_RECEIPT_TYPES,
  DELIVERY_RECEIPT_TYPES,
} from '../constants/index.js';

const storeAndAttach = async ({ file, folder, documentType, attach, listKey }) => {
  let storedAt = null;
  try {
    storedAt = await moveFile(file.path, resolveUploadPath(folder), file.filename);
    const data = {
      originalName: file.originalname,
      fileName: file.filename,
      path: toStoredPath(folder, file.filename),
      mimetype: file.mimetype,
      size: file.size,
      documentType,
      uploadedAt: new Date(),
    };
    const entity = await attach(data);
    return { entity, metadata: entity[listKey].at(-1) };
  } catch (err) {
    await removeFile(storedAt ?? file.path);
    logger.error(`Error al guardar el archivo "${file.originalname}": ${err.message}`);
    throw err instanceof AppError ? err : new FileSaveError(err.message, err);
  }
};

const discardOnError = async (file, task) => {
  try {
    return await task();
  } catch (err) {
    await removeFile(file?.path);
    throw err;
  }
};

class UploadService {
  async uploadUserDocument(userId, file, { documentType } = {}) {
    return discardOnError(file, async () => {
      if (!file) throw new FileRequiredError(UPLOAD_FIELDS.USER_DOCUMENT);
      if (!documentType) throw new MissingFieldsError(['documentType']);
      validateEnum(documentType, DOCUMENT_TYPES, InvalidDocumentTypeError);

      const user = await userRepository.getById(userId);
      if (!user) throw new UserNotFoundError(userId);

      if (COURIER_ONLY_DOCUMENTS.includes(documentType) && user.role !== USER_ROLES.COURIER) {
        const allowed = Object.values(DOCUMENT_TYPES).filter((t) => !COURIER_ONLY_DOCUMENTS.includes(t));
        throw new InvalidDocumentTypeError(
          documentType,
          allowed,
          `El documento ${documentType} solo se puede cargar para usuarios con rol ${USER_ROLES.COURIER}`
        );
      }

      const { entity, metadata } = await storeAndAttach({
        file,
        folder: DOCUMENT_TYPE_FOLDERS[documentType],
        documentType,
        attach: (data) => userRepository.addDocument(userId, data),
        listKey: 'documents',
      });

      logger.info(`Documento ${documentType} cargado para el usuario ${userId}: "${file.originalname}" (${file.size} bytes)`);
      return { user: entity, document: metadata };
    });
  }

  async uploadOrderReceipt(orderId, file, { receiptType = ORDER_RECEIPT_TYPES.PAYMENT_RECEIPT } = {}) {
    return discardOnError(file, async () => {
      if (!file) throw new FileRequiredError(UPLOAD_FIELDS.RECEIPT);
      validateEnum(receiptType, ORDER_RECEIPT_TYPES, InvalidDocumentTypeError);

      const order = await orderRepository.getById(orderId);
      if (!order) throw new OrderNotFoundError(orderId);

      const { entity, metadata } = await storeAndAttach({
        file,
        folder: UPLOAD_FOLDERS.ORDER_RECEIPTS,
        documentType: receiptType,
        attach: (data) => orderRepository.addReceipt(orderId, data),
        listKey: 'receipts',
      });

      logger.info(`Comprobante ${receiptType} asociado al pedido ${order.code}: "${file.originalname}"`);
      return { order: entity, receipt: metadata };
    });
  }

  async uploadDeliveryReceipt(deliveryId, file, { receiptType = DELIVERY_RECEIPT_TYPES.DELIVERY_PROOF } = {}) {
    return discardOnError(file, async () => {
      if (!file) throw new FileRequiredError(UPLOAD_FIELDS.RECEIPT);
      validateEnum(receiptType, DELIVERY_RECEIPT_TYPES, InvalidDocumentTypeError);

      const delivery = await deliveryRepository.getById(deliveryId);
      if (!delivery) throw new DeliveryNotFoundError(deliveryId);

      const { entity, metadata } = await storeAndAttach({
        file,
        folder: UPLOAD_FOLDERS.DELIVERY_RECEIPTS,
        documentType: receiptType,
        attach: (data) => deliveryRepository.addReceipt(deliveryId, data),
        listKey: 'receipts',
      });

      logger.info(`Comprobante ${receiptType} asociado a la entrega ${delivery.trackingCode}: "${file.originalname}"`);
      return { delivery: entity, receipt: metadata };
    });
  }
}

export default new UploadService();
