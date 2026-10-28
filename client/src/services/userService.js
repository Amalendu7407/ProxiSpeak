import { apiRequest } from './api.js';

export const userService = {
  async getProfile() {
    return apiRequest('/api/users/me');
  },

  async updateProfile(updates) {
    return apiRequest('/api/users/me', {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  async uploadAvatar(file) {
    const formData = new FormData();
    formData.append('avatar', file);

    return apiRequest('/api/users/me/avatar', {
      method: 'POST',
      body: formData,
    });
  },

  async deleteAvatar() {
    return apiRequest('/api/users/me/avatar', {
      method: 'DELETE',
    });
  },
};
