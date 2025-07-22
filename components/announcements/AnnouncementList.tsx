"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Edit, 
  Trash2, 
  Users, 
  Calendar, 
  Mail, 
  Eye, 
  BarChart3,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus
} from "lucide-react"

interface AnnouncementListProps {
  onCreateNew?: () => void
  onEdit?: (announcement: any) => void
  viewMode?: 'teacher' | 'student' | 'parent'
}

interface Announcement {
  _id: string
  title: string
  content: string
  priority: 'low' | 'normal' | 'urgent'
  audience: string[]
  author: {
    firstName: string
    surname: string
  }
  status: 'draft' | 'published' | 'archived'
  publishedAt: string
  emailSent: boolean
  sendEmail: boolean
  createdAt: string
  isRead?: boolean
  readAt?: string
  analytics?: {
    totalRecipients: number
    readCount: number
    readPercentage: number
    emailsSent: number
    emailOpenRate: number
  }
}

export default function AnnouncementList({ 
  onCreateNew, 
  onEdit, 
  viewMode = 'student' 
}: AnnouncementListProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchAnnouncements()
  }, [viewMode])

  const fetchAnnouncements = async () => {
    try {
      const token = localStorage.getItem('auth-token')
      if (!token) {
        throw new Error('Authentication required')
      }

      const url = viewMode === 'teacher' 
        ? '/api/announcements?author=true'
        : '/api/announcements'

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAnnouncements(data.announcements)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to load announcements')
      }
    } catch (error) {
      console.error('Failed to fetch announcements:', error)
      setError('Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (announcementId: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) {
      return
    }

    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch(`/api/announcements/${announcementId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        setAnnouncements(prev => prev.filter(a => a._id !== announcementId))
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to delete announcement')
      }
    } catch (error) {
      console.error('Failed to delete announcement:', error)
      setError('Failed to delete announcement')
    }
  }

  const handleMarkAsRead = async (announcementId: string) => {
    try {
      const token = localStorage.getItem('auth-token')
      const response = await fetch(`/api/announcements/${announcementId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setAnnouncements(prev => 
          prev.map(a => 
            a._id === announcementId 
              ? { ...a, isRead: true, readAt: data.readAt }
              : a
          )
        )
      }
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800'
      case 'normal': return 'bg-blue-100 text-blue-800'
      case 'low': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
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

  const getAudienceText = (audience: string[]) => {
    if (audience.includes('all')) return 'Everyone'
    return audience.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ')
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Loading announcements...</span>
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

  return (
    <div className="space-y-4">
      {viewMode === 'teacher' && onCreateNew && (
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Your Announcements</h2>
            <p className="text-gray-600">Manage and track your announcements</p>
          </div>
          <Button onClick={onCreateNew} className="bg-blue-800 hover:bg-blue-900">
            <Plus className="h-4 w-4 mr-2" />
            New Announcement
          </Button>
        </div>
      )}

      {announcements.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="space-y-3">
              <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <Calendar className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">
                {viewMode === 'teacher' ? 'No announcements created yet' : 'No announcements available'}
              </h3>
              <p className="text-gray-500 max-w-sm mx-auto">
                {viewMode === 'teacher' 
                  ? 'Create your first announcement to share important information with your school community.'
                  : 'Check back later for updates from your teachers and school administrators.'
                }
              </p>
              {viewMode === 'teacher' && onCreateNew && (
                <Button onClick={onCreateNew} className="bg-blue-800 hover:bg-blue-900">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Announcement
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card 
              key={announcement._id} 
              className={`transition-all hover:shadow-md ${
                viewMode !== 'teacher' && !announcement.isRead 
                  ? 'border-blue-200 bg-blue-50/30' 
                  : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <Badge className={getPriorityColor(announcement.priority)}>
                        {announcement.priority.toUpperCase()}
                      </Badge>
                      <Badge className={getStatusColor(announcement.status)}>
                        {announcement.status.toUpperCase()}
                      </Badge>
                      {viewMode !== 'teacher' && !announcement.isRead && (
                        <Badge className="bg-blue-500 text-white">NEW</Badge>
                      )}
                    </div>
                    <CardTitle className="text-xl">{announcement.title}</CardTitle>
                    <CardDescription className="flex items-center space-x-4 text-sm">
                      <span className="flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>{getAudienceText(announcement.audience)}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(announcement.publishedAt || announcement.createdAt)}</span>
                      </span>
                      {announcement.author && (
                        <span>By: {announcement.author.firstName} {announcement.author.surname}</span>
                      )}
                    </CardDescription>
                  </div>
                  
                  {viewMode === 'teacher' && (
                    <div className="flex items-center space-x-2 ml-4">
                      {onEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(announcement)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(announcement._id)}
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
                  {announcement.content.length > 300 
                    ? announcement.content.substring(0, 300) + '...'
                    : announcement.content
                  }
                </p>

                {viewMode === 'teacher' && announcement.analytics && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <Users className="h-4 w-4 text-gray-600" />
                        <span className="font-semibold text-lg">
                          {announcement.analytics.totalRecipients}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">Recipients</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <Eye className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-lg text-blue-600">
                          {announcement.analytics.readCount}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">Read</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <BarChart3 className="h-4 w-4 text-green-600" />
                        <span className="font-semibold text-lg text-green-600">
                          {Math.round(announcement.analytics.readPercentage)}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">Read Rate</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <Mail className="h-4 w-4 text-purple-600" />
                        <span className="font-semibold text-lg text-purple-600">
                          {announcement.analytics.emailsSent}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">Emails Sent</p>
                    </div>
                  </div>
                )}

                {viewMode !== 'teacher' && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center space-x-4">
                      {announcement.sendEmail && (
                        <div className="flex items-center space-x-1 text-sm text-gray-600">
                          <Mail className="h-4 w-4" />
                          <span>Email sent</span>
                        </div>
                      )}
                      {announcement.isRead ? (
                        <div className="flex items-center space-x-1 text-sm text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span>Read on {formatDate(announcement.readAt!)}</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <Clock className="h-4 w-4" />
                          <span>Unread</span>
                        </div>
                      )}
                    </div>
                    
                    {!announcement.isRead && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleMarkAsRead(announcement._id)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        Mark as Read
                      </Button>
                    )}
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