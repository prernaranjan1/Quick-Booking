import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/react'

const baseUrl = import.meta.env.VITE_BASE_URL || ''

// Asks the server whether the signed-in user is an admin.
// Returns null while checking, then true or false.
const useIsAdmin = () => {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth()
  const [result, setResult] = useState({ userId: null, isAdmin: null })

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return

    let cancelled = false

    const checkAdmin = async () => {
      let isAdmin = false

      try {
        const token = await getToken()
        const response = await fetch(`${baseUrl}/api/admin/is-admin`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await response.json()
        isAdmin = response.ok && data.isAdmin === true
      } catch (error) {
        console.error('Admin check failed:', error)
      }

      if (!cancelled) setResult({ userId, isAdmin })
    }

    checkAdmin()

    return () => {
      cancelled = true
    }
  }, [isLoaded, isSignedIn, userId, getToken])

  if (!isLoaded) return null
  if (!isSignedIn) return false
  // Still checking, or the result belongs to a previous user
  if (result.userId !== userId) return null
  return result.isAdmin
}

export default useIsAdmin
