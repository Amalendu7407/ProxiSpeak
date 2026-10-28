import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

if (config.cloudinary.isConfigured) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
    secure: true,
  });
  logger.info('Cloudinary SDK v2 configured successfully');
} else {
  logger.warn('Cloudinary credentials not set. Uploads will use mock/fallback storage.');
}

export class CloudinaryService {
  /**
   * Upload an avatar buffer to Cloudinary with safe server-generated public ID
   */
  static async uploadAvatar(buffer, userId, userName = 'User') {
    if (!config.cloudinary.isConfigured) {
      // Safe fallback when Cloudinary is not configured: generate a clean SVG avatar data URI
      logger.info('Using local SVG fallback avatar for development/testing');
      const initials = userName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      const mockPublicId = `local_avatar_${userId}_${Date.now()}`;
      const mockUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userName)}&radius=50&backgroundColor=16a34a,22c55e,2563eb`;

      return {
        url: mockUrl,
        publicId: mockPublicId,
      };
    }

    return new Promise((resolve, reject) => {
      const safePublicId = `user_${userId}_${Date.now()}`;

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'proxispeak/avatars',
          public_id: safePublicId,
          resource_type: 'image',
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
          transformation: [
            { width: 256, height: 256, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
          overwrite: true,
          invalidate: true,
        },
        (error, result) => {
          if (error) {
            logger.error('Cloudinary avatar upload failed', { error: error.message });
            return reject(new Error(`Failed to upload avatar: ${error.message}`));
          }

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        }
      );

      uploadStream.end(buffer);
    });
  }

  /**
   * Safely delete an existing image from Cloudinary
   */
  static async deleteImage(publicId) {
    if (!publicId || publicId.startsWith('local_avatar_')) {
      return { result: 'ok' };
    }

    if (!config.cloudinary.isConfigured) {
      return { result: 'ok' };
    }

    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        invalidate: true,
        resource_type: 'image',
      });
      logger.info('Deleted image from Cloudinary', { publicId, result: result.result });
      return result;
    } catch (err) {
      logger.error('Failed to delete image from Cloudinary', { publicId, error: err.message });
      // We log but don't crash profile deletion if Cloudinary delete fails
      return null;
    }
  }
}
