import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Quiz from '@/lib/models/Quiz'
import QuizAttempt from '@/lib/models/QuizAttempt'
import User from '@/lib/models/User'
import { verifyToken } from '@/lib/auth/jwt'

// GET - Get a specific quiz
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

    const quiz = await Quiz.findById(params.id)
      .populate('author', 'firstName surname email')

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    // Check permissions
    const isAuthor = quiz.author._id.toString() === user._id.toString()
    const isTeacher = user.role === 'teacher'
    const isPublished = quiz.status === 'published'

    // Teachers can see their own quizzes or any published quiz
    // Students can only see published quizzes
    if (!isAuthor && (!isPublished || (user.role !== 'teacher' && user.role !== 'student' && user.role !== 'parent'))) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    let quizData = quiz.toObject()

    // Add student progress if user is a student
    if (user.role === 'student') {
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

      quizData.studentProgress = {
        attemptCount,
        maxAttempts: quiz.settings.maxAttempts,
        bestScore: bestAttempt?.score || 0,
        bestPercentage: bestAttempt?.percentage || 0,
        canRetake: attemptCount < quiz.settings.maxAttempts,
        lastAttemptAt: bestAttempt?.startedAt,
        attempts: attempts.map(attempt => ({
          _id: attempt._id,
          score: attempt.score,
          percentage: attempt.percentage,
          timeSpentMinutes: attempt.timeSpentMinutes,
          startedAt: attempt.startedAt,
          completedAt: attempt.completedAt
        }))
      }
    }

    // Add analytics if user is the author
    if (isAuthor) {
      const statistics = await QuizAttempt.getQuizStatistics(quiz._id.toString())
      quizData.statistics = statistics
    }

    return NextResponse.json({
      success: true,
      quiz: quizData
    }, { status: 200 })

  } catch (error) {
    console.error('Get quiz error:', error)
    
    if (error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Failed to fetch quiz' }, { status: 500 })
  }
}

// PATCH - Update a quiz
export async function PATCH(
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
    
    if (!user || user.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can update quizzes' }, { status: 403 })
    }

    const quiz = await Quiz.findById(params.id)
    
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    if (quiz.author.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'You can only update your own quizzes' }, { status: 403 })
    }

    const body = await request.json()
    const {
      title,
      description,
      subject,
      gradeLevel,
      questions,
      status,
      settings,
      tags,
      dueDate
    } = body

    // Update fields if provided
    if (title !== undefined) quiz.title = title.trim()
    if (description !== undefined) quiz.description = description.trim()
    if (subject !== undefined) quiz.subject = subject.trim()
    if (gradeLevel !== undefined) quiz.gradeLevel = gradeLevel?.trim()
    if (questions !== undefined) {
      if (!Array.isArray(questions) || questions.length === 0) {
        return NextResponse.json({ error: 'At least one question is required' }, { status: 400 })
      }
      quiz.questions = questions
    }
    if (status !== undefined && ['draft', 'published', 'archived'].includes(status)) {
      quiz.status = status
    }
    if (settings !== undefined) {
      quiz.settings = { ...quiz.settings, ...settings }
    }
    if (tags !== undefined) {
      quiz.tags = Array.isArray(tags) ? tags.slice(0, 10) : []
    }
    if (dueDate !== undefined) {
      quiz.dueDate = dueDate ? new Date(dueDate) : undefined
    }

    await quiz.save()

    return NextResponse.json({
      success: true,
      quiz: await Quiz.findById(quiz._id).populate('author', 'firstName surname email')
    }, { status: 200 })

  } catch (error) {
    console.error('Update quiz error:', error)
    
    if (error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message)
      return NextResponse.json({ error: messages.join(', ') }, { status: 400 })
    }

    return NextResponse.json({ error: 'Failed to update quiz' }, { status: 500 })
  }
}

// DELETE - Delete a quiz
export async function DELETE(
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
    
    if (!user || user.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can delete quizzes' }, { status: 403 })
    }

    const quiz = await Quiz.findById(params.id)
    
    if (!quiz) {
      return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    }

    if (quiz.author.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'You can only delete your own quizzes' }, { status: 403 })
    }

    // Check if there are any attempts
    const attemptCount = await QuizAttempt.countDocuments({ quiz: quiz._id })
    
    if (attemptCount > 0) {
      // Don't actually delete, just archive it to preserve data integrity
      quiz.status = 'archived'
      await quiz.save()
      
      return NextResponse.json({
        success: true,
        message: 'Quiz archived due to existing student attempts'
      }, { status: 200 })
    }

    // No attempts, safe to delete
    await Quiz.findByIdAndDelete(params.id)

    return NextResponse.json({
      success: true,
      message: 'Quiz deleted successfully'
    }, { status: 200 })

  } catch (error) {
    console.error('Delete quiz error:', error)
    
    if (error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Failed to delete quiz' }, { status: 500 })
  }
}