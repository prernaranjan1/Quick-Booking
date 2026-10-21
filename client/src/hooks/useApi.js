import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@clerk/react'
import { apiRequest } from '../lib/api'

// Loads `path` from the API. Pass auth: true for routes that need sign-in.
// Pass a null path to skip loading.
const useApi = (path, { auth = false } = {}) => {
  const { getToken } = useAuth()
  const [result, setResult] = useState({ key: null, data: null, error: null })
  const [reloadCount, setReloadCount] = useState(0)

  const key = path ? `${path}#${reloadCount}` : null

  useEffect(() => {
    if (!path) return

    let cancelled = false

    const load = async () => {
      try {
        const token = auth ? await getToken() : null
        const data = await apiRequest(path, { token })
        if (!cancelled) setResult({ key, data, error: null })
      } catch (error) {
        if (!cancelled) setResult({ key, data: null, error })
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [path, auth, getToken, key])

  const reload = useCallback(() => setReloadCount((count) => count + 1), [])
  const isCurrent = result.key === key

  return {
    data: isCurrent ? result.data : null,
    error: isCurrent ? result.error : null,
    loading: Boolean(path) && !isCurrent,
    reload
  }
}

export default useApi
