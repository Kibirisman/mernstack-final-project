"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  UserCircle,
  LogOut,
  BrainCircuit,
  Trophy,
  Star,
  MessageSquare,
  Vote,
  Calendar,
  Users,
  Crown,
  Zap,
  ThumbsUp,
  Send,
} from "lucide-react"
import type { User } from "../page"

interface DashboardPageProps {
  user: User
  onSignOut: () => void
}

// Mock data
const mockQuizzes = [
  { id: 1, title: "Mathematics Quiz - Algebra", date: "2024-01-15", studentCount: 28 },
  { id: 2, title: "Science Quiz - Physics", date: "2024-01-12", studentCount: 25 },
  { id: 3, title: "English Quiz - Grammar", date: "2024-01-10", studentCount: 30 },
]

const mockAnnouncements = [
  {
    id: 1,
    title: "Parent-Teacher Meeting",
    content: "Scheduled for next Friday at 2 PM",
    timestamp: "2024-01-15 10:30",
  },
  {
    id: 2,
    title: "School Trip Permission",
    content: "Please submit permission slips by Wednesday",
    timestamp: "2024-01-14 14:20",
  },
  {
    id: 3,
    title: "Exam Schedule Released",
    content: "Mid-term exams start next Monday",
    timestamp: "2024-01-13 09:15",
  },
]

export default function DashboardPage({ user, onSignOut }: DashboardPageProps) {
  const [studentPoints] = useState(850)
  const [suggestion, setSuggestion] = useState("")
  const [teacherRating, setTeacherRating] = useState(0)
  const [voteChoice, setVoteChoice] = useState<"yes" | "no" | null>(null)

  const getRank = (points: number) => {
    if (points >= 1000) return { name: "Elephant", icon: Crown, color: "text-amber-600" }
    if (points >= 700) return { name: "Lion", icon: Zap, color: "text-blue-600" }
    return { name: "Tiger", icon: Trophy, color: "text-gray-600" }
  }

  const currentRank = getRank(studentPoints)
  const RankIcon = currentRank.icon

  const handleSubmitSuggestion = () => {
    if (suggestion.trim()) {
      alert("Suggestion submitted anonymously!")
      setSuggestion("")
    }
  }

  const handleRateTeacher = () => {
    if (teacherRating > 0) {
      alert(`Teacher rated ${teacherRating} stars!`)
      setTeacherRating(0)
    }
  }

  const handleVote = (choice: "yes" | "no") => {
    setVoteChoice(choice)
    alert(`Vote recorded: ${choice.toUpperCase()}`)
  }

  const renderTeacherContent = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BrainCircuit className="h-5 w-5 text-blue-800" />
            <span>AI Quiz Generator</span>
          </CardTitle>
          <CardDescription>Create engaging quizzes for your students</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="bg-blue-800 hover:bg-blue-900 text-white">Generate New Quiz</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Quizzes</CardTitle>
          <CardDescription>Recently created quizzes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockQuizzes.map((quiz) => (
              <div key={quiz.id} className="flex justify-between items-center p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">{quiz.title}</h4>
                  <p className="text-sm text-gray-600">Created: {quiz.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">{quiz.studentCount} students</p>
                  <Button variant="outline" size="sm" className="mt-1 bg-transparent">
                    View Results
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderStudentContent = () => (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-blue-50 to-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <RankIcon className={`h-6 w-6 ${currentRank.color}`} />
            <span>Your Rank: {currentRank.name}</span>
          </CardTitle>
          <CardDescription>Current Points: {studentPoints}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((studentPoints / 1000) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">
              Next rank: {studentPoints >= 1000 ? "Max rank achieved!" : `${1000 - studentPoints} points to Elephant`}
            </p>
            <p className="text-xs text-amber-600">Last reset: Sunday</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-amber-500" />
            <span>Rate Your Teachers</span>
          </CardTitle>
          <CardDescription>Provide anonymous feedback</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Rate Mr. Johnson (Mathematics)</p>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setTeacherRating(star)}
                    className={`p-1 ${star <= teacherRating ? "text-amber-500" : "text-gray-300"}`}
                  >
                    <Star className="h-6 w-6 fill-current" />
                  </button>
                ))}
              </div>
            </div>
            <Button
              onClick={handleRateTeacher}
              disabled={teacherRating === 0}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              Submit Rating
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5 text-blue-800" />
            <span>Anonymous Suggestions</span>
          </CardTitle>
          <CardDescription>Share your ideas safely</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              placeholder="Share your suggestion anonymously..."
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
            />
            <Button
              onClick={handleSubmitSuggestion}
              disabled={!suggestion.trim()}
              className="bg-blue-800 hover:bg-blue-900 text-white"
            >
              <Send className="h-4 w-4 mr-2" />
              Submit Anonymously
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderParentContent = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-blue-800" />
            <span>Latest Announcements</span>
          </CardTitle>
          <CardDescription>Stay updated with school news</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockAnnouncements.map((announcement) => (
              <div key={announcement.id} className="p-4 border rounded-lg">
                <h4 className="font-medium text-gray-900">{announcement.title}</h4>
                <p className="text-gray-600 mt-1">{announcement.content}</p>
                <p className="text-xs text-gray-500 mt-2">{announcement.timestamp}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Vote className="h-5 w-5 text-amber-500" />
            <span>Community Voting</span>
          </CardTitle>
          <CardDescription>Participate in school decisions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">
                Should we approve the upcoming class trip to the National Museum?
              </h4>
              <p className="text-sm text-gray-600 mb-4">Cost: $25 per student | Date: February 15th</p>
              <div className="flex space-x-4">
                <Button
                  onClick={() => handleVote("yes")}
                  variant={voteChoice === "yes" ? "default" : "outline"}
                  className={voteChoice === "yes" ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  <ThumbsUp className="h-4 w-4 mr-2" />
                  Yes, Approve
                </Button>
                <Button
                  onClick={() => handleVote("no")}
                  variant={voteChoice === "no" ? "default" : "outline"}
                  className={voteChoice === "no" ? "bg-red-600 hover:bg-red-700" : ""}
                >
                  No, Decline
                </Button>
              </div>
              {voteChoice && <p className="text-sm text-green-600 mt-2">✓ Your vote has been recorded</p>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  const renderRoleContent = () => {
    switch (user.role) {
      case "teacher":
        return renderTeacherContent()
      case "student":
        return renderStudentContent()
      case "parent":
        return renderParentContent()
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Users className="h-8 w-8 text-blue-800" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">SchoolConnect</h1>
                <p className="text-sm text-gray-600 capitalize">{user.role} Dashboard</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <UserCircle className="h-8 w-8 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  {user.firstName} {user.surname}
                </span>
              </div>
              <Button
                onClick={onSignOut}
                variant="outline"
                size="sm"
                className="text-gray-600 hover:text-gray-900 bg-transparent"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Hello, {user.firstName}!</h2>
          <p className="text-gray-600 mt-1">Welcome back to your {user.role} dashboard</p>
        </div>

        {renderRoleContent()}
      </main>
    </div>
  )
}
