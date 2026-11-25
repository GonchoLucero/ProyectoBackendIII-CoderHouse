import {
  FileRequiredError,
  UnexpectedFileFieldError,
  InvalidDocumentTypeError,
  InvalidFileTypeError,
  FileTooLargeError,
  FileSaveError,
  MissingFieldsError,
  UserNotFoundError,
  OrderNotFoundError,
  DeliveryNotFoundError,
} from '../../errors/index.js';
import {
  UPLOAD_FIELDS,
  UPLOAD_FOLDERS,
  UPLOAD_LIMITS,
  ALLOWED_MIME_TYPES,
  DOCUMENT_TYPES,
  COURIER_ONLY_DOCUMENTS,
  ORDER_RECEIPT_TYPES,
  DELIVERY_RECEIPT_TYPES,
  USER_ROLES,
} from '../../constants/index.js';
import { ref, success, errors, sample, pathParam } from '../helpers.js';
import { databaseUnavailable } from './common.js';

const ID = '6650f0c2a1b2c3d4e5f60718';
const MIME_LIST = Object.keys(ALLOWED_MIME_TYPES);
const FILE_DESCRIPTION = `Archivo PDF, JPG o PNG (${MIME_LIST.join(', ')}). Tamaño máximo: ${UPLOAD_LIMITS.MAX_FILE_SIZE_MB} MB. Un solo archivo.`;

const multipartBody = (fileField, typeField, typeValues, required, typeDescription) => ({
  required: true,
  content: {
    'multipart/form-data': {
      schema: {
        type: 'object',
        required: required ? [fileField, typeField] : [fileField],
        properties: {
          [fileField]: { type: 'string', format: 'binary', description: FILE_DESCRIPTION },
          [typeField]: { type: 'string', enum: typeValues, description: typeDescription },
        },
      },
      encoding: { [fileField]: { contentType: MIME_LIST.join(', ') } },
    },
  },
});

const fileErrors = (field) => ({
  400: [
    sample(new FileRequiredError(field)),
    sample(new UnexpectedFileFieldError('archivo', field)),
  ],
  413: [sample(new FileTooLargeError(UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES))],
  415: [sample(new InvalidFileTypeError('text/plain', MIME_LIST))],
  500: [sample(new FileSaveError('ENOSPC: no space left on device'))],
  503: [databaseUnavailable],
});

const withExtra400 = (base, extra) => ({ ...base, 400: [...base[400], ...extra] });

const created = (description, entityKey, entitySchema, metaKey) =>
  success(description, {
    type: 'object',
    properties: {
      status: { type: 'string' },
      payload: {
        type: 'object',
        properties: { [entityKey]: ref(entitySchema), [metaKey]: ref('FileMetadata') },
      },
    },
  });

export const uploadsPaths = {
  '/api/users/{uid}/documents': {
    post: {
      tags: ['Uploads'],
      summary: 'Subir un documento de usuario',
      description: [
        `Recibe el archivo en el campo **\`${UPLOAD_FIELDS.USER_DOCUMENT}\`** y el tipo en **\`documentType\`** (multipart/form-data).`,
        '',
        `- \`IDENTIFICATION\`, \`PROOF_OF_ADDRESS\` → \`uploads/${UPLOAD_FOLDERS.USER_DOCUMENTS}/\``,
        `- \`${COURIER_ONLY_DOCUMENTS.join('`, `')}\` → \`uploads/${UPLOAD_FOLDERS.COURIER_LICENSES}/\` (solo usuarios ${USER_ROLES.COURIER})`,
        '',
        'El archivo se guarda en el servidor con un nombre único y en el usuario se registran solo sus metadatos (`documents`).',
      ].join('\n'),
      parameters: [pathParam('uid', 'Id del usuario')],
      requestBody: multipartBody(
        UPLOAD_FIELDS.USER_DOCUMENT,
        'documentType',
        Object.values(DOCUMENT_TYPES),
        true,
        `Tipo de documento. ${COURIER_ONLY_DOCUMENTS.join(' y ')} solo para repartidores.`
      ),
      responses: {
        201: created('Documento cargado y asociado al usuario', 'user', 'User', 'document'),
        ...errors(
          'POST',
          `/api/users/${ID}/documents`,
          {
            ...withExtra400(fileErrors(UPLOAD_FIELDS.USER_DOCUMENT), [
              sample(new MissingFieldsError(['documentType'])),
              sample(new InvalidDocumentTypeError('PASAPORTE', DOCUMENT_TYPES)),
            ]),
            404: [sample(new UserNotFoundError(ID))],
          }
        ),
      },
    },
  },
  '/api/orders/{oid}/receipts': {
    post: {
      tags: ['Uploads'],
      summary: 'Subir un comprobante de pedido',
      description: `Recibe el archivo en el campo **\`${UPLOAD_FIELDS.RECEIPT}\`** y opcionalmente **\`receiptType\`** (por defecto \`${ORDER_RECEIPT_TYPES.PAYMENT_RECEIPT}\`). Se guarda en \`uploads/${UPLOAD_FOLDERS.ORDER_RECEIPTS}/\` y sus metadatos quedan en el pedido (\`receipts\`).`,
      parameters: [pathParam('oid', 'Id del pedido')],
      requestBody: multipartBody(
        UPLOAD_FIELDS.RECEIPT,
        'receiptType',
        Object.values(ORDER_RECEIPT_TYPES),
        false,
        'Tipo de comprobante (opcional)'
      ),
      responses: {
        201: created('Comprobante asociado al pedido', 'order', 'Order', 'receipt'),
        ...errors('POST', `/api/orders/${ID}/receipts`, {
          ...withExtra400(fileErrors(UPLOAD_FIELDS.RECEIPT), [
            sample(new InvalidDocumentTypeError(DELIVERY_RECEIPT_TYPES.DELIVERY_PROOF, ORDER_RECEIPT_TYPES)),
          ]),
          404: [sample(new OrderNotFoundError(ID))],
        }),
      },
    },
  },
  '/api/deliveries/{did}/receipts': {
    post: {
      tags: ['Uploads'],
      summary: 'Subir un comprobante de entrega',
      description: `Recibe el archivo en el campo **\`${UPLOAD_FIELDS.RECEIPT}\`** y opcionalmente **\`receiptType\`** (por defecto \`${DELIVERY_RECEIPT_TYPES.DELIVERY_PROOF}\`). Se guarda en \`uploads/${UPLOAD_FOLDERS.DELIVERY_RECEIPTS}/\` y sus metadatos quedan en la entrega (\`receipts\`).`,
      parameters: [pathParam('did', 'Id de la entrega')],
      requestBody: multipartBody(
        UPLOAD_FIELDS.RECEIPT,
        'receiptType',
        Object.values(DELIVERY_RECEIPT_TYPES),
        false,
        'Tipo de comprobante (opcional)'
      ),
      responses: {
        201: created('Comprobante asociado a la entrega', 'delivery', 'Delivery', 'receipt'),
        ...errors('POST', `/api/deliveries/${ID}/receipts`, {
          ...withExtra400(fileErrors(UPLOAD_FIELDS.RECEIPT), [
            sample(new InvalidDocumentTypeError(ORDER_RECEIPT_TYPES.INVOICE, DELIVERY_RECEIPT_TYPES)),
          ]),
          404: [sample(new DeliveryNotFoundError(ID))],
        }),
      },
    },
  },
};
