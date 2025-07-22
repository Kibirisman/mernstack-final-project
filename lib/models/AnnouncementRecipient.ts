import mongoose, { Document, Schema } from 'mongoose'
import { IUser } from './User'
import { IAnnouncement } from './Announcement'

export interface IAnnouncementRecipient extends Document {
  announcement: mongoose.Types.ObjectId | IAnnouncement
  recipient: mongoose.Types.ObjectId | IUser
  readAt?: Date
  emailSent: boolean
  emailSentAt?: Date
  emailDelivered: boolean
  emailDeliveredAt?: Date
  emailOpened: boolean
  emailOpenedAt?: Date
  createdAt: Date
  updatedAt: Date
  
  // Virtual fields
  isRead: boolean
}

const AnnouncementRecipientSchema = new Schema<IAnnouncementRecipient>({
  announcement: {
    type: Schema.Types.ObjectId,
    ref: 'Announcement',
    required: [true, 'Announcement is required']
  },
  recipient: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Recipient is required']
  },
  readAt: {
    type: Date
  },
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: {
    type: Date
  },
  emailDelivered: {
    type: Boolean,
    default: false
  },
  emailDeliveredAt: {
    type: Date
  },
  emailOpened: {
    type: Boolean,
    default: false
  },
  emailOpenedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Compound index to ensure one record per announcement-recipient pair
AnnouncementRecipientSchema.index({ announcement: 1, recipient: 1 }, { unique: true })

// Indexes for common queries
AnnouncementRecipientSchema.index({ recipient: 1, readAt: 1 })
AnnouncementRecipientSchema.index({ announcement: 1, readAt: 1 })
AnnouncementRecipientSchema.index({ emailSent: 1, emailSentAt: 1 })

// Virtual to check if announcement is read
AnnouncementRecipientSchema.virtual('isRead').get(function() {
  return !!this.readAt
})

// Static method to mark announcement as read
AnnouncementRecipientSchema.statics.markAsRead = async function(
  announcementId: string, 
  recipientId: string
) {
  return this.findOneAndUpdate(
    { announcement: announcementId, recipient: recipientId },
    { 
      readAt: new Date() 
    },
    { 
      upsert: true, 
      new: true 
    }
  )
}

// Static method to get read status for user's announcements
AnnouncementRecipientSchema.statics.getReadStatusForUser = function(
  recipientId: string, 
  announcementIds: string[]
) {
  return this.find({
    recipient: recipientId,
    announcement: { $in: announcementIds }
  }).select('announcement readAt')
}

// Static method to get announcement analytics
AnnouncementRecipientSchema.statics.getAnnouncementAnalytics = function(announcementId: string) {
  return this.aggregate([
    { $match: { announcement: new mongoose.Types.ObjectId(announcementId) } },
    {
      $group: {
        _id: null,
        totalRecipients: { $sum: 1 },
        readCount: { 
          $sum: { 
            $cond: [{ $ifNull: ["$readAt", false] }, 1, 0] 
          } 
        },
        emailsSent: { 
          $sum: { 
            $cond: ["$emailSent", 1, 0] 
          } 
        },
        emailsDelivered: { 
          $sum: { 
            $cond: ["$emailDelivered", 1, 0] 
          } 
        },
        emailsOpened: { 
          $sum: { 
            $cond: ["$emailOpened", 1, 0] 
          } 
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalRecipients: 1,
        readCount: 1,
        emailsSent: 1,
        emailsDelivered: 1,
        emailsOpened: 1,
        readPercentage: {
          $cond: [
            { $eq: ["$totalRecipients", 0] },
            0,
            { $multiply: [{ $divide: ["$readCount", "$totalRecipients"] }, 100] }
          ]
        },
        emailOpenRate: {
          $cond: [
            { $eq: ["$emailsSent", 0] },
            0,
            { $multiply: [{ $divide: ["$emailsOpened", "$emailsSent"] }, 100] }
          ]
        }
      }
    }
  ])
}

// Static method to create recipients for an announcement
AnnouncementRecipientSchema.statics.createForAnnouncement = async function(
  announcementId: string,
  recipientIds: string[]
) {
  const recipients = recipientIds.map(recipientId => ({
    announcement: announcementId,
    recipient: recipientId,
    emailSent: false,
    emailDelivered: false,
    emailOpened: false
  }))

  try {
    return await this.insertMany(recipients, { ordered: false })
  } catch (error) {
    // Handle duplicate key errors (recipient already exists for this announcement)
    if (error.code === 11000) {
      console.log('Some recipients already exist for this announcement')
      return []
    }
    throw error
  }
}

// Prevent duplicate model compilation
const AnnouncementRecipient = mongoose.models.AnnouncementRecipient || 
  mongoose.model<IAnnouncementRecipient>('AnnouncementRecipient', AnnouncementRecipientSchema)

export default AnnouncementRecipient