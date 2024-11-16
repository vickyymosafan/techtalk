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
      // Buat token JWT
      const token = jwt.sign(
        { 
          username,
          // Tambahkan data user lainnya jika perlu
        },
        JWT_SECRET,
        { expiresIn: '7d' }
      )

      return NextResponse.json({ token })
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