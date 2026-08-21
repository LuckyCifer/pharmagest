import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const res = await axios.post('/api/auth/refresh/', { refresh })
          localStorage.setItem('access_token', res.data.access)
          original.headers.Authorization = `Bearer ${res.data.access}`
          return api(original)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      } else {
        localStorage.clear()
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api

export const authService = {
  login: (credentials) => api.post('/auth/login/', credentials),
  profil: () => api.get('/users/profil/'),
}

export const userService = {
  lister:   (params)    => api.get('/users/', { params }),
  creer:    (data)      => api.post('/users/', data),
  modifier: (id, data)  => api.patch(`/users/${id}/`, data),
  supprimer:(id)        => api.delete(`/users/${id}/`),
}

export const medicamentService = {
  lister:           (params) => api.get('/medicaments/', { params }),
  obtenir:          (id)     => api.get(`/medicaments/${id}/`),
  creer:            (data)   => api.post('/medicaments/', data),
  modifier:         (id, d)  => api.put(`/medicaments/${id}/`, d),
  supprimer:        (id)     => api.delete(`/medicaments/${id}/`),
  alertes:          ()       => api.get('/medicaments/alertes/'),
  categories:       (params) => api.get('/medicaments/categories/', { params }),
  creerCategorie:   (data)   => api.post('/medicaments/categories/', data),
  fournisseurs:     (params) => api.get('/medicaments/fournisseurs/', { params }),
  creerFournisseur: (data)   => api.post('/medicaments/fournisseurs/', data),
}

export const stockService = {
  mouvements:     (params) => api.get('/stocks/mouvements/', { params }),
  creerMouvement: (data)   => api.post('/stocks/mouvements/', data),
  alertes:        (params) => api.get('/stocks/alertes/', { params }),
  resoudreAlerte: (id)     => api.patch(`/stocks/alertes/${id}/resoudre/`),
}

export const venteService = {
  lister:    (params) => api.get('/ventes/', { params }),
  obtenir:   (id)     => api.get(`/ventes/${id}/`),
  creer:     (data)   => api.post('/ventes/', data),
  exportCsv: ()       => api.get('/ventes/export/csv/', { responseType: 'blob' }),
  exportPreview: ()   => api.get('/ventes/export/csv/', { params: { preview: 1 } }),
  statutPaiement: (id) => api.get(`/ventes/${id}/statut-paiement/`),
  uploadOrdonnanceScan: (id, file) => {
    const form = new FormData()
    form.append('scan', file)
    return api.patch(`/ventes/${id}/ordonnance-scan/`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}

export const dashboardService = {
  stats: () => api.get('/dashboard/stats/'),
}

export const paieService = {
  lister:      (params) => api.get('/paie/', { params }),
  obtenir:     (id)     => api.get(`/paie/${id}/`),
  creer:       (data)   => api.post('/paie/', data),
  modifier:    (id, d)  => api.put(`/paie/${id}/`, d),
  supprimer:   (id)     => api.delete(`/paie/${id}/`),
  marquerPayee:(id)     => api.patch(`/paie/${id}/marquer-payee/`),
}

export const commandeService = {
  lister:      (params) => api.get('/commandes/', { params }),
  obtenir:     (id)     => api.get(`/commandes/${id}/`),
  creer:       (data)   => api.post('/commandes/', data),
  modifier:    (id, d)  => api.patch(`/commandes/${id}/`, d),
  supprimer:   (id)     => api.delete(`/commandes/${id}/`),
  recevoir:    (id, d)  => api.patch(`/commandes/${id}/recevoir/`, d),
  annuler:     (id)     => api.patch(`/commandes/${id}/annuler/`),
  suggestions: (params) => api.get('/commandes/suggestions/', { params }),
}
