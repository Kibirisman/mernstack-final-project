"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  BarChart3, 
  Users, 
  Clock, 
  Trophy, 
  TrendingUp,
  TrendingDown,
  Target,
  Eye,
  Download,
  AlertTriangle,
  Calendar
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface QuizAnalyticsProps {
  quizId: string
  onClose?: () => void
}

interface AttemptData {
  _id: string
  student: {
    firstName: string
    surname: string
  }
  score: number
  percentage: number
  timeSpentMinutes: number
  startedAt: string
  completedAt: string
}

interface QuizStatistics {
  totalAttempts: number
  uniqueStudents: number
  averageScore: number
  highestScore: number
  lowestScore: number
  passRate: number
  averageTimeMinutes: number
  attempts: AttemptData[]
}

export default function QuizAnalytics({ quizId, onClose }: QuizAnalyticsProps) {
  const [quiz, setQuiz] = useState<any>(null)
  const [statistics, setStatistics] = useState<QuizStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchQuizAnalytics()
  }, [quizId])

  const fetchQuizAnalytics = async () => {
    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch(`/api/quizzes/${quizId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setQuiz(data.quiz)
        setStatistics(data.quiz.statistics)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to load quiz analytics')
      }
    } catch (error) {
      console.error('Failed to fetch quiz analytics:', error)
      setError('Failed to load quiz analytics')
    } finally {
      setLoading(false)
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

  const getScoreColor = (percentage: number, passingScore: number = 70) => {
    if (percentage >= passingScore + 20) return 'text-green-600'
    if (percentage >= passingScore) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPerformanceBadge = (percentage: number, passingScore: number = 70) => {
    if (percentage >= passingScore + 20) return { label: 'Excellent', color: 'bg-green-100 text-green-800' }
    if (percentage >= passingScore + 10) return { label: 'Good', color: 'bg-blue-100 text-blue-800' }
    if (percentage >= passingScore) return { label: 'Pass', color: 'bg-yellow-100 text-yellow-800' }
    return { label: 'Needs Improvement', color: 'bg-red-100 text-red-800' }
  }

  const exportResults = () => {
    if (!statistics || !quiz) return

    const csvContent = [
      ['Student Name', 'Score', 'Percentage', 'Time (minutes)', 'Status', 'Completed At'].join(','),
      ...statistics.attempts.map(attempt => [
        `"${attempt.student.firstName} ${attempt.student.surname}"`,
        attempt.score,
        attempt.percentage,
        attempt.timeSpentMinutes,
        attempt.percentage >= (quiz.settings.passingScore || 70) ? 'Pass' : 'Fail',
        formatDate(attempt.completedAt)
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${quiz.title.replace(/[^a-zA-Z0-9]/g, '_')}_results.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Loading analytics...</span>
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

  if (!quiz || !statistics) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-gray-600">No analytics data available</p>
        </CardContent>
      </Card>
    )
  }

  const passingScore = quiz.settings.passingScore || 70

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <span>Quiz Analytics</span>
              </CardTitle>
              <CardDescription>
                Performance insights for "{quiz.title}"
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              {statistics.attempts.length > 0 && (
                <Button variant="outline" size="sm" onClick={exportResults}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              )}
              {onClose && (
                <Button variant="outline" size="sm" onClick={onClose}>
                  Close
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{statistics.totalAttempts}</p>
                <p className="text-sm text-gray-600">Total Attempts</p>
                <p className="text-xs text-gray-500">{statistics.uniqueStudents} students</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Trophy className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{statistics.averageScore}%</p>
                <p className="text-sm text-gray-600">Average Score</p>
                <p className="text-xs text-gray-500">
                  Range: {statistics.lowestScore}% - {statistics.highestScore}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{statistics.passRate}%</p>
                <p className="text-sm text-gray-600">Pass Rate</p>
                <p className="text-xs text-gray-500">
                  Passing score: {passingScore}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{statistics.averageTimeMinutes}m</p>
                <p className="text-sm text-gray-600">Avg Time</p>
                <p className="text-xs text-gray-500">
                  Est: {quiz.estimatedTimeMinutes}m
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <span>Performance Analysis</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Score Distribution</h4>
              <div className="space-y-2">
                {[
                  { range: '90-100%', label: 'Excellent', color: 'bg-green-500' },
                  { range: '80-89%', label: 'Good', color: 'bg-blue-500' },
                  { range: '70-79%', label: 'Satisfactory', color: 'bg-yellow-500' },
                  { range: 'Below 70%', label: 'Needs Improvement', color: 'bg-red-500' }
                ].map(({ range, label, color }) => {
                  const count = statistics.attempts.filter(a => {
                    if (range === '90-100%') return a.percentage >= 90
                    if (range === '80-89%') return a.percentage >= 80 && a.percentage < 90
                    if (range === '70-79%') return a.percentage >= 70 && a.percentage < 80
                    return a.percentage < 70
                  }).length
                  const percentage = statistics.totalAttempts > 0 ? Math.round((count / statistics.totalAttempts) * 100) : 0

                  return (
                    <div key={range} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${color}`}></div>
                        <span className="text-sm">{range}</span>
                        <span className="text-xs text-gray-500">({label})</span>
                      </div>
                      <div className="text-sm font-medium">
                        {count} ({percentage}%)
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Key Insights</h4>
              <div className="space-y-2 text-sm">
                {statistics.passRate >= 80 && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <TrendingUp className="h-4 w-4" />
                    <span>High pass rate indicates good understanding</span>
                  </div>
                )}
                {statistics.passRate < 60 && (
                  <div className="flex items-center space-x-2 text-red-600">
                    <TrendingDown className="h-4 w-4" />
                    <span>Low pass rate suggests difficult content</span>
                  </div>
                )}
                {statistics.averageTimeMinutes > quiz.estimatedTimeMinutes * 1.5 && (
                  <div className="flex items-center space-x-2 text-yellow-600">
                    <Clock className="h-4 w-4" />
                    <span>Students taking longer than expected</span>
                  </div>
                )}
                {statistics.averageScore >= 85 && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <Trophy className="h-4 w-4" />
                    <span>Excellent overall performance</span>
                  </div>
                )}
                {statistics.uniqueStudents < statistics.totalAttempts * 0.7 && (
                  <div className="flex items-center space-x-2 text-blue-600">
                    <Users className="h-4 w-4" />
                    <span>Many students retaking the quiz</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Results */}
      {statistics.attempts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5 text-purple-600" />
              <span>Individual Results</span>
            </CardTitle>
            <CardDescription>
              Detailed results for each attempt
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {statistics.attempts.map((attempt, index) => {
                const performanceBadge = getPerformanceBadge(attempt.percentage, passingScore)
                
                return (
                  <div 
                    key={attempt._id} 
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">
                          {attempt.student.firstName} {attempt.student.surname}
                        </p>
                        <p className="text-sm text-gray-600">
                          Completed {formatDate(attempt.completedAt)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className={`text-lg font-bold ${getScoreColor(attempt.percentage, passingScore)}`}>
                          {attempt.percentage}%
                        </p>
                        <p className="text-sm text-gray-600">
                          {attempt.score}/{quiz.totalPoints} points
                        </p>
                      </div>

                      <div className="text-center">
                        <p className="text-sm font-medium">{attempt.timeSpentMinutes}m</p>
                        <p className="text-xs text-gray-500">time taken</p>
                      </div>

                      <Badge className={performanceBadge.color}>
                        {performanceBadge.label}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {statistics.attempts.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="space-y-3">
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                No attempts yet
              </h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                Once students start taking this quiz, you'll see detailed analytics and performance data here.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}