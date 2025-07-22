import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import User from '@/lib/models/User'
import { generateQuiz, generateQuizSuggestions } from '@/lib/ai/gemini'

// POST - Generate a new quiz using AI
export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: 'Only teachers can generate quizzes' }, { status: 403 })
    }

    const body = await request.json()
    const { 
      topic, 
      difficulty, 
      questionCount, 
      questionTypes, 
      gradeLevel, 
      curriculum 
    } = body

    // Validation
    if (!topic || !topic.trim()) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
    }

    if (!difficulty || !['easy', 'medium', 'hard'].includes(difficulty)) {
      return NextResponse.json({ error: 'Valid difficulty level is required' }, { status: 400 })
    }

    if (!questionCount || questionCount < 1 || questionCount > 20) {
      return NextResponse.json({ error: 'Question count must be between 1 and 20' }, { status: 400 })
    }

    if (!questionTypes || !Array.isArray(questionTypes) || questionTypes.length === 0) {
      return NextResponse.json({ error: 'At least one question type is required' }, { status: 400 })
    }

    const validQuestionTypes = ['multiple_choice', 'true_false', 'short_answer']
    if (!questionTypes.every(type => validQuestionTypes.includes(type))) {
      return NextResponse.json({ error: 'Invalid question type provided' }, { status: 400 })
    }

    // Generate quiz using Gemini AI
    const generatedQuiz = await generateQuiz({
      topic,
      difficulty,
      questionCount: Math.min(questionCount, 20), // Limit to 20 questions
      questionTypes,
      gradeLevel,
      curriculum
    })

    return NextResponse.json({
      success: true,
      quiz: generatedQuiz
    }, { status: 200 })

  } catch (error) {
    console.error('Quiz generation error:', error)
    
    if (error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    if (error.message.includes('API key') || error.message.includes('quota')) {
      return NextResponse.json({ 
        error: 'AI service temporarily unavailable. Please try again later.' 
      }, { status: 503 })
    }

    return NextResponse.json({ 
      error: 'Failed to generate quiz. Please try again.' 
    }, { status: 500 })
  }
}

// GET - Get quiz topic suggestions
export async function GET(request: NextRequest) {
  try {
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
      return NextResponse.json({ error: 'Only teachers can access this endpoint' }, { status: 403 })
    }

    const url = new URL(request.url)
    const topic = url.searchParams.get('topic')

    if (!topic || !topic.trim()) {
      return NextResponse.json({ error: 'Topic parameter is required' }, { status: 400 })
    }

    const suggestions = await generateQuizSuggestions(topic)

    return NextResponse.json({
      success: true,
      suggestions
    }, { status: 200 })

  } catch (error) {
    console.error('Quiz suggestions error:', error)
    
    if (error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    return NextResponse.json({ 
      error: 'Failed to generate suggestions. Please try again.' 
    }, { status: 500 })
  }
}