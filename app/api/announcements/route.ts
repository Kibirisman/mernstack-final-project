import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import connectDB from '@/lib/mongodb'
import Announcement from '@/lib/models/Announcement'
import AnnouncementRecipient from '@/lib/models/AnnouncementRecipient'
import User from '@/lib/models/User'
import { verifyToken } from '@/lib/auth/jwt'
import { sendAnnouncementEmail } from '@/lib/email/announcements'

const createAnnouncementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required').max(5000),
  priority: z.enum(['low', 'normal', 'urgent']).default('normal'),
  audience: z.array(z.enum(['all', 'students', 'parents', 'teachers'])).min(1),
  status: z.enum(['draft', 'published']).default('draft'),
  scheduledFor: z.string().datetime().optional(),
  sendEmail: z.boolean().default(true)
})

// GET - List announcements
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    // Get token and verify user
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

    const { searchParams } = new URL(request.url)
    const authorOnly = searchParams.get('author') === 'true'

    let announcements

    if (authorOnly && user.role === 'teacher') {
      // Teachers viewing their own announcements
      announcements = await Announcement.findByAuthor(user._id.toString())
    } else {
      // Users viewing announcements for their role
      announcements = await Announcement.findForUser(user._id.toString(), user.role)
      
      // Get read status for each announcement
      const announcementIds = announcements.map((a: any) => a._id.toString())
      const readStatuses = await AnnouncementRecipient.getReadStatusForUser(
        user._id.toString(), 
        announcementIds
      )
      
      // Add read status to announcements
      const readStatusMap = new Map(
        readStatuses.map((rs: any) => [rs.announcement.toString(), rs.readAt])
      )
      
      announcements = announcements.map((announcement: any) => ({
        ...announcement.toObject(),
        isRead: !!readStatusMap.get(announcement._id.toString()),
        readAt: readStatusMap.get(announcement._id.toString())
      }))
    }

    return NextResponse.json({ announcements }, { status: 200 })

  } catch (error) {
    console.error('Get announcements error:', error)
    
    if (error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create announcement
export async function POST(request: NextRequest) {
  try {
    await connectDB()

    // Get token and verify user
    const authHeader = request.headers.get('authorization')
    const cookieToken = request.cookies.get('auth-token')?.value
    const token = authHeader?.replace('Bearer ', '') || cookieToken

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const payload = verifyToken(token)
    const user = await User.findById(payload.userId)
    if (!user || user.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can create announcements' }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = createAnnouncementSchema.parse(body)

    // Create announcement
    const announcement = new Announcement({
      ...validatedData,
      author: user._id,
      scheduledFor: validatedData.scheduledFor ? new Date(validatedData.scheduledFor) : undefined
    })

    await announcement.save()

    // If published, create recipients and send emails
    if (announcement.status === 'published') {
      await createRecipientsAndSendEmails(announcement)
    }

    return NextResponse.json({
      message: 'Announcement created successfully',
      announcement: await announcement.populate('author', 'firstName surname')
    }, { status: 201 })

  } catch (error) {
    console.error('Create announcement error:', error)

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

// Helper function to create recipients and send emails
async function createRecipientsAndSendEmails(announcement: any) {
  try {
    // Get all users who should receive this announcement
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

    // Create recipient records
    await AnnouncementRecipient.createForAnnouncement(
      announcement._id.toString(),
      recipientIds
    )

    // Send emails if enabled
    if (announcement.sendEmail) {
      await sendAnnouncementEmail(announcement, recipients)
      
      // Mark announcement as email sent
      announcement.emailSent = true
      announcement.emailSentAt = new Date()
      await announcement.save()
    }

  } catch (error) {
    console.error('Error creating recipients and sending emails:', error)
    // Don't throw error - announcement was created successfully
  }
}