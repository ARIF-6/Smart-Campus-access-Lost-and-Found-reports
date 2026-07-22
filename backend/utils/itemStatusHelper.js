function getOwnerId(currentReturnedStudent) {
  if (!currentReturnedStudent) return null;
  if (typeof currentReturnedStudent === 'object' && currentReturnedStudent._id) {
    return String(currentReturnedStudent._id);
  }
  return String(currentReturnedStudent);
}

/**
 * Adds displayStatus for found items based on the authenticated viewer.
 * returned + current owner => "Returned to You"
 * returned + other viewers   => "Returned"
 */
function enrichFoundItemForUser(item, userId) {
  if (!item) return item;

  const enriched = { ...item };
  const status = String(item.status || '').toLowerCase();

  if (status === 'returned') {
    const ownerId = getOwnerId(item.currentReturnedStudent);
    if (userId && ownerId && String(userId) === ownerId) {
      enriched.displayStatus = 'Returned to You';
    } else {
      enriched.displayStatus = 'Returned';
    }
    return enriched;
  }

  if (status === 'under_ownership_review') {
    enriched.displayStatus = 'Under Review';
    return enriched;
  }

  enriched.displayStatus = item.status;
  return enriched;
}

function enrichFoundItemsForUser(items, userId) {
  if (!Array.isArray(items)) return items;
  return items.map((item) => enrichFoundItemForUser(item, userId));
}

module.exports = {
  enrichFoundItemForUser,
  enrichFoundItemsForUser,
};
