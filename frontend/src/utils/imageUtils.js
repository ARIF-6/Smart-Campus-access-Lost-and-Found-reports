const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const baseUrl = apiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');

/**
 * Normalizes an image path or URL.
 * Returns the full Cloudinary URL if it exists, otherwise formats the local upload path.
 * 
 * @param {string|object} item - The item object or the image string itself
 * @returns {string} - The full URL to the image
 */
export const getImageUrl = (item) => {
  if (!item) return '';
  
  // Determine the raw path from the item
  let path = typeof item === 'string' ? item : (item.imageUrl || item.image || item.photoUrl || item.proofImage || item.evidenceImage || '');
  if (!path) return '';
  
  // If it's already a browser-ready URL, just return it
  if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) {
    return path;
  }
  
  // Normalize Windows backslashes to forward slashes
  path = path.replace(/\\/g, '/');
  
  // Extract the portion that starts with "uploads/" from absolute disk paths too
  const uploadsMatch = path.match(/(?:^|\/)(uploads\/[^?]*)/);
  if (uploadsMatch) {
    return `${baseUrl}/${uploadsMatch[1]}`;
  }
  
  // Backend stores uploaded file paths relative to the uploads directory.
  return `${baseUrl}/uploads/${path.replace(/^\/+/, '')}`;
};
