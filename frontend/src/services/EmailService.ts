// Email Service for sending automated tournament emails
// Uses Resend API for reliable email delivery

interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
}

interface RegistrationConfirmationData {
  playerName: string;
  eventName: string;
  date: string;
  location: string;
  startTime: string;
  startTime: string;
}

interface GroupAssignmentData {
  playerName: string;
  eventName: string;
  groupName: string;
  boardNumbers: string;
  date: string;
  startTime: string;
  matchFormat?: string; // "Match Play" or "Set Play"
  playStyle?: string; // "Play All" or "Best Of"
  formatDetails?: string; // "Best of 11 legs" or "5 sets, first to 3"
}

export class EmailService {
  // Use Supabase Edge Function to send emails via Resend API
  private static readonly API_URL = 'https://pfujbgwgsxuhgvmeatjh.supabase.co/functions/v1/send-email';
  private static readonly SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmdWpiZ3dnc3h1aGd2bWVhdGpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU1OTMxMTcsImV4cCI6MjA1MTE2OTExN30.Ja1t0rG9Tb5scbHcUZjUZpxX1yPBKu3c3dRwb-Y0oZo';
  private static apiKey: string | null = null;

  /**
   * Initialize the email service with API key
   * Get your API key from https://resend.com/api-keys
   */
  static initialize(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Check if email service is configured
   * Since we're using Supabase Edge Functions, the service is always available
   */
  static isConfigured(): boolean {
    return true; // Always configured since we use Supabase Edge Functions
  }

  /**
   * Send registration confirmation email
   */
  static async sendRegistrationConfirmation(
    email: string,
    data: RegistrationConfirmationData
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('Email service not configured. Skipping email send.');
      return false;
    }

    const template: EmailTemplate = {
      to: email,
      subject: `Registration Confirmed - ${data.eventName}`,
      html: this.getRegistrationConfirmationTemplate(data),
    };

    return this.sendEmail(template);
  }

  /**
   * Send group assignment email
   */
  static async sendGroupAssignment(
    email: string,
    data: GroupAssignmentData
  ): Promise<boolean> {
    if (!this.isConfigured()) {
      console.warn('Email service not configured. Skipping email send.');
      return false;
    }

    const template: EmailTemplate = {
      to: email,
      subject: `Group Assignment - ${data.eventName}`,
      html: this.getGroupAssignmentTemplate(data),
    };

    return this.sendEmail(template);
  }

  /**
   * Send bulk group assignment emails to multiple players
   */
  static async sendBulkGroupAssignments(
    assignments: { email: string; data: GroupAssignmentData }[]
  ): Promise<{ sent: number; failed: number; errors: string[] }> {
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

      console.log(`[EMAIL] Sending bulk group assignments to ${assignments.length} recipients...`);
    for (const assignment of assignments) {
      try {
        const success = await this.sendGroupAssignment(
          assignment.email,
          assignment.data
        );
        if (success) {
          results.sent++;
        } else {
          results.failed++;
          results.errors.push(`Failed to send to ${assignment.email}`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(
          `Error sending to ${assignment.email}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

      console.log(`[EMAIL] Bulk group assignment results: sent=${results.sent}, failed=${results.failed}`);
    return results;
  }

  /**
   * Send email via Supabase Edge Function (proxies to Resend API)
   */
  static async sendEmail(template: EmailTemplate): Promise<boolean> {
    console.log('📧 Attempting to send email to:', template.to);
    console.log('📧 Subject:', template.subject);
    console.log('📧 Using Supabase Edge Function');

    try {
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.SUPABASE_KEY}`,
        },
        body: JSON.stringify({
          to: template.to,
          subject: template.subject,
          html: template.html,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Failed to send email:', error);
        console.error('❌ Response status:', response.status);
        return false;
      }

      const result = await response.json();
      console.log('✅ Email sent successfully!', result);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  /**
   * Registration confirmation email template
   */
  private static getRegistrationConfirmationTemplate(
    data: RegistrationConfirmationData
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Registration Confirmed - CGC Tournament Manager</title>
  <style>
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      background-color: #f4f4f4;
      margin: 0;
      padding: 20px;
    }
    .container { 
      max-width: 500px; 
      margin: 0 auto; 
      background: #ffffff;
      border: 1px solid #ddd; 
      border-radius: 12px; 
      overflow: hidden;
      box-shadow: 0 8px 30px rgba(0,0,0,0.15);
    }
    .header { 
      background-color: #000000; 
      color: #ffffff;
      padding: 40px 20px; 
      text-align: center; 
      border-bottom: 6px solid #ff6600; 
    }
    .header h1 { 
      margin: 0; 
      font-size: 26px; 
      letter-spacing: 1px; 
      font-weight: 900;
      text-transform: uppercase;
    }
    .header p { 
      margin: 8px 0 0; 
      color: #ff6600; 
      font-size: 11px; 
      text-transform: uppercase; 
      letter-spacing: 2px; 
      font-weight: bold;
    }
    
    .content { padding: 35px; }
    .content h2 { margin-top: 0; color: #000000; font-weight: 800; }
    
    .confirmation-box { 
      background-color: #fafafa; 
      padding: 25px; 
      border-radius: 10px; 
      margin: 25px 0; 
      border: 1px solid #eee;
      text-align: center;
    }
    .check-mark {
      font-size: 40px;
      color: #ff6600;
      margin-bottom: 10px;
      display: block;
    }
    .event-name {
      display: block; 
      font-size: 24px; 
      font-weight: 900; 
      color: #000000;
      margin-top: 10px;
      text-transform: uppercase;
    }
    .label { 
      display: block; 
      font-size: 11px; 
      color: #666; 
      text-transform: uppercase; 
      font-weight: 700; 
      letter-spacing: 1.5px;
    }

    .info-list {
      margin: 20px 0;
      padding: 0;
      list-style: none;
      text-align: left;
      font-size: 14px;
    }
    .info-list li {
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .info-list li:last-child { border: none; }
    .info-list strong { color: #000000; }

    .footer { 
      font-size: 11px; 
      color: #888; 
      text-align: center; 
      padding: 25px; 
      background: #f9f9f9;
      border-top: 1px solid #eee;
    }
    .footer strong { color: #000000; }
    .footer .tagline { color: #ff6600; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>CGC TOURNAMENT MANAGER</h1>
      <p>POWERED BY AADS DARTS</p>
    </div>
    
    <div class="content">
      <h2>Registration Confirmed!</h2>
      <p>Hi ${data.playerName}, your spot has been secured for the following event:</p>
      
      <div class="confirmation-box">
        <span class="check-mark">✓</span>
        <span class="label">Event Name</span>
        <span class="event-name">${data.eventName}</span>
      </div>

      <ul class="info-list">
        <li><strong>Player:</strong> ${data.playerName}</li>
        <li><strong>Date:</strong> ${data.date}</li>
        <li><strong>Venue:</strong> ${data.location}</li>
      </ul>

      <p style="font-size: 14px; color: #666; margin-bottom: 0;">
        You will receive another email with your <strong>Assigned Boards</strong> once the round robin is generated and the tournament begins.
      </p>
    </div>

    <div class="footer">
      <p>
        <strong>CGC Tournament Manager</strong><br>
        <span class="tagline">Powered by AADS DARTS</span><br>
        © All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Group assignment email template
   */
  private static getGroupAssignmentTemplate(
    data: GroupAssignmentData
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 10px 10px 0 0;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border-radius: 0 0 10px 10px;
    }
    .info-box {
      background: white;
      border-left: 4px solid #f59e0b;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .info-row {
      display: flex;
      margin: 10px 0;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: bold;
      min-width: 120px;
      color: #f59e0b;
    }
    .info-value {
      color: #374151;
    }
    .highlight-box {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border: 2px solid #f59e0b;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
      text-align: center;
    }
    .highlight-box h2 {
      margin: 0 0 10px 0;
      color: #92400e;
      font-size: 24px;
    }
    .highlight-value {
      font-size: 32px;
      font-weight: bold;
      color: #ef4444;
      margin: 10px 0;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎯 Group Assignment</h1>
  </div>
  
  <div class="content">
    <p>Hi <strong>${data.playerName}</strong>,</p>
    
    <p>The group stage for <strong>${data.eventName}</strong> has started! Here are your assignment details:</p>
    
    <div class="highlight-box">
      <h2>Your Group</h2>
      <div class="highlight-value">${data.groupName}</div>
    </div>
    
    <div class="info-box">
      <div class="info-row">
        <span class="info-label">Board(s):</span>
        <span class="info-value">${data.boardNumbers}</span>
      </div>
      ${data.matchFormat ? `
      <div class="info-row">
        <span class="info-label">Match Format:</span>
        <span class="info-value">${data.matchFormat}</span>
      </div>
      ` : ''}
      ${data.playStyle ? `
      <div class="info-row">
        <span class="info-label">Play Style:</span>
        <span class="info-value">${data.playStyle}</span>
      </div>
      ` : ''}
      ${data.formatDetails ? `
      <div class="info-row">
        <span class="info-label">Format Details:</span>
        <span class="info-value">${data.formatDetails}</span>
      </div>
      ` : ''}
      <div class="info-row">
        <span class="info-label">Date:</span>
        <span class="info-value">${data.date}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Start Time:</span>
        <span class="info-value">${data.startTime}</span>
      </div>
    </div>
    
    <p><strong>Important Information:</strong></p>
    <ul>
      <li>Please proceed to <strong>${data.boardNumbers}</strong> for your matches</li>
      <li>Check the board call system for your match schedule</li>
      <li>Be ready when your name is called</li>
      <li>Good luck and have fun!</li>
    </ul>
    
    <p>May the best player win! 🏆</p>
    
    <div class="footer">
      <p>This is an automated message from CGC Tournament Manager</p>
      <p>For questions, please contact the tournament organizer</p>
    </div>
  </div>
</body>
</html>
    `;
  }
}

// Email service uses Supabase Edge Functions - no frontend API key needed
// The Edge Function securely handles Resend API integration
