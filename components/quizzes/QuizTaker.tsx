"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  Send,
  AlertTriangle,
  CheckCircle,
  Timer,
  BookOpen,
  Trophy,
  RotateCcw
} from "lucide-react"

interface QuizTakerProps {
  quiz: any
  onComplete?: (result: any) => void
  onExit?: () => void
}

interface QuizAttempt {
  _id: string
  responses: any[]
  timeSpentMinutes: number
  status: string
}

export default function QuizTaker({ quiz, onComplete, onExit }: QuizTakerProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [responses, setResponses] = useState<Record<string, any>>({})
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null)
  const [timeSpent, setTimeSpent] = useState(0) // in seconds
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [showResults, setShowResults] = useState(false)
  const [results, setResults] = useState<any>(null)
  
  const startTime = useRef<Date | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    startQuizAttempt()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    }
  }, [])

  useEffect(() => {
    // Start timer
    startTime.current = new Date()
    timerRef.current = setInterval(() => {
      setTimeSpent(prev => prev + 1)
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [attempt])

  useEffect(() => {
    // Auto-save every 30 seconds
    if (attempt && Object.keys(responses).length > 0) {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
      
      autoSaveRef.current = setTimeout(() => {
        saveProgress()
      }, 30000)
    }
  }, [responses, attempt])

  const startQuizAttempt = async () => {
    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch(`/api/quizzes/${quiz._id}/attempt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        setAttempt(data.attempt)
        
        // Load existing responses if any
        if (data.attempt.responses && data.attempt.responses.length > 0) {
          const existingResponses: Record<string, any> = {}
          data.attempt.responses.forEach((r: any) => {
            existingResponses[r.questionId] = r.answer
          })
          setResponses(existingResponses)
          setTimeSpent(data.attempt.timeSpentMinutes * 60)
        }
      } else {
        setError(data.error || 'Failed to start quiz')
      }
    } catch (error) {
      console.error('Start quiz error:', error)
      setError('Network error. Please try again.')
    }
  }

  const saveProgress = async () => {
    if (!attempt || isSaving) return

    setIsSaving(true)
    try {
      const token = localStorage.getItem('auth-token')
      
      const progressData = {
        responses: Object.entries(responses).map(([questionId, answer]) => ({
          questionId,
          answer,
          timeSpentSeconds: Math.floor(timeSpent / quiz.questions.length)
        })),
        timeSpentMinutes: Math.floor(timeSpent / 60)
      }

      await fetch(`/api/quiz-attempts/${attempt._id}/submit`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(progressData)
      })
    } catch (error) {
      console.error('Save progress error:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const submitQuiz = async () => {
    if (!attempt) return

    // Check if all questions are answered
    const unansweredQuestions = quiz.questions.filter((q: any) => 
      !responses.hasOwnProperty(q.id) || responses[q.id] === undefined || responses[q.id] === ""
    )

    if (unansweredQuestions.length > 0) {
      const proceed = confirm(
        `You have ${unansweredQuestions.length} unanswered questions. Submit anyway?`
      )
      if (!proceed) return
    }

    setIsSubmitting(true)
    setError("")

    try {
      const token = localStorage.getItem('auth-token')
      
      const submissionData = {
        responses: quiz.questions.map((q: any) => ({
          questionId: q.id,
          answer: responses[q.id] || "",
          timeSpentSeconds: Math.floor(timeSpent / quiz.questions.length)
        })),
        timeSpentMinutes: Math.floor(timeSpent / 60)
      }

      const response = await fetch(`/api/quiz-attempts/${attempt._id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submissionData)
      })

      const data = await response.json()

      if (response.ok) {
        setResults(data.attempt)
        setShowResults(true)
        
        if (timerRef.current) clearInterval(timerRef.current)
        if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
        
        if (onComplete) {
          onComplete(data.attempt)
        }
      } else {
        setError(data.error || 'Failed to submit quiz')
      }
    } catch (error) {
      console.error('Submit quiz error:', error)
      setError('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResponseChange = (questionId: string, answer: any) => {
    setResponses(prev => ({ ...prev, [questionId]: answer }))
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getProgressPercentage = () => {
    const answered = quiz.questions.filter((q: any) => responses.hasOwnProperty(q.id)).length
    return Math.round((answered / quiz.questions.length) * 100)
  }

  const renderQuestion = (question: any, index: number) => {
    const response = responses[question.id]

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-sm">
            Question {index + 1} of {quiz.questions.length}
          </Badge>
          <div className="flex items-center space-x-2">
            <Badge variant={question.difficulty === 'hard' ? 'destructive' : question.difficulty === 'medium' ? 'default' : 'secondary'}>
              {question.difficulty.toUpperCase()}
            </Badge>
            <Badge variant="outline">
              {question.points} pt{question.points !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium leading-relaxed">
            {question.question}
          </h3>

          {question.type === 'multiple_choice' && (
            <RadioGroup 
              value={response || ""} 
              onValueChange={(value) => handleResponseChange(question.id, parseInt(value))}
            >
              {question.options.map((option: string, optionIndex: number) => (
                <div key={optionIndex} className="flex items-center space-x-2">
                  <RadioGroupItem value={optionIndex.toString()} id={`${question.id}-${optionIndex}`} />
                  <Label 
                    htmlFor={`${question.id}-${optionIndex}`} 
                    className="flex-1 cursor-pointer py-2"
                  >
                    <span className="font-medium mr-3">
                      {String.fromCharCode(65 + optionIndex)}.
                    </span>
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {question.type === 'true_false' && (
            <RadioGroup 
              value={response !== undefined ? response.toString() : ""} 
              onValueChange={(value) => handleResponseChange(question.id, value === 'true')}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id={`${question.id}-true`} />
                <Label htmlFor={`${question.id}-true`} className="cursor-pointer py-2">
                  True
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id={`${question.id}-false`} />
                <Label htmlFor={`${question.id}-false`} className="cursor-pointer py-2">
                  False
                </Label>
              </div>
            </RadioGroup>
          )}

          {question.type === 'short_answer' && (
            <Textarea
              placeholder="Enter your answer here..."
              value={response || ""}
              onChange={(e) => handleResponseChange(question.id, e.target.value)}
              className="min-h-24"
              maxLength={500}
            />
          )}
        </div>
      </div>
    )
  }

  const renderResults = () => {
    if (!results) return null

    const passingScore = quiz.settings.passingScore || 70
    const passed = results.percentage >= passingScore

    return (
      <Card>
        <CardHeader className="text-center">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center ${
            passed ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {passed ? (
              <Trophy className="h-8 w-8 text-green-600" />
            ) : (
              <RotateCcw className="h-8 w-8 text-red-600" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {passed ? 'Congratulations!' : 'Quiz Completed'}
          </CardTitle>
          <CardDescription>
            {passed ? 'You passed the quiz!' : 'Keep practicing to improve your score'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {results.score}/{results.maxScore}
              </div>
              <p className="text-sm text-blue-800">Score</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className={`text-2xl font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>
                {results.percentage}%
              </div>
              <p className="text-sm text-gray-600">Percentage</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-600">
                {results.timeSpentMinutes}m
              </div>
              <p className="text-sm text-gray-600">Time Taken</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {passingScore}%
              </div>
              <p className="text-sm text-yellow-800">Passing Score</p>
            </div>
          </div>

          {quiz.settings.showResultsImmediately && results.responses && (
            <div className="space-y-4">
              <h4 className="font-semibold">Question Results:</h4>
              {quiz.questions.map((question: any, index: number) => {
                const response = results.responses.find((r: any) => r.questionId === question.id)
                const isCorrect = response?.isCorrect || false

                return (
                  <div key={question.id} className={`p-4 border rounded-lg ${
                    isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium mb-2">
                          {index + 1}. {question.question}
                        </p>
                        <p className="text-sm text-gray-600 mb-1">
                          <strong>Your answer:</strong> {
                            question.type === 'multiple_choice' 
                              ? question.options[response?.answer] || 'Not answered'
                              : question.type === 'true_false'
                              ? response?.answer ? 'True' : 'False'
                              : response?.answer || 'Not answered'
                          }
                        </p>
                        {!isCorrect && (
                          <p className="text-sm text-green-600">
                            <strong>Correct answer:</strong> {
                              question.type === 'multiple_choice' 
                                ? question.options[question.correctAnswer]
                                : question.type === 'true_false'
                                ? question.correctAnswer ? 'True' : 'False'
                                : question.correctAnswer
                            }
                          </p>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {isCorrect ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-red-500" />
                        )}
                        <Badge variant="outline">
                          {response?.pointsEarned || 0}/{question.points} pts
                        </Badge>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="flex justify-center space-x-4 pt-4">
            <Button variant="outline" onClick={onExit}>
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (showResults) {
    return renderResults()
  }

  if (!attempt) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Starting quiz...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const currentQ = quiz.questions[currentQuestion]

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Quiz Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
                <span>{quiz.title}</span>
              </CardTitle>
              <CardDescription>{quiz.description}</CardDescription>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <Timer className="h-4 w-4" />
                <span>{formatTime(timeSpent)}</span>
              </div>
              {isSaving && (
                <div className="flex items-center space-x-1 text-blue-600">
                  <Save className="h-4 w-4" />
                  <span>Saving...</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Progress: {getProgressPercentage()}% complete</span>
              <span>{Object.keys(responses).length}/{quiz.questions.length} answered</span>
            </div>
            <Progress value={getProgressPercentage()} className="w-full" />
          </div>
        </CardHeader>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Question */}
      <Card>
        <CardContent className="p-6">
          {renderQuestion(currentQ, currentQuestion)}
        </CardContent>
      </Card>

      {/* Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
              disabled={currentQuestion === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={saveProgress}
                disabled={isSaving}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Progress
              </Button>

              {currentQuestion === quiz.questions.length - 1 ? (
                <Button
                  onClick={submitQuiz}
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Quiz
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentQuestion(prev => Math.min(quiz.questions.length - 1, prev + 1))}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}