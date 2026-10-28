import { AuthService } from '../services/auth.service.js';
import { registerSchema, loginSchema } from '../validators/auth.validator.js';
import { config } from '../config/index.js';

function setRefreshTokenCookie(res, tokenString) {
  res.cookie('refreshToken', tokenString, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    maxAge: config.jwt.refreshTtlDays * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export class AuthController {
  static async register(req, res, next) {
    try {
      const validated = registerSchema.parse(req.body);
      const result = await AuthService.register(validated);

      setRefreshTokenCookie(res, result.refreshTokenString);

      return res.status(201).json({
        success: true,
        user: result.user,
        accessToken: result.accessToken,
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req, res, next) {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await AuthService.login(validated);

      setRefreshTokenCookie(res, result.refreshTokenString);

      return res.status(200).json({
        success: true,
        user: result.user,
        accessToken: result.accessToken,
      });
    } catch (err) {
      next(err);
    }
  }

  static async refresh(req, res, next) {
    try {
      const token = req.cookies?.refreshToken || req.body?.refreshToken;
      if (!token) {
        return res.status(200).json({
          success: false,
          authenticated: false,
          message: 'No active session cookie found',
        });
      }

      const result = await AuthService.refresh(token);

      setRefreshTokenCookie(res, result.refreshTokenString);

      return res.status(200).json({
        success: true,
        authenticated: true,
        user: result.user,
        accessToken: result.accessToken,
      });
    } catch (err) {
      // Clear any invalid or stale refresh cookie from the browser
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: config.isProduction,
        sameSite: 'lax',
        path: '/',
      });

      // Preserve 401 for token reuse security detection
      if (err.code === 'TOKEN_REUSE_DETECTED') {
        return next(err);
      }

      // For normal expired or invalid tokens, return clean 200 with authenticated: false
      // so the browser console doesn't display an alarming red 401 network error on app load
      if (err.statusCode === 401) {
        return res.status(200).json({
          success: false,
          authenticated: false,
          message: err.message || 'Session expired',
        });
      }

      next(err);
    }
  }

  static async logout(req, res, next) {
    try {
      const token = req.cookies?.refreshToken || req.body?.refreshToken;
      await AuthService.logout(token);

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: config.isProduction,
        sameSite: 'lax',
        path: '/',
      });

      return res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req, res, next) {
    try {
      const user = await AuthService.getMe(req.user.userId);
      return res.status(200).json({
        success: true,
        user,
      });
    } catch (err) {
      next(err);
    }
  }
}
