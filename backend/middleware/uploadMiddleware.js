const multer = require('multer');
const path = require('path');
const fs = require('fs');
const createUploader = require('../utils/upload');

// Create specific uploaders for different modules
const uploadGeneral = createUploader('general');
const uploadLostFound = createUploader('lost-found', {
  preferCloudinary: true,
  cloudinaryFolder: 'campus-access/lost-found',
});
const uploadClaims = createUploader('claims');
const uploadProfiles = createUploader('profiles');
const uploadSecurity = createUploader('security');

// Excel uploader configuration
const excelStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/excels');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadExcel = multer({
  storage: excelStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls' || file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || file.mimetype === 'application/vnd.ms-excel') {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed.'));
    }
  }
});

uploadGeneral.general = uploadGeneral;
uploadGeneral.lostFound = uploadLostFound;
uploadGeneral.claims = uploadClaims;
uploadGeneral.profiles = uploadProfiles;
uploadGeneral.security = uploadSecurity;
uploadGeneral.excel = uploadExcel;

module.exports = uploadGeneral;
