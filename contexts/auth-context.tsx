'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'

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
    const token = Cookies.get('auth-token')
    if (token) {
      setIsAuthenticated(true)
      // Optionally fetch user data here
    }
  }, [])

  const login = async (username: string, password: string) => {
    try {
      // Replace with your actual login API call
      if (username === 'vi' && password === '1010') {
        // Set authentication cookie
        Cookies.set('auth-token', 'your-auth-token', { expires: 7 })
        setIsAuthenticated(true)
        setUser({ username })
        return true
      }
      return false
    } catch (error) {
      console.error('Login error:', error)
      return false
    }
  }

  const logout = () => {
    Cookies.remove('auth-token')
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