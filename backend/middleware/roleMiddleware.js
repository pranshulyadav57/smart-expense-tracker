const { AppError } = require('./errorMiddleware');

const createRoleMiddleware = (allowedRoles, roleName) => (req, res, next) => {
  try {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      throw new AppError(`Access denied. ${roleName} role required.`, 403);
    }
    next();
  } catch (error) {
    next(error);
  }
};

const requireBusinessRole = createRoleMiddleware(['business', 'admin'], 'Business');
const requireStudentRole = createRoleMiddleware(['student', 'admin'], 'Student');

module.exports = {
  requireBusinessRole,
  requireStudentRole
};
