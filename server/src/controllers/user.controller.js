import { User } from '../models/User.js';
import { CloudinaryService } from '../services/cloudinary.service.js';
import { updateProfileSchema } from '../validators/auth.validator.js';

export class UserController {
  static async getProfile(req, res, next) {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        });
      }

      return res.status(200).json({
        success: true,
        user: user.toSafeJSON(),
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const validated = updateProfileSchema.parse(req.body);

      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        });
      }

      if (validated.name) {
        user.name = validated.name;
      }

      await user.save();

      return res.status(200).json({
        success: true,
        user: user.toSafeJSON(),
      });
    } catch (err) {
      next(err);
    }
  }

  static async uploadAvatar(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_FILE',
            message: 'Please provide an image file to upload',
          },
        });
      }

      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        });
      }

      const oldPublicId = user.avatar?.publicId;

      // 1. Upload new image first
      const uploadResult = await CloudinaryService.uploadAvatar(
        req.file.buffer,
        user._id.toString(),
        user.name
      );

      // 2. Update user profile in database
      user.avatar = {
        url: uploadResult.url,
        publicId: uploadResult.publicId,
      };
      await user.save();

      // 3. Delete old avatar from Cloudinary only after successful upload & DB update
      if (oldPublicId && oldPublicId !== uploadResult.publicId) {
        await CloudinaryService.deleteImage(oldPublicId);
      }

      return res.status(200).json({
        success: true,
        user: user.toSafeJSON(),
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteAvatar(req, res, next) {
    try {
      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        });
      }

      const oldPublicId = user.avatar?.publicId;

      user.avatar = {
        url: '',
        publicId: '',
      };
      await user.save();

      if (oldPublicId) {
        await CloudinaryService.deleteImage(oldPublicId);
      }

      return res.status(200).json({
        success: true,
        user: user.toSafeJSON(),
      });
    } catch (err) {
      next(err);
    }
  }
}
