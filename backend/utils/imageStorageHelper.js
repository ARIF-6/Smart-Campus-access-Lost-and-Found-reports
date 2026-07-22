const fs = require('fs');
const path = require('path');

function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

/**
 * Persist an uploaded multer file permanently.
 * Uses Cloudinary when configured (production-safe); otherwise stores under uploads/lost-found.
 */
async function resolveStoredImagePath(file, folder = 'campus-access/lost-found') {
  if (!file) {
    return { image: '', imageUrl: '' };
  }

  const directUrl = file.path || file.secure_url || file.url;
  if (directUrl && /^https?:\/\//i.test(directUrl)) {
    return { image: directUrl, imageUrl: directUrl };
  }

  if (isCloudinaryConfigured() && file.path) {
    try {
      const cloudinary = require('../config/cloudinary');
      const result = await cloudinary.uploader.upload(file.path, {
        folder,
        resource_type: 'image',
      });
      try {
        fs.unlinkSync(file.path);
      } catch (_) {}
      return { image: result.secure_url, imageUrl: result.secure_url };
    } catch (err) {
      console.error('Cloudinary upload failed, falling back to local path:', err.message);
    }
  }

  const uploadsRoot = path.join(__dirname, '..', 'uploads');
  const relative = path.relative(uploadsRoot, file.path).replace(/\\/g, '/');
  return { image: relative, imageUrl: relative };
}

module.exports = {
  isCloudinaryConfigured,
  resolveStoredImagePath,
};
