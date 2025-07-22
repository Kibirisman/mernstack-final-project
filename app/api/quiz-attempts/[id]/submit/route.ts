import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import Quiz from '@/lib/models/Quiz'
import QuizAttempt from '@/lib/models/QuizAttempt'
import User from '@/lib/models/User'
import { verifyToken } from '@/lib/auth/jwt'

// POST - Submit quiz attempt
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
      return NextResponse.json({ error: 'Only students can submit quiz attempts' }, { status: 403 })
    }

    const attempt = await QuizAttempt.findById(params.id)
      .populate('quiz')
    
    if (!attempt) {
      return NextResponse.json({ error: 'Quiz attempt not found' }, { status: 404 })
    }

    if (attempt.student.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (attempt.status !== 'in_progress') {
      return NextResponse.json({ error: 'Quiz attempt is not in progress' }, { status: 400 })
    }

    const body = await request.json()
    const { responses, timeSpentMinutes } = body

    if (!responses || !Array.isArray(responses)) {
      return NextResponse.json({ error: 'Responses are required' }, { status: 400 })
    }

    // Get quiz questions
    const quiz = attempt.quiz as any
    const questions = quiz.questions

    // Grade the responses
    let totalScore = 0
    const gradedResponses = responses.map((response: any) => {
      const question = questions.find((q: any) => q.id === response.questionId)
      
      if (!question) {
        return {
          ...response,
          isCorrect: false,
          pointsEarned: 0
        }
      }

      let isCorrect = false
      
      // Check correctness based on question type
      switch (question.type) {
        case 'multiple_choice':
          isCorrect = response.answer === question.correctAnswer
          break
        case 'true_false':
          isCorrect = response.answer === question.correctAnswer
          break
        case 'short_answer':
          // Simple string comparison (case-insensitive, trimmed)
          const studentAnswer = String(response.answer).trim().toLowerCase()
          const correctAnswer = String(question.correctAnswer).trim().toLowerCase()
          isCorrect = studentAnswer === correctAnswer ||
                     studentAnswer.includes(correctAnswer) ||
                     correctAnswer.includes(studentAnswer)
          break
      }

      const pointsEarned = isCorrect ? question.points : 0
      totalScore += pointsEarned

      return {
        questionId: response.questionId,
        answer: response.answer,
        isCorrect,
        pointsEarned,
        timeSpentSeconds: response.timeSpentSeconds || 0,
        attempts: 1
      }
    })

    // Calculate percentage
    const percentage = quiz.totalPoints > 0 ? Math.round((totalScore / quiz.totalPoints) * 100) : 0

    // Update attempt
    attempt.responses = gradedResponses
    attempt.score = totalScore
    attempt.percentage = percentage
    attempt.timeSpentMinutes = timeSpentMinutes || 0
    attempt.status = 'completed'
    attempt.completedAt = new Date()
    attempt.submittedAt = new Date()

    await attempt.save()

    // Update quiz analytics
    await Quiz.updateAnalytics(
      quiz._id.toString(),
      percentage,
      timeSpentMinutes || 0,
      true
    )

    return NextResponse.json({
      success: true,
      attempt: {
        _id: attempt._id,
        score: attempt.score,
        maxScore: attempt.maxScore,
        percentage: attempt.percentage,
        timeSpentMinutes: attempt.timeSpentMinutes,
        status: attempt.status,
        responses: gradedResponses,
        completedAt: attempt.completedAt
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Submit quiz attempt error:', error)
    
    if (error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Failed to submit quiz attempt' }, { status: 500 })
  }
}

// PATCH - Update attempt progress (save answers)
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
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const attempt = await QuizAttempt.findById(params.id)
    
    if (!attempt) {
      return NextResponse.json({ error: 'Quiz attempt not found' }, { status: 404 })
    }

    if (attempt.student.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (attempt.status !== 'in_progress') {
      return NextResponse.json({ error: 'Quiz attempt is not in progress' }, { status: 400 })
    }

    const body = await request.json()
    const { responses, timeSpentMinutes } = body

    // Update progress (don't grade yet)
    if (responses) {
      attempt.responses = responses.map((r: any) => ({
        questionId: r.questionId,
        answer: r.answer,
        isCorrect: false, // Will be calculated on submit
        pointsEarned: 0,
        timeSpentSeconds: r.timeSpentSeconds || 0,
        attempts: 1
      }))
    }

    if (timeSpentMinutes !== undefined) {
      attempt.timeSpentMinutes = timeSpentMinutes
    }

    await attempt.save()

    return NextResponse.json({
      success: true,
      message: 'Progress saved'
    }, { status: 200 })

  } catch (error) {
    console.error('Update quiz attempt error:', error)
    
    if (error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Failed to update quiz attempt' }, { status: 500 })
  }
}