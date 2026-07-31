/**
 * apiClient — API client for the Rehoboth Church Flask + Supabase backend.
 *
 * Provides a generic CRUD + filter interface backed by the project's httpClient.
 * Each entity maps to a REST resource on the Flask backend:
 *   apiClient.entities.Membre.list()   → GET /api/membres
 *   apiClient.entities.Membre.create() → POST /api/membres
 */

import { httpClient } from '@/services/api/httpClient';

/**
 * Convert a PascalCase entity name to a kebab-case REST endpoint.
 *  "Membre"           → "membres"
 *  "EgliseParametres" → "eglise-parametres"
 *  "MembreGroupe"     → "membre-groupes"
 */
function entityToEndpoint(name) {
  const kebab = name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase();

  // Pluralize
  return kebab.endsWith('s') ? kebab : `${kebab}s`;
}

/**
 * Create CRUD helper methods for a resource endpoint.
 */
function createEntityProxy(entityName) {
  const endpoint = `/${entityToEndpoint(entityName)}`;

  const base = {
    async list(orderBy, limit) {
      const params = new URLSearchParams();
      if (orderBy) params.set('order_by', orderBy);
      if (limit) params.set('limit', String(limit));
      const qs = params.toString();
      const res = await httpClient.get(`${endpoint}${qs ? `?${qs}` : ''}`);
      return res && res.success !== undefined ? res.data : res;
    },

    async filter(filters = {}, orderBy, limit) {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        params.set(key, String(value));
      });
      if (orderBy) params.set('order_by', orderBy);
      if (limit) params.set('limit', String(limit));
      const qs = params.toString();
      const res = await httpClient.get(`${endpoint}${qs ? `?${qs}` : ''}`);
      return res && res.success !== undefined ? res.data : res;
    },

    async get(id) {
      const res = await httpClient.get(`${endpoint}/${id}`);
      return res && res.success !== undefined ? res.data : res;
    },

    async create(data) {
      const res = await httpClient.post(endpoint, data);
      return res && res.success !== undefined ? res.data : res;
    },

    async update(id, data) {
      const res = await httpClient.put(`${endpoint}/${id}`, data);
      return res && res.success !== undefined ? res.data : res;
    },

    async delete(id) {
      const res = await httpClient.delete(`${endpoint}/${id}`);
      return res && res.success !== undefined ? res.data : res;
    },
  };

  if (entityName === 'Departement') {
    return {
      ...base,
      async setChef(id, membreId) {
        return httpClient.post(`${endpoint}/${id}/chef`, { membre_id: membreId });
      },
      async getMembres(id) {
        const res = await httpClient.get(`${endpoint}/${id}/membres`);
        return res && res.success !== undefined ? res.data : res;
      },
      async addMembre(id, membreId) {
        return httpClient.post(`${endpoint}/${id}/membres`, { membre_id: membreId });
      },
      async removeMembre(id, membreId) {
        return httpClient.delete(`${endpoint}/${id}/membres/${membreId}`);
      },
      async getReunions(id) {
        const res = await httpClient.get(`${endpoint}/${id}/reunions`);
        return res && res.success !== undefined ? res.data : res;
      },
      async createReunion(id, reunionData) {
        const res = await httpClient.post(`${endpoint}/${id}/reunions`, reunionData);
        return res && res.success !== undefined ? res.data : res;
      },
      async getReunionPresences(id, reunionId) {
        const res = await httpClient.get(`${endpoint}/${id}/reunions/${reunionId}/presences`);
        return res && res.success !== undefined ? res.data : res;
      },
      async saveReunionPresences(id, reunionId, presences) {
        const res = await httpClient.post(`${endpoint}/${id}/reunions/${reunionId}/presences`, { presences });
        return res && res.success !== undefined ? res.data : res;
      },
      async sendNotifications(id, subject, content) {
        const res = await httpClient.post(`${endpoint}/${id}/notifications`, { sujet: subject, contenu: content });
        return res && res.success !== undefined ? res.data : res;
      },
      async getRapports(id) {
        const res = await httpClient.get(`${endpoint}/${id}/rapports`);
        return res && res.success !== undefined ? res.data : res;
      },
      async submitRapport(id, rapportData) {
        const res = await httpClient.post(`${endpoint}/${id}/rapports`, rapportData);
        return res && res.success !== undefined ? res.data : res;
      },
      async getDocuments(id) {
        const res = await httpClient.get(`${endpoint}/${id}/documents`);
        return res && res.success !== undefined ? res.data : res;
      },
      async addDocument(id, docData) {
        const res = await httpClient.post(`${endpoint}/${id}/documents`, docData);
        return res && res.success !== undefined ? res.data : res;
      },
      async deleteDocument(id, docId) {
        const res = await httpClient.delete(`${endpoint}/${id}/documents/${docId}`);
        return res && res.success !== undefined ? res.data : res;
      },
      async rejoindre(id, joinData) {
        const res = await httpClient.post(`${endpoint}/${id}/rejoindre`, joinData);
        return res && res.success !== undefined ? res.data : res;
      }
    };
  }

  return base;
}

const integrations = {
  Core: {
    async SendEmail(payload) {
      const res = await httpClient.post('/integrations/send-email', payload);
      return res && res.success !== undefined ? res.data : res;
    },
  },
};

export const apiClient = {
  entities: new Proxy(
    {},
    {
      get(_target, prop) {
        if (!_target[prop]) {
          _target[prop] = createEntityProxy(prop);
        }
        return _target[prop];
      },
    }
  ),
  integrations,
};

export default apiClient;
