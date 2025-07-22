"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Edit, 
  Trash2, 
  Play, 
  Clock, 
  Users, 
  BookOpen, 
  Calendar,
  BarChart3,
  Eye,
  AlertTriangle,
  CheckCircle,
  Plus,
  Filter
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface QuizListProps {
  onCreateNew?: () => void
  onEdit?: (quiz: any) => void
  onTakeQuiz?: (quiz: any) => void
  viewMode?: 'teacher' | 'student' | 'parent'
}

interface Quiz {
  _id: string
  title: string
  description: string
  subject: string
  gradeLevel?: string
  author: {
    firstName: string
    surname: string
  }
  status: 'draft' | 'published' | 'archived'
  totalPoints: number
  estimatedTimeMinutes: number
  questions: any[]
  settings: {
    maxAttempts: number
    showResultsImmediately: boolean
    allowReview: boolean
    passingScore?: number
  }
  analytics: {
    totalAttempts: number
    averageScore: number
    completionRate: number
  }
  tags: string[]
  createdAt: string
  publishedAt?: string
  dueDate?: string
  studentProgress?: {
    attemptCount: number
    maxAttempts: number
    bestScore: number
    bestPercentage: number
    canRetake: boolean
    lastAttemptAt?: string
  }
}

export default function QuizList({ 
  onCreateNew, 
  onEdit, 
  onTakeQuiz,
  viewMode = 'student' 
}: QuizListProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState<{
    status?: string
    subject?: string
  }>({})

  useEffect(() => {
    fetchQuizzes()
  }, [viewMode, filter])

  const fetchQuizzes = async () => {
    try {
      const token = localStorage.getItem('auth-token')
      if (!token) {
        throw new Error('Authentication required')
      }

      const params = new URLSearchParams()
      if (viewMode === 'teacher') {
        params.append('author', 'true')
      }
      if (filter.status) {
        params.append('status', filter.status)
      }
      if (filter.subject) {
        params.append('subject', filter.subject)
      }

      const url = `/api/quizzes${params.toString() ? '?' + params.toString() : ''}`
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setQuizzes(data.quizzes)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to load quizzes')
      }
    } catch (error) {
      console.error('Failed to fetch quizzes:', error)
      setError('Failed to load quizzes')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz?')) {
      return
    }

    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch(`/api/quizzes/${quizId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        setQuizzes(prev => prev.filter(q => q._id !== quizId))
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to delete quiz')
      }
    } catch (error) {
      console.error('Failed to delete quiz:', error)
      setError('Failed to delete quiz')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800'
      case 'draft': return 'bg-yellow-100 text-yellow-800'
      case 'archived': return 'bg-gray-100 text-gray-600'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600'
    if (percentage >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Loading quizzes...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const uniqueSubjects = Array.from(new Set(quizzes.map(q => q.subject)))

  return (
    <div className="space-y-4">
      {viewMode === 'teacher' && onCreateNew && (
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Your Quizzes</h2>
            <p className="text-gray-600">Manage and track your AI-generated quizzes</p>
          </div>
          <Button onClick={onCreateNew} className="bg-purple-600 hover:bg-purple-700">
            <Plus className="h-4 w-4 mr-2" />
            Generate New Quiz
          </Button>
        </div>
      )}

      {viewMode !== 'teacher' && (
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Available Quizzes</h2>
            <p className="text-gray-600">Take quizzes assigned by your teachers</p>
          </div>
        </div>
      )}

      <div className="flex items-center space-x-4 mb-4">
        {viewMode === 'teacher' && (
          <Select 
            value={filter.status || ""} 
            onValueChange={(value) => setFilter(prev => ({ ...prev, status: value || undefined }))}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        )}

        {uniqueSubjects.length > 1 && (
          <Select 
            value={filter.subject || ""} 
            onValueChange={(value) => setFilter(prev => ({ ...prev, subject: value || undefined }))}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All subjects</SelectItem>
              {uniqueSubjects.map(subject => (
                <SelectItem key={subject} value={subject}>{subject}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {quizzes.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="space-y-3">
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                {viewMode === 'teacher' ? 'No quizzes created yet' : 'No quizzes available'}
              </h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                {viewMode === 'teacher' 
                  ? 'Generate your first AI-powered quiz to get started.'
                  : 'Check back later for new quizzes from your teachers.'
                }
              </p>
              {viewMode === 'teacher' && onCreateNew && (
                <Button onClick={onCreateNew} className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Generate First Quiz
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {quizzes.map((quiz) => (
            <Card 
              key={quiz._id} 
              className={`transition-all hover:shadow-md ${
                viewMode === 'student' && quiz.studentProgress?.canRetake === false 
                  ? 'border-green-200 bg-green-50/30' 
                  : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <Badge className={getStatusColor(quiz.status)}>
                        {quiz.status.toUpperCase()}
                      </Badge>
                      {quiz.gradeLevel && (
                        <Badge variant="outline">{quiz.gradeLevel}</Badge>
                      )}
                      {quiz.tags.map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <CardTitle className="text-xl">{quiz.title}</CardTitle>
                    <CardDescription className="flex items-center space-x-4 text-sm">
                      <span className="flex items-center space-x-1">
                        <BookOpen className="h-4 w-4" />
                        <span>{quiz.subject}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>{quiz.questions.length} questions</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{quiz.estimatedTimeMinutes} min</span>
                      </span>
                      <span>🏆 {quiz.totalPoints} pts</span>
                      <span>By: {quiz.author.firstName} {quiz.author.surname}</span>
                    </CardDescription>
                  </div>
                  
                  {viewMode === 'teacher' && (
                    <div className="flex items-center space-x-2 ml-4">
                      {onEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(quiz)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(quiz._id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-gray-700 leading-relaxed">
                  {quiz.description.length > 200 
                    ? quiz.description.substring(0, 200) + '...'
                    : quiz.description
                  }
                </p>

                {viewMode === 'teacher' && quiz.analytics && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <Users className="h-4 w-4 text-gray-600" />
                        <span className="font-semibold text-lg">
                          {quiz.analytics.totalAttempts}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">Attempts</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <BarChart3 className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-lg text-blue-600">
                          {Math.round(quiz.analytics.averageScore)}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">Avg Score</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-semibold text-lg text-green-600">
                          {Math.round(quiz.analytics.completionRate)}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">Completion</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <Calendar className="h-4 w-4 text-purple-600" />
                        <span className="font-semibold text-lg text-purple-600">
                          {quiz.publishedAt ? formatDate(quiz.publishedAt) : 'Draft'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">Published</p>
                    </div>
                  </div>
                )}

                {viewMode === 'student' && quiz.studentProgress && (
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border">
                    <div className="flex items-center space-x-4">
                      <div className="text-sm">
                        <span className="font-medium">Attempts:</span> {quiz.studentProgress.attemptCount}/{quiz.studentProgress.maxAttempts}
                      </div>
                      {quiz.studentProgress.bestPercentage > 0 && (
                        <div className="text-sm">
                          <span className="font-medium">Best Score:</span> 
                          <span className={`ml-1 font-bold ${getProgressColor(quiz.studentProgress.bestPercentage)}`}>
                            {quiz.studentProgress.bestPercentage}%
                          </span>
                        </div>
                      )}
                      {quiz.settings.passingScore && (
                        <div className="text-sm">
                          <span className="font-medium">Passing:</span> {quiz.settings.passingScore}%
                        </div>
                      )}
                    </div>
                    
                    {quiz.studentProgress.canRetake && onTakeQuiz && (
                      <Button
                        onClick={() => onTakeQuiz(quiz)}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Play className="h-4 w-4 mr-2" />
                        {quiz.studentProgress.attemptCount > 0 ? 'Retake Quiz' : 'Start Quiz'}
                      </Button>
                    )}
                  </div>
                )}

                {viewMode === 'parent' && quiz.studentProgress && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-sm">
                          <span className="font-medium text-green-800">Status:</span> 
                          <span className="ml-2">
                            {quiz.studentProgress.attemptCount > 0 ? 'Completed' : 'Not Started'}
                          </span>
                        </div>
                        {quiz.studentProgress.bestPercentage > 0 && (
                          <div className="text-sm">
                            <span className="font-medium text-green-800">Best Score:</span>
                            <span className={`ml-2 font-bold ${getProgressColor(quiz.studentProgress.bestPercentage)}`}>
                              {quiz.studentProgress.bestPercentage}%
                            </span>
                          </div>
                        )}
                      </div>
                      <Eye className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                )}

                {quiz.dueDate && (
                  <div className="flex items-center space-x-2 text-sm text-orange-600">
                    <Calendar className="h-4 w-4" />
                    <span>Due: {formatDate(quiz.dueDate)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}