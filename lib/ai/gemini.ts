import { GoogleGenerativeAI } from '@google/generative-ai'

if (!process.env.GOOGLE_AI_API_KEY) {
  throw new Error('GOOGLE_AI_API_KEY is required')
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)

export interface QuizGenerationOptions {
  topic: string
  difficulty: 'easy' | 'medium' | 'hard'
  questionCount: number
  questionTypes: ('multiple_choice' | 'true_false' | 'short_answer')[]
  gradeLevel?: string
  curriculum?: string
}

export interface GeneratedQuestion {
  type: 'multiple_choice' | 'true_false' | 'short_answer'
  question: string
  options?: string[]
  correctAnswer: string | number
  explanation?: string
  points: number
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface GeneratedQuiz {
  title: string
  description: string
  questions: GeneratedQuestion[]
  totalPoints: number
  estimatedTimeMinutes: number
}

export async function generateQuiz(options: QuizGenerationOptions): Promise<GeneratedQuiz> {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

  const questionTypesText = options.questionTypes.map(type => {
    switch (type) {
      case 'multiple_choice': return 'multiple choice questions with 4 options'
      case 'true_false': return 'true/false questions'
      case 'short_answer': return 'short answer questions'
      default: return type
    }
  }).join(', ')

  const prompt = `
Generate a comprehensive quiz with the following specifications:

Topic: ${options.topic}
Difficulty Level: ${options.difficulty}
Number of Questions: ${options.questionCount}
Question Types: ${questionTypesText}
${options.gradeLevel ? `Grade Level: ${options.gradeLevel}` : ''}
${options.curriculum ? `Curriculum: ${options.curriculum}` : ''}

Please generate a quiz that follows this EXACT JSON format:

{
  "title": "Quiz title based on the topic",
  "description": "Brief description of what the quiz covers",
  "questions": [
    {
      "type": "multiple_choice",
      "question": "The actual question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Why this is the correct answer",
      "points": 1,
      "difficulty": "easy"
    },
    {
      "type": "true_false",
      "question": "Statement to be evaluated as true or false",
      "correctAnswer": true,
      "explanation": "Explanation of the answer",
      "points": 1,
      "difficulty": "medium"
    },
    {
      "type": "short_answer",
      "question": "Question requiring a brief written response",
      "correctAnswer": "Expected answer or key points",
      "explanation": "What should be included in a complete answer",
      "points": 2,
      "difficulty": "hard"
    }
  ],
  "totalPoints": "Sum of all question points",
  "estimatedTimeMinutes": "Estimated time to complete"
}

Requirements:
1. Make questions educationally sound and age-appropriate
2. Ensure correct answers are accurate
3. Provide clear, helpful explanations
4. Vary difficulty levels appropriately
5. Use proper grammar and clear language
6. For multiple choice: correctAnswer should be the index (0-3)
7. For true/false: correctAnswer should be boolean (true/false)
8. For short answer: correctAnswer should be a string with expected response
9. Points: easy=1, medium=2, hard=3
10. Estimated time: approximately 1-2 minutes per question

Return ONLY the JSON response, no additional text.
`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    
    // Clean up the response to ensure it's valid JSON
    let jsonText = text.trim()
    
    // Remove any markdown code blocks
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\s*/, '').replace(/```\s*$/, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\s*/, '').replace(/```\s*$/, '')
    }
    
    // Parse the JSON response
    const generatedQuiz: GeneratedQuiz = JSON.parse(jsonText)
    
    // Validate the response structure
    if (!generatedQuiz.title || !generatedQuiz.questions || !Array.isArray(generatedQuiz.questions)) {
      throw new Error('Invalid quiz structure generated')
    }
    
    // Validate each question
    generatedQuiz.questions.forEach((question, index) => {
      if (!question.type || !question.question || !question.correctAnswer === undefined) {
        throw new Error(`Invalid question structure at index ${index}`)
      }
      
      if (question.type === 'multiple_choice' && (!question.options || question.options.length !== 4)) {
        throw new Error(`Multiple choice question at index ${index} must have exactly 4 options`)
      }
    })
    
    return generatedQuiz
    
  } catch (error) {
    console.error('Error generating quiz:', error)
    
    // Fallback: Generate a simple quiz if AI fails
    if (error instanceof SyntaxError) {
      console.warn('AI generated invalid JSON, creating fallback quiz')
      return createFallbackQuiz(options)
    }
    
    throw new Error(`Failed to generate quiz: ${error.message}`)
  }
}

function createFallbackQuiz(options: QuizGenerationOptions): GeneratedQuiz {
  const questions: GeneratedQuestion[] = []
  
  // Generate basic questions based on topic
  for (let i = 0; i < Math.min(options.questionCount, 5); i++) {
    if (options.questionTypes.includes('multiple_choice')) {
      questions.push({
        type: 'multiple_choice',
        question: `Which of the following is related to ${options.topic}?`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 0,
        explanation: 'This is the correct answer based on the topic.',
        points: 1,
        difficulty: options.difficulty
      })
    }
  }
  
  return {
    title: `${options.topic} Quiz`,
    description: `A quiz covering key concepts in ${options.topic}`,
    questions,
    totalPoints: questions.reduce((sum, q) => sum + q.points, 0),
    estimatedTimeMinutes: questions.length * 2
  }
}

export async function generateQuizSuggestions(topic: string): Promise<string[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
  
  const prompt = `
Generate 5 specific quiz topic suggestions related to "${topic}".
Each suggestion should be:
1. More specific than the original topic
2. Suitable for educational assessment
3. Clear and focused

Return only a JSON array of strings, no additional text:
["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5"]
`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text().trim()
    
    let jsonText = text
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\s*/, '').replace(/```\s*$/, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\s*/, '').replace(/```\s*$/, '')
    }
    
    const suggestions = JSON.parse(jsonText)
    
    if (Array.isArray(suggestions) && suggestions.length > 0) {
      return suggestions.slice(0, 5)
    }
    
    throw new Error('Invalid suggestions format')
    
  } catch (error) {
    console.error('Error generating suggestions:', error)
    
    // Fallback suggestions
    return [
      `Basic concepts in ${topic}`,
      `Advanced ${topic} principles`,
      `${topic} applications`,
      `${topic} terminology`,
      `${topic} problem solving`
    ]
  }
}

export async function improveQuestion(question: string, context: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-pro' })
  
  const prompt = `
Improve this quiz question to make it clearer and more educationally effective:

Original Question: "${question}"
Context/Topic: "${context}"

Please return ONLY the improved question text, with no additional formatting or explanation.
Make it:
1. Clearer and more specific
2. Educationally sound
3. Age-appropriate
4. Grammatically correct
`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text().trim()
    
  } catch (error) {
    console.error('Error improving question:', error)
    return question // Return original if improvement fails
  }
}