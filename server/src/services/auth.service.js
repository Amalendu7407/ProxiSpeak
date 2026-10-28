import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { config } from '../config/index.js';
import {
  generateAccessToken,
  generateRefreshTokenString,
  hashToken,
} from '../utils/token.js';
import { isDomainAllowed } from '../validators/auth.validator.js';

export class AuthService {
  static async register({ name, email, password }) {
    const normalizedEmail = email.trim().toLowerCase();

    if (!isDomainAllowed(normalizedEmail)) {
      const err = new Error(`Registration restricted to @${config.allowedEmailDomain} domain`);
      err.statusCode = 400;
      err.code = 'INVALID_DOMAIN';
      throw err;
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      const err = new Error('An account with this email already exists');
      err.statusCode = 409;
      err.code = 'EMAIL_ALREADY_EXISTS';
      throw err;
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
    });

    const { accessToken, refreshTokenString } = await this.issueTokens(user);

    return {
      user: user.toSafeJSON(),
      accessToken,
      refreshTokenString,
    };
  }

  static async login({ email, password }) {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      const err = new Error('Invalid email or password');
      err.statusCode = 401;
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }

    const { accessToken, refreshTokenString } = await this.issueTokens(user);

    return {
      user: user.toSafeJSON(),
      accessToken,
      refreshTokenString,
    };
  }

  static async refresh(refreshTokenString) {
    if (!refreshTokenString) {
      const err = new Error('Refresh token is required');
      err.statusCode = 401;
      err.code = 'MISSING_REFRESH_TOKEN';
      throw err;
    }

    const tokenHash = hashToken(refreshTokenString);
    const storedToken = await RefreshToken.findOne({ tokenHash });

    if (!storedToken) {
      const err = new Error('Invalid refresh token');
      err.statusCode = 401;
      err.code = 'INVALID_REFRESH_TOKEN';
      throw err;
    }

    // Token reuse detection: If revoked token is used, compromise is suspected
    if (storedToken.revokedAt) {
      // Invalidate all tokens for this user
      await RefreshToken.updateMany(
        { userId: storedToken.userId },
        { revokedAt: new Date() }
      );
      const err = new Error('Refresh token has been revoked (possible token reuse)');
      err.statusCode = 401;
      err.code = 'TOKEN_REUSE_DETECTED';
      throw err;
    }

    if (new Date() >= storedToken.expiresAt) {
      const err = new Error('Refresh token has expired');
      err.statusCode = 401;
      err.code = 'EXPIRED_REFRESH_TOKEN';
      throw err;
    }

    const user = await User.findById(storedToken.userId);
    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 401;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }

    // Rotate refresh token
    const newRefreshTokenString = generateRefreshTokenString();
    const newHash = hashToken(newRefreshTokenString);

    storedToken.revokedAt = new Date();
    storedToken.replacedByTokenHash = newHash;
    await storedToken.save();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.jwt.refreshTtlDays);

    await RefreshToken.create({
      tokenHash: newHash,
      userId: user._id,
      expiresAt,
    });

    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    return {
      user: user.toSafeJSON(),
      accessToken,
      refreshTokenString: newRefreshTokenString,
    };
  }

  static async logout(refreshTokenString) {
    if (refreshTokenString) {
      const tokenHash = hashToken(refreshTokenString);
      await RefreshToken.updateOne(
        { tokenHash, revokedAt: null },
        { revokedAt: new Date() }
      );
    }
  }

  static async issueTokens(user) {
    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const refreshTokenString = generateRefreshTokenString();
    const tokenHash = hashToken(refreshTokenString);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.jwt.refreshTtlDays);

    await RefreshToken.create({
      tokenHash,
      userId: user._id,
      expiresAt,
    });

    return { accessToken, refreshTokenString };
  }

  static async getMe(userId) {
    const user = await User.findById(userId);
    if (!user) {
      const err = new Error('User not found');
      err.statusCode = 404;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }
    return user.toSafeJSON();
  }
}
