import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Quiz from '@/lib/models/Quiz'
import QuizAttempt from '@/lib/models/QuizAttempt'
import User from '@/lib/models/User'
import { verifyToken } from '@/lib/auth/jwt'

// POST - Start a new quiz attempt
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const authHeader = request.headers.get('authorization')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = authHeader?.replace('Bearer ', '') || cookieToken

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const payload = verifyToken(token)
    const user = await User.findById(payload.userId)
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.role !== 'student') {
      return NextResponse.json({ error: 'Only students can take quizzes' }, { status: 403 })
    }

    const quiz = await Quiz.findById(params.id)
    
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    if (quiz.status !== 'published') {
      return NextResponse.json({ error: 'Quiz is not available' }, { status: 403 })
    }

    // Check if quiz is past due date
    if (quiz.dueDate && new Date() > new Date(quiz.dueDate)) {
      return NextResponse.json({ error: 'Quiz deadline has passed' }, { status: 403 })
    }

    // Check if student has exceeded max attempts
    const completedAttempts = await QuizAttempt.getStudentAttemptCount(
      user._id.toString(), 
      quiz._id.toString()
    )

    if (completedAttempts >= quiz.settings.maxAttempts) {
      return NextResponse.json({ 
        error: `Maximum ${quiz.settings.maxAttempts} attempts reached` 
      }, { status: 403 })
    }

    // Check for existing in-progress attempt
    const existingAttempt = await QuizAttempt.findOne({
      student: user._id,
      quiz: quiz._id,
      status: 'in_progress'
    })

    if (existingAttempt) {
      return NextResponse.json({
        success: true,
        attempt: existingAttempt
      }, { status: 200 })
    }

    // Create new attempt
    const attemptNumber = completedAttempts + 1
    
    const attempt = new QuizAttempt({
      quiz: quiz._id,
      student: user._id,
      attemptNumber,
      status: 'in_progress',
      score: 0,
      maxScore: quiz.totalPoints,
      percentage: 0,
      timeSpentMinutes: 0,
      responses: [],
      ipAddress: request.ip || request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    await attempt.save()

    return NextResponse.json({
      success: true,
      attempt: await QuizAttempt.findById(attempt._id)
        .populate('quiz', 'title questions settings')
        .populate('student', 'firstName surname')
    }, { status: 201 })

  } catch (error) {
    console.error('Start quiz attempt error:', error)
    
    if (error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Failed to start quiz attempt' }, { status: 500 })
  }
}

// GET - Get current attempt or attempt history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const authHeader = request.headers.get('authorization')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = authHeader?.replace('Bearer ', '') || cookieToken

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const payload = verifyToken(token)
    const user = await User.findById(payload.userId)
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const url = new URL(request.url)
    const current = url.searchParams.get('current') === 'true'

    if (current) {
      // Get current in-progress attempt
      const attempt = await QuizAttempt.findOne({
        student: user._id,
        quiz: params.id,
        status: 'in_progress'
      }).populate('quiz', 'title questions settings')

      return NextResponse.json({
        success: true,
        attempt
      }, { status: 200 })
    } else {
      // Get all attempts for this quiz by this student
      const attempts = await QuizAttempt.find({
        student: user._id,
        quiz: params.id
      }).sort({ startedAt: -1 })

      return NextResponse.json({
        success: true,
        attempts
      }, { status: 200 })
    }

  } catch (error) {
    console.error('Get quiz attempts error:', error)
    
    if (error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Failed to get quiz attempts' }, { status: 500 })
  }
}