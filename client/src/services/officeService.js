import { apiRequest } from './api.js';

export const officeService = {
  async listOffices() {
    return apiRequest('/api/offices');
  },

  async getOffice(identifier) {
    return apiRequest(`/api/offices/${identifier}`);
  },

  async createOffice(data) {
    return apiRequest('/api/offices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
