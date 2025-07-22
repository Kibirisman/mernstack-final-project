"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { 
  Sparkles, 
  BookOpen, 
  Clock, 
  Users, 
  RefreshCw, 
  Save, 
  Send,
  AlertTriangle,
  CheckCircle,
  X,
  Lightbulb
} from "lucide-react"

interface QuizGeneratorFormProps {
  onSuccess?: (quiz: any) => void
  onCancel?: () => void
  onSaveAsQuiz?: (quizData: any) => void
}

interface GeneratedQuestion {
  type: 'multiple_choice' | 'true_false' | 'short_answer'
  question: string
  options?: string[]
  correctAnswer: string | number | boolean
  explanation?: string
  points: number
  difficulty: 'easy' | 'medium' | 'hard'
}

interface GeneratedQuiz {
  title: string
  description: string
  questions: GeneratedQuestion[]
  totalPoints: number
  estimatedTimeMinutes: number
}

export default function QuizGeneratorForm({ 
  onSuccess, 
  onCancel, 
  onSaveAsQuiz 
}: QuizGeneratorFormProps) {
  const [formData, setFormData] = useState({
    topic: "",
    difficulty: "medium",
    questionCount: 5,
    questionTypes: ["multiple_choice"],
    gradeLevel: "",
    curriculum: ""
  })
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [generatedQuiz, setGeneratedQuiz] = useState<GeneratedQuiz | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)

  const questionTypeOptions = [
    { value: "multiple_choice", label: "Multiple Choice", icon: "🔵" },
    { value: "true_false", label: "True/False", icon: "✅" },
    { value: "short_answer", label: "Short Answer", icon: "✍️" }
  ]

  const gradeLevels = [
    "Elementary (K-5)",
    "Middle School (6-8)", 
    "High School (9-12)",
    "College/University"
  ]

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError("")
    setSuccess("")
  }

  const handleQuestionTypeChange = (questionType: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      questionTypes: checked 
        ? [...prev.questionTypes, questionType]
        : prev.questionTypes.filter(type => type !== questionType)
    }))
  }

  const generateTopicSuggestions = async () => {
    if (!formData.topic.trim()) return

    setLoadingSuggestions(true)
    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch(`/api/quizzes/generate?topic=${encodeURIComponent(formData.topic)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.suggestions || [])
      }
    } catch (error) {
      console.error('Error getting suggestions:', error)
    } finally {
      setLoadingSuggestions(false)
    }
  }

  const generateQuiz = async () => {
    if (!formData.topic.trim()) {
      setError("Please enter a topic for your quiz")
      return
    }

    if (formData.questionTypes.length === 0) {
      setError("Please select at least one question type")
      return
    }

    setIsGenerating(true)
    setError("")
    setSuccess("")

    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch('/api/quizzes/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        setGeneratedQuiz(data.quiz)
        setSuccess("🎉 Quiz generated successfully! Review the questions below and save when ready.")
      } else {
        setError(data.error || "Failed to generate quiz")
      }
    } catch (error) {
      console.error('Quiz generation error:', error)
      setError("Network error. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  const saveQuizToDashboard = async () => {
    if (!generatedQuiz) return

    setIsSaving(true)
    setError("")

    try {
      const token = localStorage.getItem('auth-token')
      
      const quizPayload = {
        title: generatedQuiz.title,
        description: generatedQuiz.description,
        subject: formData.topic,
        gradeLevel: formData.gradeLevel,
        questions: generatedQuiz.questions.map((q, index) => ({
          id: `q_${index + 1}`,
          ...q
        })),
        status: 'draft',
        settings: {
          maxAttempts: 3,
          shuffleQuestions: false,
          shuffleOptions: true,
          showResultsImmediately: true,
          allowReview: true,
          timeLimit: generatedQuiz.estimatedTimeMinutes
        },
        tags: [formData.topic, formData.difficulty],
        estimatedTimeMinutes: generatedQuiz.estimatedTimeMinutes
      }

      const response = await fetch('/api/quizzes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(quizPayload)
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("✅ Quiz saved to your dashboard successfully!")
        if (onSaveAsQuiz) {
          onSaveAsQuiz(data.quiz)
        }
        if (onSuccess) {
          setTimeout(() => onSuccess(data.quiz), 1500)
        }
      } else {
        setError(data.error || "Failed to save quiz")
      }
    } catch (error) {
      console.error('Save quiz error:', error)
      setError("Network error. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const renderQuestionPreview = (question: GeneratedQuestion, index: number) => (
    <Card key={index} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {question.type.replace('_', ' ').toUpperCase()}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {question.difficulty.toUpperCase()}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {question.points} pt{question.points !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <h4 className="font-medium mb-3">{index + 1}. {question.question}</h4>
        
        {question.type === 'multiple_choice' && question.options && (
          <div className="space-y-2 mb-3">
            {question.options.map((option, optionIndex) => (
              <div 
                key={optionIndex}
                className={`p-2 rounded border-2 transition-colors ${
                  optionIndex === question.correctAnswer 
                    ? 'border-green-200 bg-green-50 text-green-800' 
                    : 'border-gray-200'
                }`}
              >
                <span className="font-medium mr-2">
                  {String.fromCharCode(65 + optionIndex)}.
                </span>
                {option}
                {optionIndex === question.correctAnswer && (
                  <CheckCircle className="inline-block ml-2 h-4 w-4 text-green-600" />
                )}
              </div>
            ))}
          </div>
        )}

        {question.type === 'true_false' && (
          <div className="mb-3">
            <div className={`inline-block px-3 py-1 rounded ${
              question.correctAnswer ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              <strong>Correct Answer:</strong> {question.correctAnswer ? 'True' : 'False'}
            </div>
          </div>
        )}

        {question.type === 'short_answer' && (
          <div className="mb-3">
            <div className="p-2 bg-blue-50 border border-blue-200 rounded">
              <strong>Expected Answer:</strong> {question.correctAnswer}
            </div>
          </div>
        )}

        {question.explanation && (
          <div className="p-3 bg-gray-50 border border-gray-200 rounded">
            <div className="flex items-start space-x-2">
              <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <strong className="text-sm text-gray-700">Explanation:</strong>
                <p className="text-sm text-gray-600 mt-1">{question.explanation}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <span>AI Quiz Generator</span>
          </CardTitle>
          <CardDescription>
            Generate engaging quizzes automatically using AI. Customize the topic, difficulty, and question types.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="topic" className="text-sm font-medium text-gray-700">
                  Quiz Topic *
                </label>
                <div className="flex space-x-2">
                  <Input
                    id="topic"
                    placeholder="e.g., World War II, Algebra, Cell Biology"
                    value={formData.topic}
                    onChange={(e) => handleInputChange("topic", e.target.value)}
                    onBlur={generateTopicSuggestions}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={generateTopicSuggestions}
                    disabled={!formData.topic.trim() || loadingSuggestions}
                  >
                    <Lightbulb className="h-4 w-4" />
                  </Button>
                </div>
                
                {suggestions.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-gray-600">Suggested specific topics:</p>
                    <div className="flex flex-wrap gap-1">
                      {suggestions.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => handleInputChange("topic", suggestion)}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Difficulty Level
                </label>
                <Select 
                  value={formData.difficulty} 
                  onValueChange={(value) => handleInputChange("difficulty", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Number of Questions
                </label>
                <Select 
                  value={formData.questionCount.toString()} 
                  onValueChange={(value) => handleInputChange("questionCount", parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 5, 8, 10, 15, 20].map(count => (
                      <SelectItem key={count} value={count.toString()}>
                        {count} questions
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Grade Level (Optional)
                </label>
                <Select 
                  value={formData.gradeLevel} 
                  onValueChange={(value) => handleInputChange("gradeLevel", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade level" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeLevels.map(level => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label htmlFor="curriculum" className="text-sm font-medium text-gray-700">
                  Curriculum/Standards (Optional)
                </label>
                <Input
                  id="curriculum"
                  placeholder="e.g., Common Core, NGSS, AP Biology"
                  value={formData.curriculum}
                  onChange={(e) => handleInputChange("curriculum", e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">
                  Question Types *
                </label>
                <div className="space-y-2">
                  {questionTypeOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={option.value}
                        checked={formData.questionTypes.includes(option.value)}
                        onCheckedChange={(checked) => handleQuestionTypeChange(option.value, !!checked)}
                      />
                      <label 
                        htmlFor={option.value} 
                        className="text-sm font-medium text-gray-700 cursor-pointer flex items-center space-x-2"
                      >
                        <span>{option.icon}</span>
                        <span>{option.label}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t">
            <div>
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isGenerating}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
            </div>

            <Button
              onClick={generateQuiz}
              disabled={isGenerating || !formData.topic.trim() || formData.questionTypes.length === 0}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Quiz
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {generatedQuiz && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <span>Generated Quiz Preview</span>
            </CardTitle>
            <CardDescription>
              Review your generated quiz below. You can save it to your dashboard or generate a new one.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                {generatedQuiz.title}
              </h3>
              <p className="text-blue-800 mb-3">{generatedQuiz.description}</p>
              
              <div className="flex items-center space-x-4 text-sm text-blue-700">
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4" />
                  <span>{generatedQuiz.questions.length} questions</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>{generatedQuiz.estimatedTimeMinutes} minutes</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>🏆 {generatedQuiz.totalPoints} points</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {generatedQuiz.questions.map((question, index) => 
                renderQuestionPreview(question, index)
              )}
            </div>

            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={generateQuiz}
                disabled={isGenerating}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate New Quiz
              </Button>

              <Button
                onClick={saveQuizToDashboard}
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save to Dashboard
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}