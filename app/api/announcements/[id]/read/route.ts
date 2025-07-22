import { NextRequest, NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import AnnouncementRecipient from '@/lib/models/AnnouncementRecipient'
import User from '@/lib/models/User'
import { verifyToken } from '@/lib/auth/jwt'

// PATCH - Mark announcement as read
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
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Mark announcement as read
    const recipient = await AnnouncementRecipient.markAsRead(
      params.id,
      user._id.toString()
    )

    return NextResponse.json({
      message: 'Announcement marked as read',
      readAt: recipient.readAt
    }, { status: 200 })

  } catch (error) {
    console.error('Mark as read error:', error)

    if (error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Mark announcement as unread (remove read status)
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
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Mark announcement as unread by removing readAt timestamp
    await AnnouncementRecipient.findOneAndUpdate(
      { announcement: params.id, recipient: user._id },
      { $unset: { readAt: 1 } }
    )

    return NextResponse.json({
      message: 'Announcement marked as unread'
    }, { status: 200 })

  } catch (error) {
    console.error('Mark as unread error:', error)

    if (error.message === 'Invalid or expired token') {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}