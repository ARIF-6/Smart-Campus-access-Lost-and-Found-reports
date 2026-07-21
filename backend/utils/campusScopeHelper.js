const Hall = require('../models/Hall');

const isStaffUser = (req) => req.user && req.user.role === 'staff';

const getStaffCampusId = (req) => {
  if (!isStaffUser(req) || !req.user.campus) return null;
  return String(req.user.campus);
};

/**
 * Load halls and class IDs for the staff member's assigned campus.
 * Result is cached on req._campusScope for the duration of the request.
 */
async function getStaffCampusScope(req) {
  if (req._campusScope) return req._campusScope;

  const campusId = getStaffCampusId(req);
  if (!campusId) {
    req._campusScope = { campusId: null, hallIds: [], classIds: [], halls: [] };
    return req._campusScope;
  }

  const halls = await Hall.find({ campus: campusId }).select('_id classes campus name').lean();
  const classIds = halls.flatMap((h) => (h.classes || []).map((id) => String(id)));
  const hallIds = halls.map((h) => String(h._id));

  req._campusScope = { campusId, hallIds, classIds, halls };
  return req._campusScope;
}

async function isClassInStaffCampus(req, classId) {
  if (!isStaffUser(req)) return true;
  const scope = await getStaffCampusScope(req);
  if (!scope.campusId) return false;
  return scope.classIds.includes(String(classId));
}

async function isHallInStaffCampus(req, hall) {
  if (!isStaffUser(req)) return true;
  const scope = await getStaffCampusScope(req);
  if (!scope.campusId) return false;

  if (hall && typeof hall === 'object') {
    const hallCampus = hall.campus?._id || hall.campus;
    if (hallCampus) return String(hallCampus) === scope.campusId;
    const hallId = hall._id || hall;
    return scope.hallIds.includes(String(hallId));
  }

  return scope.hallIds.includes(String(hall));
}

async function isCampusInStaffScope(req, campusId) {
  if (!isStaffUser(req)) return true;
  const scope = await getStaffCampusScope(req);
  if (!scope.campusId) return false;
  return String(campusId) === scope.campusId;
}

async function isStudentInStaffCampus(req, user) {
  if (!isStaffUser(req)) return true;
  const scope = await getStaffCampusScope(req);
  if (!scope.campusId) return false;
  const classId = user.class?._id || user.class;
  return Boolean(classId && scope.classIds.includes(String(classId)));
}

function isCampusAssignedUserInStaffCampus(req, user) {
  if (!isStaffUser(req)) return true;
  const campusId = getStaffCampusId(req);
  if (!campusId) return false;
  const userCampus = user.campus?._id || user.campus;
  return Boolean(userCampus && String(userCampus) === campusId);
}

async function staffCanViewUser(req, user) {
  if (!isStaffUser(req)) return true;

  if (['admin', 'staff', 'superadmin'].includes(user.role)) {
    return false;
  }

  if (user.role === 'student') {
    return isStudentInStaffCampus(req, user);
  }

  if (['security', 'clean', 'cleaner'].includes(user.role)) {
    return isCampusAssignedUserInStaffCampus(req, user);
  }

  return false;
}

/**
 * Apply campus-based visibility rules to a user list query for staff members.
 */
async function applyStaffUserListFilter(req, query, roleParam) {
  if (!isStaffUser(req)) return query;

  const scope = await getStaffCampusScope(req);
  if (!scope.campusId) {
    query._id = { $in: [] };
    return query;
  }

  const roles = roleParam && roleParam !== 'All'
    ? roleParam.split(',').map((r) => r.trim().toLowerCase()).filter(Boolean)
    : [];

  const normalizeRole = (role) => (role === 'cleaner' ? 'clean' : role);

  if (roles.length === 0) {
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { role: 'student', class: { $in: scope.classIds } },
        { role: 'security', campus: scope.campusId },
        { role: 'clean', campus: scope.campusId },
      ],
    });
    return query;
  }

  if (roles.length === 1) {
    const role = normalizeRole(roles[0]);

    if (role === 'student') {
      query.role = 'student';
      query.class = { $in: scope.classIds };
      return query;
    }

    if (role === 'security') {
      query.role = 'security';
      query.campus = scope.campusId;
      return query;
    }

    if (role === 'clean') {
      query.role = 'clean';
      query.campus = scope.campusId;
      return query;
    }

    query._id = { $in: [] };
    return query;
  }

  const orConditions = [];
  const normalizedRoles = roles.map(normalizeRole);

  if (normalizedRoles.includes('student')) {
    orConditions.push({ role: 'student', class: { $in: scope.classIds } });
  }
  if (normalizedRoles.includes('security')) {
    orConditions.push({ role: 'security', campus: scope.campusId });
  }
  if (normalizedRoles.includes('clean')) {
    orConditions.push({ role: 'clean', campus: scope.campusId });
  }

  if (orConditions.length === 0) {
    query._id = { $in: [] };
  } else {
    query.$and = query.$and || [];
    query.$and.push({ $or: orConditions });
  }

  return query;
}

module.exports = {
  isStaffUser,
  getStaffCampusId,
  getStaffCampusScope,
  isClassInStaffCampus,
  isHallInStaffCampus,
  isCampusInStaffScope,
  isStudentInStaffCampus,
  isCampusAssignedUserInStaffCampus,
  staffCanViewUser,
  applyStaffUserListFilter,
};
