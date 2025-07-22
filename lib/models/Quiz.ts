import mongoose, { Document, Schema } from 'mongoose'
import { IUser } from './User'

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer'
export type QuizStatus = 'draft' | 'published' | 'archived'
export type DifficultyLevel = 'easy' | 'medium' | 'hard'

export interface IQuestion {
  id: string
  type: QuestionType
  question: string
  options?: string[]
  correctAnswer: string | number | boolean
  explanation?: string
  points: number
  difficulty: DifficultyLevel
  timeLimit?: number
}

export interface IQuiz extends Document {
  title: string
  description: string
  subject: string
  gradeLevel?: string
  questions: IQuestion[]
  author: mongoose.Types.ObjectId | IUser
  status: QuizStatus
  settings: {
    timeLimit?: number
    maxAttempts: number
    shuffleQuestions: boolean
    shuffleOptions: boolean
    showResultsImmediately: boolean
    allowReview: boolean
    passingScore?: number
  }
  totalPoints: number
  estimatedTimeMinutes: number
  tags: string[]
  createdAt: Date
  updatedAt: Date
  publishedAt?: Date
  dueDate?: Date
  analytics: {
    totalAttempts: number
    averageScore: number
    completionRate: number
    averageTimeMinutes: number
  }
}

const QuestionSchema = new Schema({
  id: { 
    type: String, 
    required: true,
    default: () => new mongoose.Types.ObjectId().toString()
  },
  type: {
    type: String,
    enum: ['multiple_choice', 'true_false', 'short_answer'],
    required: true
  },
  question: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  options: {
    type: [String],
    validate: {
      validator: function(this: IQuestion, options: string[]) {
        if (this.type === 'multiple_choice') {
          return options && options.length >= 2 && options.length <= 6
        }
        return true
      },
      message: 'Multiple choice questions must have 2-6 options'
    }
  },
  correctAnswer: {
    type: Schema.Types.Mixed,
    required: true,
    validate: {
      validator: function(this: IQuestion, answer: any) {
        if (this.type === 'multiple_choice') {
          return typeof answer === 'number' && answer >= 0 && answer < (this.options?.length || 0)
        }
        if (this.type === 'true_false') {
          return typeof answer === 'boolean'
        }
        if (this.type === 'short_answer') {
          return typeof answer === 'string' && answer.trim().length > 0
        }
        return false
      },
      message: 'Invalid correct answer format for question type'
    }
  },
  explanation: {
    type: String,
    trim: true,
    maxlength: 500
  },
  points: {
    type: Number,
    required: true,
    min: 1,
    max: 10,
    default: 1
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  timeLimit: {
    type: Number,
    min: 10,
    max: 600
  }
})

const QuizSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  gradeLevel: {
    type: String,
    trim: true,
    maxlength: 50
  },
  questions: {
    type: [QuestionSchema],
    required: true,
    validate: {
      validator: function(questions: IQuestion[]) {
        return questions.length >= 1 && questions.length <= 50
      },
      message: 'Quiz must have between 1 and 50 questions'
    }
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  settings: {
    timeLimit: {
      type: Number,
      min: 1,
      max: 300
    },
    maxAttempts: {
      type: Number,
      min: 1,
      max: 10,
      default: 3
    },
    shuffleQuestions: {
      type: Boolean,
      default: false
    },
    shuffleOptions: {
      type: Boolean,
      default: false
    },
    showResultsImmediately: {
      type: Boolean,
      default: true
    },
    allowReview: {
      type: Boolean,
      default: true
    },
    passingScore: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  totalPoints: {
    type: Number,
    required: true,
    min: 1
  },
  estimatedTimeMinutes: {
    type: Number,
    required: true,
    min: 1,
    max: 300
  },
  tags: {
    type: [String],
    validate: {
      validator: function(tags: string[]) {
        return tags.length <= 10
      },
      message: 'Maximum 10 tags allowed'
    }
  },
  publishedAt: {
    type: Date
  },
  dueDate: {
    type: Date
  },
  analytics: {
    totalAttempts: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0
    },
    completionRate: {
      type: Number,
      default: 0
    },
    averageTimeMinutes: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
})

// Pre-save middleware
QuizSchema.pre('save', function(next) {
  // Calculate total points from questions
  this.totalPoints = this.questions.reduce((total, question) => total + question.points, 0)
  
  // Set publishedAt when status changes to published
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date()
  }
  
  // Generate question IDs if not present
  this.questions.forEach(question => {
    if (!question.id) {
      question.id = new mongoose.Types.ObjectId().toString()
    }
  })
  
  next()
})

// Static methods
QuizSchema.statics.findByAuthor = function(authorId: string) {
  return this.find({ author: authorId }).populate('author', 'firstName surname email')
}

QuizSchema.statics.findPublished = function(filters: any = {}) {
  return this.find({ 
    status: 'published',
    $or: [
      { dueDate: { $exists: false } },
      { dueDate: null },
      { dueDate: { $gte: new Date() } }
    ],
    ...filters 
  }).populate('author', 'firstName surname')
}

QuizSchema.statics.updateAnalytics = async function(
  quizId: string, 
  score: number, 
  timeMinutes: number, 
  completed: boolean
) {
  const quiz = await this.findById(quizId)
  if (!quiz) return

  const newTotalAttempts = quiz.analytics.totalAttempts + 1
  const newAverageScore = ((quiz.analytics.averageScore * quiz.analytics.totalAttempts) + score) / newTotalAttempts
  const newAverageTime = ((quiz.analytics.averageTimeMinutes * quiz.analytics.totalAttempts) + timeMinutes) / newTotalAttempts
  const completedAttempts = Math.round(quiz.analytics.completionRate * quiz.analytics.totalAttempts / 100) + (completed ? 1 : 0)
  const newCompletionRate = (completedAttempts / newTotalAttempts) * 100

  await this.findByIdAndUpdate(quizId, {
    'analytics.totalAttempts': newTotalAttempts,
    'analytics.averageScore': Math.round(newAverageScore * 100) / 100,
    'analytics.averageTimeMinutes': Math.round(newAverageTime * 100) / 100,
    'analytics.completionRate': Math.round(newCompletionRate * 100) / 100
  })
}

// Indexes
QuizSchema.index({ author: 1, status: 1 })
QuizSchema.index({ status: 1, publishedAt: -1 })
QuizSchema.index({ subject: 1, gradeLevel: 1 })
QuizSchema.index({ tags: 1 })
QuizSchema.index({ dueDate: 1 })

const Quiz = mongoose.models.Quiz || mongoose.model<IQuiz>('Quiz', QuizSchema)

export default Quiz