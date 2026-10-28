import { Office } from '../models/Office.js';
import { OfficeMembership } from '../models/OfficeMembership.js';
import { logger } from '../utils/logger.js';

export const DEFAULT_OFFICE_LAYOUT = {
  width: 1600,
  height: 1200,
  spawnPoint: { x: 800, y: 600 },
  walls: [
    // Outer boundary walls
    { x: 0, y: 0, width: 1600, height: 20, type: 'wall' },
    { x: 0, y: 0, width: 20, height: 1200, type: 'wall' },
    { x: 0, y: 1180, width: 1600, height: 20, type: 'wall' },
    { x: 1580, y: 0, width: 20, height: 1200, type: 'wall' },

    // Meeting Room Alpha (Top-Left)
    { x: 20, y: 380, width: 380, height: 16, type: 'wall' },
    { x: 400, y: 20, width: 16, height: 260, type: 'wall' }, // doorway gap at y: 280-380
    // Conference table inside Meeting Room Alpha
    { x: 140, y: 140, width: 160, height: 100, type: 'meeting-table' },

    // Executive Boardroom (Top-Right)
    { x: 1180, y: 20, width: 16, height: 260, type: 'wall' },
    { x: 1200, y: 380, width: 380, height: 16, type: 'wall' },
    // Boardroom table
    { x: 1280, y: 140, width: 200, height: 110, type: 'meeting-table' },

    // Coffee & Lounge Area (Bottom-Left)
    { x: 20, y: 800, width: 380, height: 16, type: 'wall' },
    { x: 400, y: 800, width: 16, height: 260, type: 'wall' },
    // Lounge bar / counter
    { x: 120, y: 920, width: 180, height: 60, type: 'desk' },

    // Quiet Focus Pods (Bottom-Right)
    { x: 1180, y: 800, width: 16, height: 260, type: 'wall' },
    { x: 1200, y: 800, width: 380, height: 16, type: 'wall' },

    // Central Open Desks (Island 1)
    { x: 550, y: 350, width: 180, height: 70, type: 'desk' },
    { x: 870, y: 350, width: 180, height: 70, type: 'desk' },

    // Central Open Desks (Island 2)
    { x: 550, y: 780, width: 180, height: 70, type: 'desk' },
    { x: 870, y: 780, width: 180, height: 70, type: 'desk' },
  ],
  zones: [
    {
      name: 'Meeting Room Alpha',
      x: 20,
      y: 20,
      width: 380,
      height: 360,
      color: 'rgba(59, 130, 246, 0.08)',
    },
    {
      name: 'Executive Boardroom',
      x: 1200,
      y: 20,
      width: 380,
      height: 360,
      color: 'rgba(168, 85, 247, 0.08)',
    },
    {
      name: 'Open Workspace',
      x: 450,
      y: 250,
      width: 700,
      height: 700,
      color: 'rgba(34, 197, 94, 0.04)',
    },
    {
      name: 'Coffee & Kitchen Lounge',
      x: 20,
      y: 820,
      width: 380,
      height: 360,
      color: 'rgba(234, 179, 8, 0.08)',
    },
    {
      name: 'Quiet Focus Pods',
      x: 1200,
      y: 820,
      width: 380,
      height: 360,
      color: 'rgba(244, 63, 94, 0.08)',
    },
  ],
};

export class OfficeService {
  /**
   * Get or create default office for instant onboarding
   */
  static async getOrCreateDefaultOffice(creatorUserId) {
    let office = await Office.findOne({ code: 'HQ1' });

    if (!office) {
      logger.info('Provisioning default office HQ1');
      office = await Office.create({
        name: 'ProxiSpeak Headquarters',
        code: 'HQ1',
        ownerId: creatorUserId,
        description: 'Main virtual collaboration office with spatial audio and meeting zones.',
        isPublic: true,
        layout: DEFAULT_OFFICE_LAYOUT,
      });
    }

    return office;
  }

  static async listUserOffices(userId) {
    const defaultOffice = await this.getOrCreateDefaultOffice(userId);

    // Find offices where user is member or public offices
    const memberships = await OfficeMembership.find({ userId });
    const officeIds = memberships.map((m) => m.officeId);

    const offices = await Office.find({
      $or: [{ _id: { $in: officeIds } }, { isPublic: true }, { ownerId: userId }],
    }).sort({ createdAt: -1 });

    return offices;
  }

  static async getOfficeByIdOrCode(identifier) {
    let office = null;
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      office = await Office.findById(identifier);
    }
    if (!office) {
      office = await Office.findOne({ code: identifier.toUpperCase() });
    }
    return office;
  }

  static async createOffice(data, ownerId) {
    const code = data.code
      ? data.code.toUpperCase().trim()
      : Math.random().toString(36).substring(2, 8).toUpperCase();

    const office = await Office.create({
      name: data.name,
      code,
      ownerId,
      description: data.description || '',
      isPublic: data.isPublic ?? true,
      layout: DEFAULT_OFFICE_LAYOUT,
    });

    await OfficeMembership.create({
      officeId: office._id,
      userId: ownerId,
      role: 'owner',
    });

    return office;
  }

  static async isUserAuthorizedForOffice(officeId, userId) {
    const office = await Office.findById(officeId);
    if (!office) return false;

    // Public offices in the company domain are accessible to all authenticated domain users
    if (office.isPublic) return true;

    if (office.ownerId.toString() === userId.toString()) return true;

    const membership = await OfficeMembership.findOne({ officeId, userId });
    return Boolean(membership);
  }
}
