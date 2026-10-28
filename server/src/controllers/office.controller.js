import { OfficeService } from '../services/office.service.js';
import { z } from 'zod';

const createOfficeSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().max(500).optional(),
  code: z.string().trim().min(3).max(20).optional(),
  isPublic: z.boolean().optional(),
});

export class OfficeController {
  static async listOffices(req, res, next) {
    try {
      const offices = await OfficeService.listUserOffices(req.user.userId);
      return res.status(200).json({
        success: true,
        offices,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getOffice(req, res, next) {
    try {
      const office = await OfficeService.getOfficeByIdOrCode(req.params.identifier);
      if (!office) {
        return res.status(404).json({
          success: false,
          error: { code: 'OFFICE_NOT_FOUND', message: 'Office not found' },
        });
      }

      const isAuthorized = await OfficeService.isUserAuthorizedForOffice(
        office._id,
        req.user.userId
      );

      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You do not have access to this office' },
        });
      }

      return res.status(200).json({
        success: true,
        office,
      });
    } catch (err) {
      next(err);
    }
  }

  static async createOffice(req, res, next) {
    try {
      const validated = createOfficeSchema.parse(req.body);
      const office = await OfficeService.createOffice(validated, req.user.userId);
      return res.status(201).json({
        success: true,
        office,
      });
    } catch (err) {
      next(err);
    }
  }
}
