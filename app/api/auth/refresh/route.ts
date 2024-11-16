import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'mosafan'

export async function POST(request: Request) {
  try {
    // Get refresh token from cookies instead of request body
    const cookieStore = cookies()
    const refreshToken = cookieStore.get('refreshToken')?.value

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'No refresh token provided' },
        { status: 401 }
      )
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, JWT_SECRET) as jwt.JwtPayload

    if (decoded.type !== 'refresh') {
      return NextResponse.json(
        { error: 'Invalid token type' },
        { status: 401 }
      )
    }

    // Generate new access token
    const accessToken = jwt.sign(
      { username: decoded.username, type: 'access' },
      JWT_SECRET,
      { expiresIn: '30m' }
    )

    // Create response with new access token
    const response = NextResponse.json({ accessToken })
    
    // Set refresh token in HTTP-only cookie
    response.cookies.set({
      name: 'refreshToken',
      value: refreshToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })

    return response
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid refresh token' },
      { status: 401 }
    )
  }
} 