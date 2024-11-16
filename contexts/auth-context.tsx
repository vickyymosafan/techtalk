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

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      if (!response.ok) {
        return false
      }

      const { token } = await response.json()
      
      // Store JWT in localStorage instead of cookies
      localStorage.setItem('auth-token', token)

      // Decode JWT to get user info
      const decoded = jwtDecode(token)
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
    setIsAuthenticated(false)
    setUser(null)
    router.push('/login')
  }

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