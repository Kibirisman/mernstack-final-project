import mongoose, { Document, Schema } from 'mongoose'
import { IUser } from './User'

export type AnnouncementPriority = 'low' | 'normal' | 'urgent'
export type AnnouncementAudience = 'all' | 'students' | 'parents' | 'teachers'
export type AnnouncementStatus = 'draft' | 'published' | 'archived'

export interface IAnnouncement extends Document {
  title: string
  content: string
  priority: AnnouncementPriority
  audience: AnnouncementAudience[]
  author: mongoose.Types.ObjectId | IUser
  status: AnnouncementStatus
  publishedAt?: Date
  scheduledFor?: Date
  sendEmail: boolean
  emailSent: boolean
  emailSentAt?: Date
  createdAt: Date
  updatedAt: Date
  
  // Virtual fields
  readCount?: number
  totalRecipients?: number
  readPercentage?: number
}

const AnnouncementSchema = new Schema<IAnnouncement>({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxLength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Content is required'],
    trim: true,
    maxLength: [5000, 'Content cannot exceed 5000 characters']
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'urgent'],
    default: 'normal',
    required: true
  },
  audience: [{
    type: String,
    enum: ['all', 'students', 'parents', 'teachers'],
    required: true
  }],
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Author is required']
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft',
    required: true
  },
  publishedAt: {
    type: Date
  },
  scheduledFor: {
    type: Date
  },
  sendEmail: {
    type: Boolean,
    default: true
  },
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Indexes for better query performance
AnnouncementSchema.index({ author: 1, createdAt: -1 })
AnnouncementSchema.index({ status: 1, publishedAt: -1 })
AnnouncementSchema.index({ audience: 1, priority: 1 })
AnnouncementSchema.index({ scheduledFor: 1 })

// Virtual for read statistics (will be populated when needed)
AnnouncementSchema.virtual('readCount', {
  ref: 'AnnouncementRecipient',
  localField: '_id',
  foreignField: 'announcement',
  count: true,
  match: { readAt: { $exists: true } }
})

AnnouncementSchema.virtual('totalRecipients', {
  ref: 'AnnouncementRecipient',
  localField: '_id',
  foreignField: 'announcement',
  count: true
})

// Pre-save middleware to set publishedAt when status changes to published
AnnouncementSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date()
  }
  next()
})

// Static method to find announcements for a specific user
AnnouncementSchema.statics.findForUser = function(userId: string, userRole: string) {
  const audienceFilter = userRole === 'teacher' 
    ? { audience: { $in: ['all', 'teachers'] } }
    : { audience: { $in: ['all', userRole + 's'] } } // students or parents

  return this.find({
    status: 'published',
    $or: [
      { scheduledFor: { $exists: false } },
      { scheduledFor: { $lte: new Date() } }
    ],
    ...audienceFilter
  })
  .populate('author', 'firstName surname')
  .sort({ priority: -1, publishedAt: -1 })
}

// Static method to find announcements by author
AnnouncementSchema.statics.findByAuthor = function(authorId: string) {
  return this.find({ author: authorId })
    .populate('author', 'firstName surname')
    .sort({ createdAt: -1 })
}

// Prevent duplicate model compilation
const Announcement = mongoose.models.Announcement || mongoose.model<IAnnouncement>('Announcement', AnnouncementSchema)

export default Announcement