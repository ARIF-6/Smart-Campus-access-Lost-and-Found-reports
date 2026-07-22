const fs = require('fs');
const path = require('path');

const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');
const LOST_FOUND_SUBDIRS = ['lost-found', 'general', 'items', 'claims'];

function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_URL ||
    (process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET)
  );
}

function isProductionEnvironment() {
  return (
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.DYNO) ||
    Boolean(process.env.RENDER)
  );
}

/** Hosted platforms with ephemeral filesystem — Cloudinary is mandatory. */
function requiresPermanentStorage() {
  return Boolean(process.env.DYNO) || Boolean(process.env.RENDER);
}

function isPermanentImageUrl(value) {
  if (!value || typeof value !== 'string') return false;
  return /^https?:\/\//i.test(value) || value.includes('res.cloudinary.com');
}

function normalizeRelativeUploadPath(value) {
  if (!value || typeof value !== 'string') return '';

  let normalized = value.replace(/\\/g, '/').trim();
  if (!normalized) return '';

  normalized = normalized.replace(/^[A-Za-z]:\//, '');
  const uploadsIndex = normalized.indexOf('uploads/');
  if (uploadsIndex !== -1) {
    normalized = normalized.substring(uploadsIndex + 'uploads/'.length);
  }

  return normalized.replace(/^\/+/, '');
}

function resolveLocalFilePath(storedPath) {
  if (!storedPath || isPermanentImageUrl(storedPath)) return null;

  const relative = normalizeRelativeUploadPath(storedPath);
  if (!relative) return null;

  const candidates = [
    path.join(UPLOADS_ROOT, relative),
    ...LOST_FOUND_SUBDIRS.map((dir) => path.join(UPLOADS_ROOT, dir, path.basename(relative))),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function normalizeImageReference(value) {
  if (!value || typeof value !== 'string') return '';
  if (isPermanentImageUrl(value)) return value;
  return normalizeRelativeUploadPath(value);
}

function normalizeLostFoundItemImages(item) {
  if (!item || typeof item !== 'object') return item;

  const raw = item.imageUrl || item.image || '';
  if (!raw) return item;

  const normalized = normalizeImageReference(raw);
  return {
    ...item,
    image: normalized,
    imageUrl: normalized,
  };
}

function normalizeLostFoundItemsImages(items) {
  if (!Array.isArray(items)) return items;
  return items.map(normalizeLostFoundItemImages);
}

async function uploadLocalFileToCloudinary(localPath, folder) {
  const cloudinary = require('../config/cloudinary');
  const result = await cloudinary.uploader.upload(localPath, {
    folder,
    resource_type: 'image',
  });
  return result.secure_url;
}

function assertPermanentStorageConfigured() {
  if (requiresPermanentStorage() && !isCloudinaryConfigured()) {
    console.error(
      '[ImageStorage] CRITICAL: Production is running without Cloudinary. ' +
      'Lost & Found images will be lost on dyno restart. Set CLOUDINARY_CLOUD_NAME, ' +
      'CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
    );
  } else if (isCloudinaryConfigured()) {
    console.log('[ImageStorage] Permanent Cloudinary storage is configured.');
  } else {
    console.log('[ImageStorage] Using local disk storage (development only).');
  }
}

/**
 * Persist an uploaded multer file permanently.
 * Cloudinary multer storage returns HTTPS URLs directly.
 * Disk uploads are pushed to Cloudinary when configured.
 */
async function resolveStoredImagePath(file, folder = 'campus-access/lost-found') {
  if (!file) {
    return { image: '', imageUrl: '' };
  }

  const directUrl = file.path || file.secure_url || file.url;
  if (directUrl && isPermanentImageUrl(directUrl)) {
    return { image: directUrl, imageUrl: directUrl };
  }

  if (isCloudinaryConfigured()) {
    const localPath =
      file.path && fs.existsSync(file.path)
        ? file.path
        : resolveLocalFilePath(directUrl);

    if (localPath) {
      try {
        const secureUrl = await uploadLocalFileToCloudinary(localPath, folder);
        if (localPath.startsWith(UPLOADS_ROOT)) {
          try {
            fs.unlinkSync(localPath);
          } catch (_) {}
        }
        return { image: secureUrl, imageUrl: secureUrl };
      } catch (err) {
        console.error('[ImageStorage] Cloudinary upload failed, falling back to disk:', err.message);
      }
    }
  }

  const relative = normalizeRelativeUploadPath(file.path || directUrl || '');
  return { image: relative, imageUrl: relative };
}

async function migrateDocumentImages(Model, folder) {
  const items = await Model.find({
    $or: [
      { image: { $exists: true, $nin: [null, ''] } },
      { imageUrl: { $exists: true, $nin: [null, ''] } },
    ],
  })
    .select('_id image imageUrl')
    .lean();

  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of items) {
    const rawImage = item.image || '';
    const rawImageUrl = item.imageUrl || '';
    const raw = rawImageUrl || rawImage;

    if (!raw) {
      skipped += 1;
      continue;
    }

    if (isPermanentImageUrl(raw)) {
      const permanentUrl = isPermanentImageUrl(rawImageUrl) ? rawImageUrl : rawImage;
      if (rawImage !== permanentUrl || rawImageUrl !== permanentUrl) {
        await Model.updateOne(
          { _id: item._id },
          { $set: { image: permanentUrl, imageUrl: permanentUrl } }
        );
        migrated += 1;
      } else {
        skipped += 1;
      }
      continue;
    }

    const localPath = resolveLocalFilePath(raw);
    if (!localPath) {
      skipped += 1;
      continue;
    }

    try {
      const secureUrl = await uploadLocalFileToCloudinary(localPath, folder);
      await Model.updateOne(
        { _id: item._id },
        { $set: { image: secureUrl, imageUrl: secureUrl } }
      );
      migrated += 1;
      console.log(`[ImageMigration] Migrated ${Model.modelName} ${item._id}`);
    } catch (err) {
      failed += 1;
      console.error(`[ImageMigration] Failed ${Model.modelName} ${item._id}:`, err.message);
    }
  }

  return { migrated, skipped, failed };
}

async function migrateLostFoundImagesToCloudinary() {
  if (!isCloudinaryConfigured()) {
    console.warn('[ImageMigration] Cloudinary not configured — skipping migration.');
    return { migrated: 0, skipped: 0, failed: 0 };
  }

  const LostItem = require('../models/LostItem');
  const FoundItem = require('../models/FoundItem');
  const Item = require('../models/Item');

  console.log('[ImageMigration] Starting Lost & Found image migration...');

  const results = await Promise.all([
    migrateDocumentImages(LostItem, 'campus-access/lost-items'),
    migrateDocumentImages(FoundItem, 'campus-access/found-items'),
    migrateDocumentImages(Item, 'campus-access/items'),
  ]);

  const summary = results.reduce(
    (acc, result) => ({
      migrated: acc.migrated + result.migrated,
      skipped: acc.skipped + result.skipped,
      failed: acc.failed + result.failed,
    }),
    { migrated: 0, skipped: 0, failed: 0 }
  );

  console.log(
    `[ImageMigration] Complete — migrated: ${summary.migrated}, skipped: ${summary.skipped}, failed: ${summary.failed}`
  );

  return summary;
}

module.exports = {
  isCloudinaryConfigured,
  isProductionEnvironment,
  requiresPermanentStorage,
  isPermanentImageUrl,
  normalizeRelativeUploadPath,
  resolveLocalFilePath,
  normalizeImageReference,
  normalizeLostFoundItemImages,
  normalizeLostFoundItemsImages,
  uploadLocalFileToCloudinary,
  assertPermanentStorageConfigured,
  resolveStoredImagePath,
  migrateLostFoundImagesToCloudinary,
};
