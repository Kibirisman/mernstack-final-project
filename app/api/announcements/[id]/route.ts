import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import connectDB from '@/lib/mongodb'
import Announcement from '@/lib/models/Announcement'
import AnnouncementRecipient from '@/lib/models/AnnouncementRecipient'
import User from '@/lib/models/User'
import { verifyToken } from '@/lib/auth/jwt'

const updateAnnouncementSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(5000).optional(),
  priority: z.enum(['low', 'normal', 'urgent']).optional(),
  audience: z.array(z.enum(['all', 'students', 'parents', 'teachers'])).min(1).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  scheduledFor: z.string().datetime().optional(),
  sendEmail: z.boolean().optional()
})

// GET - Get single announcement with analytics (for teachers)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const authHeader = request.headers.get('authorization')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = authHeader?.replace('Bearer ', '') || cookieToken

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const payload = verifyToken(token)
    const user = await User.findById(payload.userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const announcement = await Announcement.findById(params.id)
      .populate('author', 'firstName surname')

    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    // Check if user has permission to view this announcement
    const isAuthor = announcement.author._id.toString() === user._id.toString()
    const isInAudience = announcement.audience.includes('all') || 
                        announcement.audience.includes(user.role + 's') ||
                        (user.role === 'teacher' && announcement.audience.includes('teachers'))

    if (!isAuthor && !isInAudience) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    let result: any = announcement.toObject()

    // If user is the author, include analytics
    if (isAuthor) {
      const analytics = await AnnouncementRecipient.getAnnouncementAnalytics(params.id)
      result.analytics = analytics[0] || {
        totalRecipients: 0,
        readCount: 0,
        emailsSent: 0,
        emailsDelivered: 0,
        emailsOpened: 0,
        readPercentage: 0,
        emailOpenRate: 0
      }
    } else {
      // If user is a recipient, check read status
      const recipient = await AnnouncementRecipient.findOne({
        announcement: params.id,
        recipient: user._id
      })
      result.isRead = !!recipient?.readAt
      result.readAt = recipient?.readAt
    }

    return NextResponse.json({ announcement: result }, { status: 200 })

  } catch (error) {
    console.error('Get announcement error:', error)

    if (error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update announcement
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const authHeader = request.headers.get('authorization')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = authHeader?.replace('Bearer ', '') || cookieToken

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const payload = verifyToken(token)
    const user = await User.findById(payload.userId)
    if (!user || user.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can update announcements' }, { status: 403 })
    }

    const announcement = await Announcement.findById(params.id)
    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    // Check if user is the author
    if (announcement.author.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'You can only update your own announcements' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = updateAnnouncementSchema.parse(body)

    // Update announcement
    Object.assign(announcement, validatedData)
    
    if (validatedData.scheduledFor) {
      announcement.scheduledFor = new Date(validatedData.scheduledFor)
    }

    await announcement.save()

    // If status changed to published and recipients don't exist, create them
    if (validatedData.status === 'published' && !announcement.emailSent) {
      await createRecipientsAndSendEmails(announcement)
    }

    return NextResponse.json({
      message: 'Announcement updated successfully',
      announcement: await announcement.populate('author', 'firstName surname')
    }, { status: 200 })

  } catch (error) {
    console.error('Update announcement error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      )
    }

    if (error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Delete announcement
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB()

    const authHeader = request.headers.get('authorization')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = authHeader?.replace('Bearer ', '') || cookieToken

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const payload = verifyToken(token)
    const user = await User.findById(payload.userId)
    if (!user || user.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can delete announcements' }, { status: 403 })
    }

    const announcement = await Announcement.findById(params.id)
    if (!announcement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 })
    }

    // Check if user is the author
    if (announcement.author.toString() !== user._id.toString()) {
      return NextResponse.json({ error: 'You can only delete your own announcements' }, { status: 403 })
    }

    // Delete announcement and associated recipients
    await AnnouncementRecipient.deleteMany({ announcement: params.id })
    await Announcement.findByIdAndDelete(params.id)

    return NextResponse.json({
      message: 'Announcement deleted successfully'
    }, { status: 200 })

  } catch (error) {
    console.error('Delete announcement error:', error)

    if (error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function (same as in main route)
async function createRecipientsAndSendEmails(announcement: any) {
  const { sendAnnouncementEmail } = require('@/lib/email/announcements')
  
  try {
    const audienceFilter: any = {}
    
    if (!announcement.audience.includes('all')) {
      const roles = announcement.audience.map((aud: string) => 
        aud === 'students' ? 'student' : 
        aud === 'parents' ? 'parent' : 
        aud === 'teachers' ? 'teacher' : aud
      )
      audienceFilter.role = { $in: roles }
    }

    const recipients = await User.find(audienceFilter).select('_id email firstName role')
    const recipientIds = recipients.map(r => r._id.toString())

    await AnnouncementRecipient.createForAnnouncement(
      announcement._id.toString(),
      recipientIds
    )

    if (announcement.sendEmail) {
      await sendAnnouncementEmail(announcement, recipients)
      
      announcement.emailSent = true
      announcement.emailSentAt = new Date()
      await announcement.save()
    }

  } catch (error) {
    console.error('Error creating recipients and sending emails:', error)
  }
}