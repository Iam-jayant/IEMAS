/**
 * IEMAS Frontend - API Client Configuration
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * API client with authentication support
 */
export const api = {
  /**
   * Make authenticated API request
   */
  async fetch(endpoint: string, options: RequestInit = {}) {
    const token = localStorage.getItem('access_token')
    
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }

    return response.json()
  },

  /**
   * GET request
   */
  async get(endpoint: string) {
    return this.fetch(endpoint)
  },

  /**
   * POST request
   */
  async post(endpoint: string, data: any) {
    return this.fetch(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  /**
   * PUT request
   */
  async put(endpoint: string, data: any) {
    return this.fetch(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  /**
   * DELETE request
   */
  async delete(endpoint: string) {
    return this.fetch(endpoint, {
      method: 'DELETE',
    })
  },
}
