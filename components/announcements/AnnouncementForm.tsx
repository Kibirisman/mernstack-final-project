"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Send, 
  Save, 
  Calendar, 
  Users, 
  Mail, 
  AlertTriangle,
  CheckCircle,
  X 
} from "lucide-react"

interface AnnouncementFormProps {
  onSuccess?: () => void
  onCancel?: () => void
  initialData?: any
  isEditing?: boolean
}

export default function AnnouncementForm({ 
  onSuccess, 
  onCancel, 
  initialData, 
  isEditing = false 
}: AnnouncementFormProps) {
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    content: initialData?.content || "",
    priority: initialData?.priority || "normal",
    audience: initialData?.audience || ["all"],
    sendEmail: initialData?.sendEmail ?? true,
    scheduledFor: initialData?.scheduledFor ? 
      new Date(initialData.scheduledFor).toISOString().slice(0, 16) : ""
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const audienceOptions = [
    { value: "all", label: "Everyone", icon: Users },
    { value: "students", label: "Students", icon: Users },
    { value: "parents", label: "Parents", icon: Users },
    { value: "teachers", label: "Teachers", icon: Users }
  ]

  const priorityOptions = [
    { value: "low", label: "Low Priority", color: "text-gray-600", bgColor: "bg-gray-100" },
    { value: "normal", label: "Normal", color: "text-blue-600", bgColor: "bg-blue-100" },
    { value: "urgent", label: "Urgent", color: "text-red-600", bgColor: "bg-red-100" }
  ]

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError("")
    setSuccess("")
  }

  const handleAudienceChange = (audienceValue: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      audience: checked 
        ? [...prev.audience, audienceValue]
        : prev.audience.filter(a => a !== audienceValue)
    }))
  }

  const handleSubmit = async (status: 'draft' | 'published') => {
    setIsLoading(true)
    setError("")
    setSuccess("")

    try {
      const token = localStorage.getItem('auth-token')
      if (!token) {
        throw new Error('Authentication required')
      }

      const payload = {
        ...formData,
        status,
        scheduledFor: formData.scheduledFor || undefined
      }

      const url = isEditing 
        ? `/api/announcements/${initialData._id}`
        : '/api/announcements'
      
      const method = isEditing ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(
          status === 'published' 
            ? `Announcement ${isEditing ? 'updated' : 'created'} and published successfully!`
            : `Draft ${isEditing ? 'updated' : 'saved'} successfully!`
        )
        
        if (onSuccess) {
          setTimeout(() => onSuccess(), 1500)
        }
      } else {
        setError(data.error || `Failed to ${isEditing ? 'update' : 'create'} announcement`)
      }
    } catch (error) {
      console.error('Announcement error:', error)
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const isFormValid = formData.title.trim() && formData.content.trim() && formData.audience.length > 0

  const selectedPriority = priorityOptions.find(p => p.value === formData.priority)

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Send className="h-5 w-5 text-blue-800" />
          <span>{isEditing ? 'Edit Announcement' : 'Create New Announcement'}</span>
        </CardTitle>
        <CardDescription>
          {isEditing ? 'Update your announcement details' : 'Share important information with your school community'}
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

        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-medium text-gray-700">
            Announcement Title *
          </label>
          <Input
            id="title"
            placeholder="Enter announcement title..."
            value={formData.title}
            onChange={(e) => handleInputChange("title", e.target.value)}
            maxLength={200}
            className="text-lg"
          />
          <p className="text-xs text-gray-500">{formData.title.length}/200 characters</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="content" className="text-sm font-medium text-gray-700">
            Announcement Content *
          </label>
          <Textarea
            id="content"
            placeholder="Write your announcement content here..."
            value={formData.content}
            onChange={(e) => handleInputChange("content", e.target.value)}
            rows={6}
            maxLength={5000}
            className="resize-none"
          />
          <p className="text-xs text-gray-500">{formData.content.length}/5000 characters</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Priority Level</label>
            <Select value={formData.priority} onValueChange={(value) => handleInputChange("priority", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${option.bgColor}`}></div>
                      <span className={option.color}>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="scheduledFor" className="text-sm font-medium text-gray-700">
              Schedule For (Optional)
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="scheduledFor"
                type="datetime-local"
                value={formData.scheduledFor}
                onChange={(e) => handleInputChange("scheduledFor", e.target.value)}
                className="pl-10"
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">Target Audience *</label>
          <div className="grid grid-cols-2 gap-3">
            {audienceOptions.map((option) => {
              const IconComponent = option.icon
              return (
                <div key={option.value} className="flex items-center space-x-2 p-3 border rounded-lg">
                  <Checkbox
                    id={option.value}
                    checked={formData.audience.includes(option.value)}
                    onCheckedChange={(checked) => handleAudienceChange(option.value, !!checked)}
                  />
                  <IconComponent className="h-4 w-4 text-gray-600" />
                  <label 
                    htmlFor={option.value} 
                    className="text-sm font-medium text-gray-700 cursor-pointer"
                  >
                    {option.label}
                  </label>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-lg border">
          <Checkbox
            id="sendEmail"
            checked={formData.sendEmail}
            onCheckedChange={(checked) => handleInputChange("sendEmail", !!checked)}
          />
          <Mail className="h-4 w-4 text-blue-600" />
          <label htmlFor="sendEmail" className="text-sm font-medium text-gray-700 cursor-pointer">
            Send email notification to recipients
          </label>
        </div>

        <div className="flex justify-between pt-4 border-t">
          <div className="flex space-x-3">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>

          <div className="flex space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSubmit('draft')}
              disabled={!isFormValid || isLoading}
            >
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button
              type="button"
              onClick={() => handleSubmit('published')}
              disabled={!isFormValid || isLoading}
              className="bg-blue-800 hover:bg-blue-900"
            >
              <Send className="h-4 w-4 mr-2" />
              {isLoading ? 'Publishing...' : 'Publish Now'}
            </Button>
          </div>
        </div>

        {selectedPriority && (
          <div className={`p-3 rounded-lg ${selectedPriority.bgColor} border`}>
            <p className={`text-sm ${selectedPriority.color} font-medium`}>
              {formData.priority === 'urgent' && '⚠️ This announcement will be marked as URGENT and sent immediately.'}
              {formData.priority === 'normal' && '📢 This announcement will be sent with normal priority.'}
              {formData.priority === 'low' && '💬 This announcement will be sent with low priority.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}