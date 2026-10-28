import mongoose from 'mongoose';

const officeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Office name is required'],
      trim: true,
      maxlength: [100, 'Office name cannot exceed 100 characters'],
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
      maxlength: 500,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    layout: {
      width: {
        type: Number,
        default: 1600,
      },
      height: {
        type: Number,
        default: 1200,
      },
      spawnPoint: {
        x: { type: Number, default: 800 },
        y: { type: Number, default: 600 },
      },
      walls: [
        {
          x: { type: Number, required: true },
          y: { type: Number, required: true },
          width: { type: Number, required: true },
          height: { type: Number, required: true },
          type: { type: String, default: 'wall' }, // wall, desk, meeting-table
        },
      ],
      zones: [
        {
          name: { type: String, required: true },
          x: { type: Number, required: true },
          y: { type: Number, required: true },
          width: { type: Number, required: true },
          height: { type: Number, required: true },
          color: { type: String, default: 'rgba(59, 130, 246, 0.1)' },
        },
      ],
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Office = mongoose.model('Office', officeSchema);
