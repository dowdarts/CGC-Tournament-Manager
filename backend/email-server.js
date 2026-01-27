// Simple HTTP server for email sending
// Can run locally or deploy to Vercel

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_LHWNKYP4_7RzQTTZZMEWpuGxWLEV3PU5s';

async function handleRequest(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Health check
  if (req.url === '/health' ||req.url === '/' ||req.url === '/api/health') {
    res.status(200).json({ status: 'ok', message: 'Email server running' });
    return;
  }

  // Send email endpoint
  if (req.url === '/api/send-email' && req.method === 'POST') {
    try {
      const { to, subject, html, type } = req.body;
      console.log('📧 Received email request:', { to, subject, type });

      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'AADS Tournament <noreply@aadsdarts.com>',
          to: to,
          subject: subject,
          html: html,
        }),
      });

      if (!resendResponse.ok) {
        const error = await resendResponse.text();
        console.error('❌ Resend API error:', error);
        res.status(resendResponse.status).json({ success: false, error: error });
        return;
      }

      const result = await resendResponse.json();
      console.log('✅ Email sent successfully:', result);
      
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error('❌ Server error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
    return;
  }

  // 404
  res.status(404).json({ error: 'Not found' });
}

// Export for Vercel serverless
export default handleRequest;
