import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'mosafan'

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    // Baca kredensial dari environment variables
    const validUsername = process.env.NEXT_PUBLIC_USERNAME
    const validPassword = process.env.NEXT_PUBLIC_PASSWORD

    console.log('Attempting login with:', {
      input: { username, password },
      valid: { validUsername, validPassword }
    })

    if (username === validUsername && password === validPassword) {
      // Generate access token (short-lived)
      const accessToken = jwt.sign(
        { username, type: 'access' },
        JWT_SECRET,
        { expiresIn: '30m' } // 30 menit
      )

      // Generate refresh token (long-lived)
      const refreshToken = jwt.sign(
        { username, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: '7d' }
      )

      return NextResponse.json({ 
        accessToken,
        refreshToken
      })
    }

    return NextResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    )
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 