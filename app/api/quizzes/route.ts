import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Quiz from '@/lib/models/Quiz'
import QuizAttempt from '@/lib/models/QuizAttempt'
import User from '@/lib/models/User'
import { verifyToken } from '@/lib/auth/jwt'

// GET - List quizzes (for both teachers and students)
export async function GET(request: NextRequest) {
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
    const author = url.searchParams.get('author') === 'true'
    const status = url.searchParams.get('status')
    const subject = url.searchParams.get('subject')
    const gradeLevel = url.searchParams.get('gradeLevel')

    let query: any = {}

    if (user.role === 'teacher') {
      if (author) {
        // Teacher viewing their own quizzes
        query.author = user._id
        if (status && ['draft', 'published', 'archived'].includes(status)) {
          query.status = status
        }
      } else {
        // Teacher viewing all published quizzes
        query.status = 'published'
      }
    } else {
      // Students and parents can only see published quizzes
      query.status = 'published'
      query.$or = [
        { dueDate: { $exists: false } },
        { dueDate: null },
        { dueDate: { $gte: new Date() } }
      ]
    }

    if (subject) {
      query.subject = { $regex: subject, $options: 'i' }
    }

    if (gradeLevel) {
      query.gradeLevel = gradeLevel
    }

    const quizzes = await Quiz.find(query)
      .populate('author', 'firstName surname email')
      .sort({ createdAt: -1 })
      .limit(50)

    // For students, also get their attempt information
    let quizzesWithAttempts = quizzes
    if (user.role === 'student') {
      quizzesWithAttempts = await Promise.all(
        quizzes.map(async (quiz) => {
          const attempts = await QuizAttempt.find({
            quiz: quiz._id,
            student: user._id,
            status: 'completed'
          }).sort({ percentage: -1 })

          const bestAttempt = attempts[0]
          const attemptCount = await QuizAttempt.countDocuments({
            quiz: quiz._id,
            student: user._id,
            status: { $in: ['completed', 'abandoned', 'time_expired'] }
          })

          return {
            ...quiz.toObject(),
            studentProgress: {
              attemptCount,
              maxAttempts: quiz.settings.maxAttempts,
              bestScore: bestAttempt?.score || 0,
              bestPercentage: bestAttempt?.percentage || 0,
              canRetake: attemptCount < quiz.settings.maxAttempts,
              lastAttemptAt: bestAttempt?.startedAt
            }
          }
        })
      )
    }

    return NextResponse.json({
      success: true,
      quizzes: quizzesWithAttempts
    }, { status: 200 })

  } catch (error) {
    console.error('Fetch quizzes error:', error)
    
    if (error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Failed to fetch quizzes' }, { status: 500 })
  }
}

// POST - Create a new quiz
export async function POST(request: NextRequest) {
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

    if (user.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can create quizzes' }, { status: 403 })
    }

    const body = await request.json()
    const {
      title,
      description,
      subject,
      gradeLevel,
      questions,
      status = 'draft',
      settings = {},
      tags = [],
      dueDate
    } = body

    // Validation
    if (!title?.trim()) {
      return NextResponse.json({ error: 'Quiz title is required' }, { status: 400 })
    }

    if (!description?.trim()) {
      return NextResponse.json({ error: 'Quiz description is required' }, { status: 400 })
    }

    if (!subject?.trim()) {
      return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
    }

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: 'At least one question is required' }, { status: 400 })
    }

    if (questions.length > 50) {
      return NextResponse.json({ error: 'Maximum 50 questions allowed' }, { status: 400 })
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i]
      
      if (!question.question?.trim()) {
        return NextResponse.json({ 
          error: `Question ${i + 1}: Question text is required` 
        }, { status: 400 })
      }

      if (!['multiple_choice', 'true_false', 'short_answer'].includes(question.type)) {
        return NextResponse.json({ 
          error: `Question ${i + 1}: Invalid question type` 
        }, { status: 400 })
      }

      if (question.type === 'multiple_choice') {
        if (!question.options || !Array.isArray(question.options) || question.options.length < 2) {
          return NextResponse.json({ 
            error: `Question ${i + 1}: Multiple choice questions need at least 2 options` 
          }, { status: 400 })
        }

        if (typeof question.correctAnswer !== 'number' || 
            question.correctAnswer < 0 || 
            question.correctAnswer >= question.options.length) {
          return NextResponse.json({ 
            error: `Question ${i + 1}: Invalid correct answer index` 
          }, { status: 400 })
        }
      }
    }

    // Calculate total points and estimated time
    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 1), 0)
    const estimatedTimeMinutes = Math.max(questions.length * 1.5, 5) // 1.5 minutes per question, minimum 5 minutes

    // Create quiz
    const quiz = new Quiz({
      title: title.trim(),
      description: description.trim(),
      subject: subject.trim(),
      gradeLevel: gradeLevel?.trim(),
      questions,
      author: user._id,
      status,
      settings: {
        maxAttempts: settings.maxAttempts || 3,
        shuffleQuestions: settings.shuffleQuestions || false,
        shuffleOptions: settings.shuffleOptions || false,
        showResultsImmediately: settings.showResultsImmediately ?? true,
        allowReview: settings.allowReview ?? true,
        timeLimit: settings.timeLimit,
        passingScore: settings.passingScore
      },
      totalPoints,
      estimatedTimeMinutes: settings.timeLimit || estimatedTimeMinutes,
      tags: Array.isArray(tags) ? tags.slice(0, 10) : [],
      dueDate: dueDate ? new Date(dueDate) : undefined
    })

    await quiz.save()

    return NextResponse.json({
      success: true,
      quiz: await Quiz.findById(quiz._id).populate('author', 'firstName surname email')
    }, { status: 201 })

  } catch (error) {
    console.error('Create quiz error:', error)
    
    if (error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message)
      return NextResponse.json({ error: messages.join(', ') }, { status: 400 })
    }

    return NextResponse.json({ error: 'Failed to create quiz' }, { status: 500 })
  }
}