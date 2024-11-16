'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { jwtDecode } from 'jwt-decode'

interface AuthContextType {
  isAuthenticated: boolean
  user: any | null
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<any | null>(null)
  const router = useRouter()

  // Check authentication status on mount
  useEffect(() => {
    const token = localStorage.getItem('auth-token')
    if (token) {
      try {
        const decoded = jwtDecode(token)
        // Check if token is expired
        const currentTime = Date.now() / 1000
        if (decoded.exp && decoded.exp > currentTime) {
          setUser(decoded)
          setIsAuthenticated(true)
        } else {
          // Token expired
          localStorage.removeItem('auth-token')
        }
      } catch (error) {
        // Invalid token
        localStorage.removeItem('auth-token')
      }
    }
  }, [])

  const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem('refresh-token')
    if (!refreshToken) return false

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      })

      if (!response.ok) {
        logout()
        return false
      }

      const { accessToken } = await response.json()
      localStorage.setItem('auth-token', accessToken)
      return true
    } catch (error) {
      console.error('Token refresh error:', error)
      logout()
      return false
    }
  }

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      if (!response.ok) return false

      const { accessToken, refreshToken } = await response.json()
      
      localStorage.setItem('auth-token', accessToken)
      localStorage.setItem('refresh-token', refreshToken)

      const decoded = jwtDecode(accessToken)
      setUser(decoded)
      setIsAuthenticated(true)
      return true
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem('auth-token')
    localStorage.removeItem('refresh-token')
    setIsAuthenticated(false)
    setUser(null)
    router.push('/login')
  }

  // Add auto refresh mechanism
  useEffect(() => {
    if (isAuthenticated) {
      const checkTokenExpiry = async () => {
        const token = localStorage.getItem('auth-token')
        if (!token) return

        try {
          const decoded = jwtDecode(token)
          const currentTime = Date.now() / 1000

          // Refresh token 1 minute before expiry
          if (decoded.exp && decoded.exp - currentTime < 60) {
            await refreshAccessToken()
          }
        } catch (error) {
          console.error('Token check error:', error)
        }
      }

      // Check every minute
      const interval = setInterval(checkTokenExpiry, 60000)
      return () => clearInterval(interval)
    }
  }, [isAuthenticated])

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 