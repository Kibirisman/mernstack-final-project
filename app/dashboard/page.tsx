"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  Plus,
} from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth/context"
import AnnouncementForm from "@/components/announcements/AnnouncementForm"
import AnnouncementList from "@/components/announcements/AnnouncementList"

type UserRole = "teacher" | "student" | "parent"

interface User {
  firstName: string
  secondName: string
  surname: string
  email: string
  role: UserRole
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

// Mock anonymous messages data
const mockAnonymousMessages = [
  {
    id: 1,
    message: "Could we have more variety in the cafeteria menu? Maybe some vegetarian options?",
    timestamp: "2024-01-15 14:30",
    likes: 12,
    category: "Food & Dining",
  },
  {
    id: 2,
    message: "The library could use more study spaces during exam periods. It gets really crowded.",
    timestamp: "2024-01-14 16:45",
    likes: 8,
    category: "Facilities",
  },
  {
    id: 3,
    message: "Thank you to the teachers for being so supportive during the science fair preparation!",
    timestamp: "2024-01-13 11:20",
    likes: 25,
    category: "Appreciation",
  },
  {
    id: 4,
    message: "Can we have more after-school clubs? Maybe a coding club or art club?",
    timestamp: "2024-01-12 09:15",
    likes: 15,
    category: "Activities",
  },
  {
    id: 5,
    message: "The new playground equipment is amazing! The younger students love it.",
    timestamp: "2024-01-11 13:40",
    likes: 18,
    category: "Appreciation",
  },
]

export default function DashboardPage() {
  const router = useRouter()
  const { user, signout } = useAuth()
  const [studentPoints] = useState(850)
  const [suggestion, setSuggestion] = useState("")
  const [teacherRating, setTeacherRating] = useState(0)
  const [voteChoice, setVoteChoice] = useState<"yes" | "no" | null>(null)
  const [anonymousMessages, setAnonymousMessages] = useState(mockAnonymousMessages)
  const [likedMessages, setLikedMessages] = useState<number[]>([])
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'edit'>('list')
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null)

  useEffect(() => {
    if (!user) {
      router.push("/signin")
    }
  }, [user, router])

  const handleSignOut = () => {
    signout()
    router.push("/")
  }

  const getRank = (points: number) => {
    if (points >= 1000) return { name: "Elephant", icon: Crown, color: "text-amber-600" }
    if (points >= 700) return { name: "Lion", icon: Zap, color: "text-blue-600" }
    return { name: "Tiger", icon: Trophy, color: "text-gray-600" }
  }

  const currentRank = getRank(studentPoints)
  const RankIcon = currentRank.icon

  const handleLikeMessage = (messageId: number) => {
    if (likedMessages.includes(messageId)) {
      // Unlike the message
      setLikedMessages((prev) => prev.filter((id) => id !== messageId))
      setAnonymousMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, likes: msg.likes - 1 } : msg)))
    } else {
      // Like the message
      setLikedMessages((prev) => [...prev, messageId])
      setAnonymousMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, likes: msg.likes + 1 } : msg)))
    }
  }

  const handleSubmitSuggestion = () => {
    if (suggestion.trim()) {
      const newMessage = {
        id: Date.now(),
        message: suggestion.trim(),
        timestamp: new Date()
          .toLocaleString("en-US", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })
          .replace(",", ""),
        likes: 0,
        category: "General",
      }
      setAnonymousMessages((prev) => [newMessage, ...prev])
      setSuggestion("")
      alert("Suggestion submitted anonymously!")
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-800 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const renderAnonymousMessagesSection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5 text-blue-800" />
          <span>Community Messages</span>
        </CardTitle>
        <CardDescription>Anonymous suggestions and feedback from the school community</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {anonymousMessages.map((msg) => (
            <div key={msg.id} className="p-4 bg-gray-50 rounded-lg border">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{msg.category}</span>
                <span className="text-xs text-gray-500">{msg.timestamp}</span>
              </div>
              <p className="text-gray-700 mb-3">{msg.message}</p>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleLikeMessage(msg.id)}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-md text-sm transition-colors ${
                    likedMessages.includes(msg.id)
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  <ThumbsUp className="h-3 w-3" />
                  <span>{msg.likes}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )

  const renderTeacherContent = () => {
    if (currentView === 'create') {
      return (
        <AnnouncementForm 
          onSuccess={() => setCurrentView('list')}
          onCancel={() => setCurrentView('list')}
        />
      )
    }

    if (currentView === 'edit' && editingAnnouncement) {
      return (
        <AnnouncementForm 
          initialData={editingAnnouncement}
          isEditing={true}
          onSuccess={() => {
            setCurrentView('list')
            setEditingAnnouncement(null)
          }}
          onCancel={() => {
            setCurrentView('list')
            setEditingAnnouncement(null)
          }}
        />
      )
    }

    return (
      <div className="space-y-6">
        <AnnouncementList 
          viewMode="teacher"
          onCreateNew={() => setCurrentView('create')}
          onEdit={(announcement) => {
            setEditingAnnouncement(announcement)
            setCurrentView('edit')
          }}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BrainCircuit className="h-5 w-5 text-blue-800" />
              <span>AI Quiz Generator</span>
            </CardTitle>
            <CardDescription>Create engaging quizzes for your students</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="bg-blue-800 hover:bg-blue-900 text-white" disabled>
              Generate New Quiz (Coming Soon)
            </Button>
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
                    <Button variant="outline" size="sm" className="mt-1 bg-transparent" disabled>
                      View Results (Coming Soon)
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {renderAnonymousMessagesSection()}
      </div>
    )
  }

  const renderStudentContent = () => (
    <div className="space-y-6">
      <AnnouncementList viewMode="student" />

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
      <AnnouncementList viewMode="parent" />

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

      {renderAnonymousMessagesSection()}
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
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-blue-800" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">SchoolConnect</h1>
                  <p className="text-sm text-gray-600 capitalize">{user.role} Dashboard</p>
                </div>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <UserCircle className="h-8 w-8 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  {user.firstName} {user.surname}
                </span>
              </div>
              <Button
                onClick={handleSignOut}
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
