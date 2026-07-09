import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Attach JWT token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('postpilot_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 responses — clear auth, let AuthContext handle redirect
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('postpilot_token')
      localStorage.removeItem('postpilot_user')
    }
    return Promise.reject(error)
  }
)

export default api