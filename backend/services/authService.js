const db = require('../config/db');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('./tokenService');
const { AppError } = require('../middleware/errorMiddleware');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const buildUserResponse = (user, profileData = {}) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role ? String(user.role).toLowerCase() : null,
  avatar: user.avatar || null,
  is_active: user.is_active,
  created_at: user.created_at,
  updated_at: user.updated_at,
  ...profileData
});

const getProfileData = async (user) => {
  if (!user || !user.role) {
    return {};
  }

  if (user.role === 'business') {
    const [rows] = await db.execute(
      'SELECT business_name, phone, address, gst_number FROM business_profiles WHERE user_id = ?',
      [user.id]
    );
    return rows[0] || {};
  }

  if (user.role === 'student') {
    const [rows] = await db.execute(
      'SELECT monthly_budget, institution, course FROM student_profiles WHERE user_id = ?',
      [user.id]
    );
    return rows[0] || {};
  }

  return {};
};

const findUserByIdentifier = async (identifier) => {
  if (!identifier) return null;

  const [users] = await db.execute(
    `SELECT u.id, u.username, u.email, u.password, u.role, u.avatar, u.is_active, u.created_at, u.updated_at
     FROM users u
     LEFT JOIN business_profiles b ON u.id = b.user_id
     WHERE LOWER(u.email) = LOWER(?) OR LOWER(u.username) = LOWER(?) OR b.phone = ?
     LIMIT 1`,
    [identifier, identifier, identifier]
  );

  return users[0] || null;
};

const findUserById = async (id) => {
  if (!id) return null;

  const [users] = await db.execute(
    'SELECT id, username, email, role, avatar, is_active, created_at, updated_at FROM users WHERE id = ?',
    [id]
  );

  return users[0] || null;
};

const generateTokens = async (user) => {
  if (!user || !user.id || !user.email || !user.role) {
    throw new AppError('Invalid user payload for token generation', 400);
  }

  const normalizedRole = String(user.role).toLowerCase();
  if (!['business', 'student'].includes(normalizedRole)) {
    throw new AppError('Invalid user role for token generation', 400);
  }

  const token = signAccessToken({
    id: user.id,
    email: user.email,
    role: normalizedRole,
    username: user.username
  });

  const refreshToken = signRefreshToken({ id: user.id });

  // Persist hashed refresh token for rotation/revocation
  try {
    const hashed = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Resolve expiry days from env like '30d' or numeric
    const rawExpiry = process.env.REFRESH_TOKEN_EXPIRY || '30d';
    const daysMatch = String(rawExpiry).match(/(\d+)/);
    const days = daysMatch ? parseInt(daysMatch[0], 10) : 30;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    await db.execute(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, revoked) VALUES (?, ?, ?, FALSE)',
      [user.id, hashed, expiresAt]
    );
  } catch (err) {
    // If DB persistence fails, surface as server error
    throw new AppError('Failed to persist refresh token', 500);
  }

  return { token, refreshToken };
};

const verifyRefreshTokenPayload = async (refreshToken) => {
  if (!refreshToken) {
    throw new AppError('Refresh token is required', 400);
  }

  const decoded = verifyRefreshToken(refreshToken);
  if (!decoded || !decoded.id) {
    throw new AppError('Invalid refresh token payload', 401);
  }

  // Check DB for persisted, non-revoked refresh token
  const hashed = crypto.createHash('sha256').update(refreshToken).digest('hex');

  const [rows] = await db.execute(
    'SELECT * FROM refresh_tokens WHERE token_hash = ? AND user_id = ? AND revoked = FALSE AND expires_at > NOW() LIMIT 1',
    [hashed, decoded.id]
  );

  if (!rows || rows.length === 0) {
    throw new AppError('Refresh token invalid or revoked', 401);
  }

  const user = await findUserById(decoded.id);
  if (!user || !user.is_active) {
    throw new AppError('Invalid refresh token', 401);
  }

  return user;
};

const revokeRefreshToken = async (refreshToken) => {
  if (!refreshToken) return;
  const hashed = crypto.createHash('sha256').update(refreshToken).digest('hex');
  await db.execute('UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = ?', [hashed]);
};

const createPasswordResetToken = async (userId) => {
  // Invalidate any existing tokens for this user for security
  await db.execute('DELETE FROM password_resets WHERE user_id = ?', [userId]);

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  // Set token to expire in 15 minutes
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await db.execute(
    'INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)',
    [userId, hashedToken, expiresAt]
  );

  return resetToken;
};

const verifyPasswordResetToken = async (token) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const [rows] = await db.execute(
    'SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW()',
    [hashedToken]
  );

  if (rows.length === 0) {
    throw new AppError('Token is invalid or has expired', 400);
  }

  return rows[0];
};

const resetUserPassword = async (userId, newPassword) => {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await db.execute(
    'UPDATE users SET password = ? WHERE id = ?',
    [hashedPassword, userId]
  );
};

const deletePasswordResetToken = async (token) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  await db.execute('DELETE FROM password_resets WHERE token = ?', [hashedToken]);
};

const updateUserProfile = async (userId, userRole, data) => {
  const { username, email, ...profileData } = data;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Update users table if username or email is provided
    if (username || email) {
      if (email) {
        const [existing] = await connection.execute('SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?', [email, userId]);
        if (existing.length > 0) {
          throw new AppError('Email is already in use by another account.', 409);
        }
      }
      if (username) {
        const [existing] = await connection.execute('SELECT id FROM users WHERE LOWER(username) = LOWER(?) AND id != ?', [username, userId]);
        if (existing.length > 0) {
          throw new AppError('Username is already in use by another account.', 409);
        }
      }

      const updateFields = [];
      const updateValues = [];
      if (username) {
        updateFields.push('username = ?');
        updateValues.push(username);
      }
      if (email) {
        updateFields.push('email = ?');
        updateValues.push(email);
      }
      updateValues.push(userId);

      await connection.execute(
        `UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
        updateValues
      );
    }

    // 2. Update profile table
    if (Object.keys(profileData).length > 0) {
      if (userRole === 'business' && profileData.business_name !== undefined) {
        await connection.execute(
          `UPDATE business_profiles SET business_name = ?, phone = ?, updated_at = NOW() WHERE user_id = ?`,
          [profileData.business_name, profileData.phone, userId]
        );
      } else if (userRole === 'student' && profileData.monthly_budget !== undefined) {
        await connection.execute(
          `UPDATE student_profiles SET monthly_budget = ?, updated_at = NOW() WHERE user_id = ?`,
          [profileData.monthly_budget, userId]
        );
      }
    }

    await connection.commit();

    // 3. Fetch and return the updated user object
    const updatedUser = await findUserById(userId);
    const updatedProfileData = await getProfileData(updatedUser);
    return buildUserResponse(updatedUser, updatedProfileData);

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const changeUserPassword = async (userId, oldPassword, newPassword) => {
    const [users] = await db.execute('SELECT password FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
        throw new AppError('User not found', 404);
    }
    const user = users[0];

    const passwordMatch = await bcrypt.compare(oldPassword, user.password);
    if (!passwordMatch) {
        throw new AppError('Incorrect old password', 400);
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

    return true;
};

const updateUserAvatar = async (userId, avatarUrl) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Get the old avatar URL to delete the file
    const [users] = await connection.execute('SELECT avatar FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      throw new AppError('User not found', 404);
    }
    const oldAvatarUrl = users[0].avatar;

    // 2. Update the database with the new avatar URL
    await connection.execute('UPDATE users SET avatar = ? WHERE id = ?', [avatarUrl, userId]);

    await connection.commit();

    // 3. Delete the old avatar file after the transaction is successful
    if (oldAvatarUrl) {
      const filename = path.basename(oldAvatarUrl);
      const oldAvatarPath = path.join(__dirname, '..', 'public', 'uploads', 'avatars', filename);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    // 4. Return the updated user object
    const updatedUser = await findUserById(userId);
    const updatedProfileData = await getProfileData(updatedUser);
    return buildUserResponse(updatedUser, updatedProfileData);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const registerUser = async (userData) => {
  const {
    username,
    email,
    password,
    role,
    business_name,
    phone,
    monthly_budget
  } = userData;

  const normalizedRole = String(role || "student").toLowerCase().trim();

  if (!["student", "business"].includes(normalizedRole)) {
    throw new AppError("Invalid user role", 400);
  }

  const cleanUsername = String(username || "").trim();
  const cleanEmail = String(email || "").trim().toLowerCase();

  const hashedPassword = await bcrypt.hash(password, 10);

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    /* =========================================
       DUPLICATE CHECK
    ========================================= */

    const [existingUsers] = await connection.execute(
      `
      SELECT id
      FROM users
      WHERE LOWER(email) = LOWER(?)
      OR LOWER(username) = LOWER(?)
      LIMIT 1
      `,
      [cleanEmail, cleanUsername]
    );

    if (existingUsers.length > 0) {
      throw new AppError(
        "Email or username already exists",
        409
      );
    }

    /* =========================================
       CREATE USER
    ========================================= */

    const [userResult] = await connection.execute(
      `
      INSERT INTO users (
        username,
        email,
        password,
        role,
        is_active,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, TRUE, NOW(), NOW())
      `,
      [
        cleanUsername,
        cleanEmail,
        hashedPassword,
        normalizedRole
      ]
    );

    const userId = userResult.insertId;

    /* =========================================
       BUSINESS PROFILE
    ========================================= */

    if (normalizedRole === "business") {
      await connection.execute(
        `
        INSERT INTO business_profiles (
          user_id,
          business_name,
          phone,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, NOW(), NOW())
        `,
        [
          userId,
          String(business_name || "").trim(),
          String(phone || "").trim()
        ]
      );
    }

    /* =========================================
       STUDENT PROFILE
    ========================================= */

    if (normalizedRole === "student") {
      await connection.execute(
        `
        INSERT INTO student_profiles (
          user_id,
          monthly_budget,
          created_at,
          updated_at
        )
        VALUES (?, ?, NOW(), NOW())
        `,
        [
          userId,
          Number(monthly_budget || 0)
        ]
      );
    }

    await connection.commit();

    /* =========================================
       RETURN FULL USER
    ========================================= */

    const user = await findUserById(userId);

    const profileData = await getProfileData(user);

    return buildUserResponse(user, profileData);

  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * If a legacy user has a plaintext password stored, upgrade it to a bcrypt hash.
 * Returns true if an upgrade occurred (and password matched), false otherwise.
 */
const upgradePlaintextPassword = async (user, plainPassword) => {
  if (!user || !plainPassword) return false;

  const stored = String(user.password || "");

  // If it already looks like a bcrypt hash, do not attempt upgrade
  if (stored.startsWith("$2")) return false;

  // If stored plaintext matches the provided password, hash and update
  if (stored === plainPassword) {
    const hashed = await bcrypt.hash(plainPassword, 10);
    await db.execute('UPDATE users SET password = ? WHERE id = ?', [hashed, user.id]);
    return true;
  }

  return false;
};

module.exports = {
  buildUserResponse,
  getProfileData,
  findUserByIdentifier,
  findUserById,
  generateTokens,
  verifyRefreshTokenPayload,
  revokeRefreshToken,
  createPasswordResetToken,
  verifyPasswordResetToken,
  resetUserPassword,
  deletePasswordResetToken,
  updateUserProfile,
  changeUserPassword,
  updateUserAvatar,
  upgradePlaintextPassword,
  registerUser,
};

