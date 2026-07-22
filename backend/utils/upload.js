const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const { isCloudinaryConfigured } = require('./imageStorageHelper');

const imageFileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only jpg, jpeg, png, and webp are allowed.'));
  }
};

const createCloudinaryUploader = (cloudinaryFolder) => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: cloudinaryFolder,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      resource_type: 'image',
    },
  });

  return multer({
    storage,
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
    fileFilter: imageFileFilter,
  });
};

const createUploader = (folderName, options = {}) => {
  const cloudinaryFolder = options.cloudinaryFolder || `campus-access/${folderName}`;
  const preferCloudinary = options.preferCloudinary !== undefined ? options.preferCloudinary : true;

  if (preferCloudinary && isCloudinaryConfigured()) {
    return createCloudinaryUploader(cloudinaryFolder);
  }

  const uploadDir = path.join(__dirname, '../uploads', folderName);

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, uniqueSuffix + ext);
    },
  });

  return multer({
    storage,
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
    fileFilter: imageFileFilter,
  });
};

module.exports = createUploader;
