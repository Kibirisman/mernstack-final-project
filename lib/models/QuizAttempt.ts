import mongoose, { Document, Schema } from 'mongoose'
import { IUser } from './User'
import { IQuiz } from './Quiz'

export type AttemptStatus = 'in_progress' | 'completed' | 'abandoned' | 'time_expired'

export interface IQuestionResponse {
  questionId: string
  answer: string | number | boolean
  isCorrect: boolean
  pointsEarned: number
  timeSpentSeconds: number
  attempts: number
}

export interface IQuizAttempt extends Document {
  quiz: mongoose.Types.ObjectId | IQuiz
  student: mongoose.Types.ObjectId | IUser
  attemptNumber: number
  status: AttemptStatus
  responses: IQuestionResponse[]
  score: number
  maxScore: number
  percentage: number
  timeSpentMinutes: number
  startedAt: Date
  completedAt?: Date
  submittedAt?: Date
  feedback?: string
  gradedBy?: mongoose.Types.ObjectId | IUser
  gradedAt?: Date
  ipAddress?: string
  userAgent?: string
}

const QuestionResponseSchema = new Schema({
  questionId: {
    type: String,
    required: true
  },
  answer: {
    type: Schema.Types.Mixed,
    required: true
  },
  isCorrect: {
    type: Boolean,
    required: true
  },
  pointsEarned: {
    type: Number,
    required: true,
    min: 0
  },
  timeSpentSeconds: {
    type: Number,
    required: true,
    min: 0
  },
  attempts: {
    type: Number,
    default: 1,
    min: 1
  }
})

const QuizAttemptSchema = new Schema({
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  attemptNumber: {
    type: Number,
    required: true,
    min: 1
  },
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'abandoned', 'time_expired'],
    default: 'in_progress'
  },
  responses: {
    type: [QuestionResponseSchema],
    default: []
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  maxScore: {
    type: Number,
    required: true,
    min: 1
  },
  percentage: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
    default: 0
  },
  timeSpentMinutes: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  startedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  submittedAt: {
    type: Date
  },
  feedback: {
    type: String,
    maxlength: 1000
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  gradedAt: {
    type: Date
  },
  ipAddress: {
    type: String,
    maxlength: 45
  },
  userAgent: {
    type: String,
    maxlength: 500
  }
}, {
  timestamps: true
})

// Pre-save middleware
QuizAttemptSchema.pre('save', function(next) {
  // Calculate percentage
  if (this.maxScore > 0) {
    this.percentage = Math.round((this.score / this.maxScore) * 100)
  }
  
  // Set completion timestamp when status changes to completed
  if (this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date()
  }
  
  next()
})

// Static methods
QuizAttemptSchema.statics.findByStudent = function(studentId: string, quizId?: string) {
  const query: any = { student: studentId }
  if (quizId) {
    query.quiz = quizId
  }
  return this.find(query)
    .populate('quiz', 'title subject totalPoints')
    .sort({ startedAt: -1 })
}

QuizAttemptSchema.statics.findByQuiz = function(quizId: string) {
  return this.find({ quiz: quizId })
    .populate('student', 'firstName surname email')
    .sort({ startedAt: -1 })
}

QuizAttemptSchema.statics.getStudentAttemptCount = async function(studentId: string, quizId: string) {
  return await this.countDocuments({
    student: studentId,
    quiz: quizId,
    status: { $in: ['completed', 'abandoned', 'time_expired'] }
  })
}

QuizAttemptSchema.statics.getBestAttempt = function(studentId: string, quizId: string) {
  return this.findOne({
    student: studentId,
    quiz: quizId,
    status: 'completed'
  }).sort({ percentage: -1, score: -1 })
}

QuizAttemptSchema.statics.getQuizStatistics = async function(quizId: string) {
  const attempts = await this.find({ 
    quiz: quizId, 
    status: 'completed' 
  }).populate('student', 'firstName surname')

  if (attempts.length === 0) {
    return {
      totalAttempts: 0,
      uniqueStudents: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      passRate: 0,
      averageTimeMinutes: 0,
      attempts: []
    }
  }

  const scores = attempts.map(a => a.percentage)
  const times = attempts.map(a => a.timeSpentMinutes)
  const uniqueStudents = new Set(attempts.map(a => a.student.toString())).size

  // Get quiz passing score (default to 70%)
  const quiz = await mongoose.model('Quiz').findById(quizId)
  const passingScore = quiz?.settings?.passingScore || 70
  const passedAttempts = attempts.filter(a => a.percentage >= passingScore).length

  return {
    totalAttempts: attempts.length,
    uniqueStudents,
    averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    highestScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
    passRate: Math.round((passedAttempts / attempts.length) * 100),
    averageTimeMinutes: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
    attempts: attempts.map(attempt => ({
      _id: attempt._id,
      student: attempt.student,
      score: attempt.score,
      percentage: attempt.percentage,
      timeSpentMinutes: attempt.timeSpentMinutes,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt
    }))
  }
}

QuizAttemptSchema.statics.getStudentProgress = async function(studentId: string) {
  const attempts = await this.find({ 
    student: studentId, 
    status: 'completed' 
  }).populate('quiz', 'title subject totalPoints')

  const quizzes = attempts.reduce((acc, attempt) => {
    const quizId = attempt.quiz._id.toString()
    if (!acc[quizId] || attempt.percentage > acc[quizId].percentage) {
      acc[quizId] = {
        quiz: attempt.quiz,
        bestScore: attempt.score,
        bestPercentage: attempt.percentage,
        totalAttempts: attempts.filter(a => a.quiz._id.toString() === quizId).length,
        lastAttempt: attempt.startedAt
      }
    }
    return acc
  }, {})

  return Object.values(quizzes)
}

// Compound indexes for efficient queries
QuizAttemptSchema.index({ student: 1, quiz: 1, attemptNumber: 1 }, { unique: true })
QuizAttemptSchema.index({ quiz: 1, status: 1 })
QuizAttemptSchema.index({ student: 1, status: 1, startedAt: -1 })
QuizAttemptSchema.index({ quiz: 1, percentage: -1 })
QuizAttemptSchema.index({ status: 1, startedAt: 1 }) // For cleanup of old in_progress attempts

const QuizAttempt = mongoose.models.QuizAttempt || mongoose.model<IQuizAttempt>('QuizAttempt', QuizAttemptSchema)

export default QuizAttempt