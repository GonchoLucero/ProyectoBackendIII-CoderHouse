import { uploader, mapUploadError } from '../config/multer.config.js';
import { UPLOAD_FIELDS } from '../constants/index.js';

const singleFile = (field) => (req, res, next) => {
  uploader.single(field)(req, res, (err) => next(err ? mapUploadError(err, field) : undefined));
};

export const uploadUserDocument = singleFile(UPLOAD_FIELDS.USER_DOCUMENT);
export const uploadReceipt = singleFile(UPLOAD_FIELDS.RECEIPT);
