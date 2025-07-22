import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import connectDB from '@/lib/mongodb'
import User from '@/lib/models/User'

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required')
})

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const body = await request.json()
    const { token } = verifyEmailSchema.parse(body)

    // Find user with verification token
    const user = await User.findOne({ 
      emailVerificationToken: token 
    }).select('+emailVerificationToken')

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      )
    }

    // Update user as verified
    user.isEmailVerified = true
    user.emailVerificationToken = undefined
    await user.save()

    return NextResponse.json({
      message: 'Email verified successfully. You can now sign in.'
    }, { status: 200 })

  } catch (error) {
    console.error('Email verification error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}