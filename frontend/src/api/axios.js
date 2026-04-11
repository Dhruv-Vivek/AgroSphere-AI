import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})

api.interceptors.request.use(
  (config) => {
    if (import.meta.env.DEV) {
      const method = (config.method ?? 'get').toUpperCase()
      const url = `${config.baseURL ?? ''}${config.url ?? ''}`
      console.log(`[API Request] ${method} ${url}`, {
        params: config.params,
        data: config.data,
      })
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const data = error.response?.data

    const userMessage =
      (typeof data?.message === 'string' && data.message) ||
      (typeof data?.error === 'string' && data.error) ||
      (Array.isArray(data?.errors) && data.errors.join(', ')) ||
      error.message ||
      'Request failed. Please try again.'

    if (import.meta.env.DEV) {
      console.error('[API Error]', status ?? 'NO_STATUS', userMessage, data ?? error)
    }

    const normalized = error
    normalized.userMessage = userMessage
    normalized.status = status

    return Promise.reject(normalized)
  }
)

export default api
