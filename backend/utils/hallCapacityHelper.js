const User = require('../models/User');
const Hall = require('../models/Hall');

/**
 * Enforce hall capacity limits on a class.
 * If a class is assigned to a hall and the class has more students registered
 * than the hall capacity (seats), keep only the top `capacity` students (sorted by oldest first)
 * and make the rest classless (class = null).
 */
const enforceHallCapacityForClass = async (classId) => {
  if (!classId) return;
  try {
    const hall = await Hall.findOne({ classes: classId }).select('capacity').lean();
    if (!hall || hall.capacity === undefined || hall.capacity === null) return;

    const capacity = hall.capacity;

    const students = await User.find({
      role: 'student',
      isDeleted: { $ne: true },
      class: classId
    }).sort({ createdAt: 1, fullName: 1 });

    if (students.length > capacity) {
      const classlessStudentIds = students.slice(capacity).map(s => s._id);
      await User.updateMany(
        { _id: { $in: classlessStudentIds } },
        { $set: { class: null } }
      );
    }
  } catch (error) {
    console.error('Error enforcing hall capacity for class:', error);
  }
};

/**
 * Enforce hall capacity limits on all classes assigned to a hall.
 */
const enforceHallCapacityForHall = async (hallId) => {
  if (!hallId) return;
  try {
    const hall = await Hall.findById(hallId).select('capacity classes').lean();
    if (!hall || hall.capacity === undefined || hall.capacity === null || !hall.classes) return;

    for (const classId of hall.classes) {
      await enforceHallCapacityForClass(classId);
    }
  } catch (error) {
    console.error('Error enforcing hall capacity for hall:', error);
  }
};

module.exports = {
  enforceHallCapacityForClass,
  enforceHallCapacityForHall
};
