import { sendEmail } from './resend'
import AnnouncementRecipient from '../models/AnnouncementRecipient'

export async function sendAnnouncementEmail(announcement: any, recipients: any[]) {
  const batchSize = 50 // Send emails in batches to avoid rate limits
  
  try {
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize)
      
      await Promise.all(
        batch.map(recipient => sendSingleAnnouncementEmail(announcement, recipient))
      )
      
      // Small delay between batches
      if (i + batchSize < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
  } catch (error) {
    console.error('Error sending announcement emails:', error)
    throw error
  }
}

async function sendSingleAnnouncementEmail(announcement: any, recipient: any) {
  try {
    const emailHtml = getAnnouncementEmailHTML(announcement, recipient)
    const subject = getEmailSubject(announcement)
    
    await sendEmail({
      to: recipient.email,
      subject,
      html: emailHtml
    })

    // Update recipient record
    await AnnouncementRecipient.findOneAndUpdate(
      { 
        announcement: announcement._id, 
        recipient: recipient._id 
      },
      {
        emailSent: true,
        emailSentAt: new Date()
      }
    )

  } catch (error) {
    console.error(`Failed to send email to ${recipient.email}:`, error)
    // Don't throw - continue with other recipients
  }
}

function getEmailSubject(announcement: any): string {
  const priorityPrefix = announcement.priority === 'urgent' ? '🚨 URGENT: ' : 
                        announcement.priority === 'normal' ? '📢 ' : '💬 '
  
  return `${priorityPrefix}${announcement.title} - SchoolConnect`
}

function getAnnouncementEmailHTML(announcement: any, recipient: any): string {
  const priorityColor = announcement.priority === 'urgent' ? '#dc2626' : 
                       announcement.priority === 'normal' ? '#1e40af' : '#6b7280'
  
  const priorityBadge = announcement.priority === 'urgent' ? 'URGENT' : 
                       announcement.priority === 'normal' ? 'ANNOUNCEMENT' : 'NOTICE'

  const authorName = announcement.author?.firstName && announcement.author?.surname 
    ? `${announcement.author.firstName} ${announcement.author.surname}`
    : 'SchoolConnect Team'

  const viewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${announcement.title} - SchoolConnect</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, ${priorityColor} 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <div style="background: rgba(255,255,255,0.2); display: inline-block; padding: 8px 16px; border-radius: 20px; margin-bottom: 15px;">
          <span style="color: white; font-size: 12px; font-weight: bold; text-transform: uppercase;">${priorityBadge}</span>
        </div>
        <h1 style="color: white; margin: 0; font-size: 24px;">${announcement.title}</h1>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="border-left: 4px solid ${priorityColor}; padding-left: 20px; margin-bottom: 25px;">
          <h2 style="color: #1e40af; margin-top: 0; font-size: 16px;">Hi ${recipient.firstName},</h2>
          <p style="margin: 0; color: #666; font-size: 14px;">From: ${authorName}</p>
          <p style="margin: 5px 0 0 0; color: #666; font-size: 14px;">
            Published: ${new Date(announcement.publishedAt || announcement.createdAt).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric', 
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
        
        <div style="margin: 25px 0; padding: 20px; background: #f8fafc; border-radius: 8px; border-left: 4px solid ${priorityColor};">
          ${formatAnnouncementContent(announcement.content)}
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${viewUrl}" style="background: ${priorityColor}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            View in Dashboard
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <div style="text-align: center;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            This announcement was sent to ${getAudienceText(announcement.audience)}.
          </p>
          <p style="color: #666; font-size: 12px; margin: 5px 0 0 0;">
            You received this email because you are part of the SchoolConnect community.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

function formatAnnouncementContent(content: string): string {
  // Simple formatting - convert line breaks to HTML
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => `<p style="margin: 0 0 15px 0; color: #374151;">${line}</p>`)
    .join('')
}

function getAudienceText(audience: string[]): string {
  if (audience.includes('all')) {
    return 'all school community members'
  }
  
  const audienceMap = {
    'students': 'students',
    'parents': 'parents',
    'teachers': 'teachers'
  }
  
  const audienceText = audience
    .filter(aud => aud !== 'all')
    .map(aud => audienceMap[aud] || aud)
    .join(', ')
  
  if (audience.length === 1) {
    return audienceText
  } else if (audience.length === 2) {
    return audienceText.replace(', ', ' and ')
  } else {
    const parts = audienceText.split(', ')
    const last = parts.pop()
    return parts.join(', ') + ', and ' + last
  }
}

export function getAnnouncementDigestEmailHTML(announcements: any[], recipient: any): string {
  const viewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Daily Announcements Digest - SchoolConnect</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Daily Announcements</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">SchoolConnect Digest</p>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #1e40af; margin-top: 0;">Hi ${recipient.firstName},</h2>
        
        <p>Here are the latest announcements from your school:</p>
        
        <div style="margin: 25px 0;">
          ${announcements.map(announcement => `
            <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="margin: 0; color: #1f2937; font-size: 18px;">${announcement.title}</h3>
                <span style="background: ${announcement.priority === 'urgent' ? '#fef2f2' : announcement.priority === 'normal' ? '#eff6ff' : '#f9fafb'}; 
                             color: ${announcement.priority === 'urgent' ? '#dc2626' : announcement.priority === 'normal' ? '#1e40af' : '#6b7280'}; 
                             padding: 4px 12px; border-radius: 12px; font-size: 12px; text-transform: uppercase;">
                  ${announcement.priority}
                </span>
              </div>
              <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">
                From: ${announcement.author?.firstName} ${announcement.author?.surname} • 
                ${new Date(announcement.publishedAt).toLocaleDateString()}
              </p>
              <p style="margin: 0; color: #374151;">${announcement.content.substring(0, 200)}${announcement.content.length > 200 ? '...' : ''}</p>
            </div>
          `).join('')}
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${viewUrl}" style="background: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            View All Announcements
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #666; font-size: 12px; text-align: center; margin: 0;">
          You're receiving this digest as a member of the SchoolConnect community.<br>
          Visit your dashboard to manage your notification preferences.
        </p>
      </div>
    </body>
    </html>
  `
}