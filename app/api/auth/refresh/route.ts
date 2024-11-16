import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'mosafan'

export async function POST(request: Request) {
  try {
    const { refreshToken } = await request.json()

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

    return NextResponse.json({ accessToken })
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid refresh token' },
      { status: 401 }
    )
  }
} 