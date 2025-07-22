import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import connectDB from '@/lib/mongodb'
import User from '@/lib/models/User'
import { generateVerificationToken } from '@/lib/auth/jwt'
import { sendEmail, getVerificationEmailHTML } from '@/lib/email/resend'

const signupSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  secondName: z.string().min(1, 'Second name is required').max(50),
  surname: z.string().min(1, 'Surname is required').max(50),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['teacher', 'student', 'parent'], {
    errorMap: () => ({ message: 'Role must be teacher, student, or parent' })
  })
})

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const body = await request.json()
    const validatedData = signupSchema.parse(body)

    // Check if user already exists
    const existingUser = await User.findOne({ email: validatedData.email })
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Generate email verification token
    const emailVerificationToken = generateVerificationToken()

    // Create new user
    const user = new User({
      ...validatedData,
      emailVerificationToken
    })

    await user.save()

    // Send verification email
    try {
      await sendEmail({
        to: validatedData.email,
        subject: 'Welcome to SchoolConnect - Verify Your Email',
        html: getVerificationEmailHTML(validatedData.firstName, emailVerificationToken)
      })
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError)
      // Don't fail the registration if email fails
    }

    return NextResponse.json({
      message: 'User registered successfully. Please check your email to verify your account.',
      userId: user._id
    }, { status: 201 })

  } catch (error) {
    console.error('Signup error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}