"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Users, Star, ShieldCheck, MailCheck, BrainCircuit, Trophy, Vote } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export type UserRole = "teacher" | "student" | "parent"

export interface User {
  firstName: string
  secondName: string
  surname: string
  email: string
  role: UserRole
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-800" />
              <span className="text-xl font-bold text-gray-900">SchoolConnect</span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Link href="#features" className="text-gray-600 hover:text-gray-900">
                Features
              </Link>
              <Link href="#how-it-works" className="text-gray-600 hover:text-gray-900">
                How It Works
              </Link>
              <Link href="#privacy" className="text-gray-600 hover:text-gray-900">
                Privacy
              </Link>
            </nav>
            <Button variant="outline" className="border-blue-800 text-blue-800 hover:bg-blue-50 bg-transparent" asChild>
              <Link href="/signin">Sign In</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-white py-20 lg:py-32 overflow-hidden">
        {/* Background Icons */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <Users className="absolute top-20 left-10 h-24 w-24 text-blue-800" />
          <Star className="absolute top-40 right-20 h-20 w-20 text-amber-500" />
          <ShieldCheck className="absolute bottom-20 left-1/4 h-28 w-28 text-blue-800" />
          <Users className="absolute bottom-32 right-10 h-16 w-16 text-amber-500" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Empowering Schools,
              <br />
              <span className="text-blue-800">Engaging Parents,</span>
              <br />
              Inspiring Students.
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              A simple, centralized way to share announcements, performance insights, and feedback.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="bg-blue-800 hover:bg-blue-900 text-white px-8 py-3 text-lg" asChild>
                <Link href="/signup">Get Started for Free</Link>
              </Button>
              <Button
                variant="outline"
                className="border-blue-800 text-blue-800 hover:bg-blue-50 px-8 py-3 text-lg bg-transparent"
              >
                Watch Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything Your School Community Needs
            </h2>
            <p className="text-xl text-gray-600">Powerful features designed for teachers, students, and parents</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Feature cards (6) */}
            {[
              {
                icon: <Users className="h-8 w-8 text-blue-800" />,
                title: "Role-Based Access",
                desc: "Tailored tools for teachers, students, and parents.",
              },
              {
                icon: <MailCheck className="h-8 w-8 text-amber-500" />,
                title: "Email + SMS Announcements",
                desc: "Stay informed even without logging in.",
              },
              {
                icon: <BrainCircuit className="h-8 w-8 text-blue-800" />,
                title: "AI-Generated Quizzes",
                desc: "Teachers save time. Students stay engaged.",
              },
              {
                icon: <Trophy className="h-8 w-8 text-amber-500" />,
                title: "Gamified Points",
                desc: "Earn points and unlock weekly ranks.",
              },
              {
                icon: <Star className="h-8 w-8 text-blue-800" />,
                title: "Term Ratings",
                desc: "Students rate teachers every term.",
              },
              {
                icon: <Vote className="h-8 w-8 text-amber-500" />,
                title: "Parent Governance",
                desc: "Parents vote on class trip plans and more.",
              },
            ].map(({ icon, title, desc }) => (
              <Card key={title} className="border-gray-200 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    {icon}
                    <CardTitle className="text-gray-900">{title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600">{desc}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ... (remaining landing-page sections unchanged) ... */}
    </div>
  )
}
