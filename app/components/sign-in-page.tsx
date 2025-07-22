"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LogIn, Mail, Lock, AlertCircle } from "lucide-react"
import type { User } from "../page"

// Mock user data for authentication
const mockUsers = [
  {
    firstName: "John",
    secondName: "Michael",
    surname: "Doe",
    email: "teacher@school.com",
    password: "password123",
    role: "teacher" as const,
  },
  {
    firstName: "Jane",
    secondName: "Mary",
    surname: "Smith",
    email: "student@school.com",
    password: "password123",
    role: "student" as const,
  },
  {
    firstName: "Robert",
    secondName: "James",
    surname: "Johnson",
    email: "parent@school.com",
    password: "password123",
    role: "parent" as const,
  },
]

interface SignInPageProps {
  onSignIn: (user: User) => void
  onNavigateToSignUp: () => void
}

export default function SignInPage({ onSignIn, onNavigateToSignUp }: SignInPageProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const user = mockUsers.find((u) => u.email === email && u.password === password)

    if (user) {
      onSignIn({
        firstName: user.firstName,
        secondName: user.secondName,
        surname: user.surname,
        email: user.email,
        role: user.role,
      })
    } else {
      setError("Invalid email or password. Please try again.")
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
            <LogIn className="h-8 w-8 text-blue-800" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Welcome Back</CardTitle>
          <CardDescription className="text-gray-600">Sign in to your SchoolConnect account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full bg-blue-800 hover:bg-blue-900 text-white" disabled={isLoading}>
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <button onClick={onNavigateToSignUp} className="text-blue-800 hover:text-blue-900 font-medium">
                Sign up
              </button>
            </p>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800 font-medium mb-2">Demo Accounts:</p>
            <div className="text-xs text-blue-700 space-y-1">
              <p>Teacher: teacher@school.com / password123</p>
              <p>Student: student@school.com / password123</p>
              <p>Parent: parent@school.com / password123</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
