const baseUrl = import.meta.env.VITE_BASE_URL || ''

// Calls the server API and returns the JSON body.
// Throws an Error with the server's message when the request fails.
export const apiRequest = async (path, { method = 'GET', body, token } = {}) => {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  })

  let data
  try {
    data = await response.json()
  } catch {
    data = {}
  }

  if (!response.ok || data.success === false) {
    const error = new Error(data.message || `Request failed (${response.status})`)
    error.status = response.status
    throw error
  }

  return data
}
