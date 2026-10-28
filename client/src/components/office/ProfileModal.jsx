import React, { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import { Button } from '../common/Button.jsx';
import { Input } from '../common/Input.jsx';
import { Avatar } from '../common/Avatar.jsx';
import { Upload, Trash2, Check, AlertCircle, LogOut } from 'lucide-react';
import { userService } from '../../services/userService.js';
import { useAuth } from '../../hooks/useAuth.js';

export function ProfileModal({ isOpen, onClose }) {
  const { user, updateUser, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (selected.size > 5 * 1024 * 1024) {
      setError('File size exceeds 5MB limit');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
      setError('Only JPEG, PNG, or WebP images are allowed');
      return;
    }

    setError('');
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const handleUploadAvatar = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await userService.uploadAvatar(file);
      updateUser(res.user);
      setFile(null);
      setPreviewUrl(null);
      setSuccess('Profile picture updated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to upload image');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await userService.deleteAvatar();
      updateUser(res.user);
      setPreviewUrl(null);
      setSuccess('Profile picture removed');
    } catch (err) {
      setError(err.message || 'Failed to remove image');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateName = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await userService.updateProfile({ name });
      updateUser(res.user);
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Your Profile">
      <div className="space-y-6">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Avatar Section */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-800/40 border border-slate-700/60">
          <div className="relative">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-16 h-16 rounded-full object-cover border-2 border-brand-400"
              />
            ) : (
              <Avatar user={user} size="lg" />
            )}
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  Select Image
                </span>
              </label>

              {file && (
                <Button size="sm" onClick={handleUploadAvatar} loading={loading}>
                  Upload
                </Button>
              )}

              {user?.avatar?.url && !file && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDeleteAvatar}
                  disabled={loading}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  Remove
                </Button>
              )}
            </div>
            <p className="text-[11px] text-slate-500">Max 5MB (JPEG, PNG, or WebP). Cloudinary v2 optimized.</p>
          </div>
        </div>

        {/* Edit Name Form */}
        <form onSubmit={handleUpdateName} className="space-y-4">
          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label="Corporate Email"
            value={user?.email || ''}
            disabled
            helper="Email is verified and tied to your company domain"
          />

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="danger"
              size="sm"
              icon={LogOut}
              onClick={() => {
                logout();
                onClose();
              }}
            >
              Sign Out
            </Button>

            <Button type="submit" size="sm" loading={loading}>
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
