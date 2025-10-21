/**
 * Netlify Function: Form Notification Handler
 *
 * Sends email (via Resend) and Slack notifications when consultation form is submitted.
 *
 * Triggered by: Netlify Forms submission
 * Form name: consultation-request
 */

const https = require('https');

/**
 * Send email via Resend API
 */
async function sendResendEmail(formData) {
  const emailData = JSON.stringify({
    from: 'CostPlusDB Alerts <costplusdb@intentsolutions.io>',
    to: ['jeremy@intentsolutions.io'],
    subject: '🔔 New Consultation Request - CostPlusDB',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: monospace; background: #f5f5f5; padding: 20px; }
          .container { background: white; padding: 20px; max-width: 600px; margin: 0 auto; border: 2px solid #333; }
          h1 { color: #333; margin-top: 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { text-align: left; padding: 8px; background: #333; color: white; }
          td { padding: 8px; border-bottom: 1px solid #ddd; }
          .label { font-weight: bold; width: 180px; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #333; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔔 New Consultation Request</h1>

          <table>
            <tr>
              <td class="label">Name:</td>
              <td><strong>${formData.name || 'N/A'}</strong></td>
            </tr>
            <tr>
              <td class="label">Email:</td>
              <td><a href="mailto:${formData.email}">${formData.email || 'N/A'}</a></td>
            </tr>
            <tr>
              <td class="label">Company:</td>
              <td>${formData.company || 'Not provided'}</td>
            </tr>
            <tr>
              <td class="label">Tier of Interest:</td>
              <td>${formData['tier-interest'] || 'Not sure yet'}</td>
            </tr>
            <tr>
              <td class="label">Timeline:</td>
              <td>${formData.timeline || 'N/A'}</td>
            </tr>
          </table>

          <h2>Current Database</h2>
          <p style="background: #f5f5f5; padding: 10px; border-left: 3px solid #333;">
            ${formData['current-db'] || 'Not provided'}
          </p>

          <h2>Requirements / Questions</h2>
          <p style="background: #f5f5f5; padding: 10px; border-left: 3px solid #333;">
            ${formData.requirements || 'Not provided'}
          </p>

          <div class="footer">
            <p><strong>Submitted:</strong> ${new Date().toISOString()}</p>
            <p><strong>Next Steps:</strong></p>
            <ol>
              <li>Review customer requirements</li>
              <li>Schedule consultation call (15-30 minutes)</li>
              <li>Recommend tier + add-ons</li>
              <li>Send Stripe payment link</li>
            </ol>
            <p>
              <a href="https://app.netlify.com" style="color: #333;">View in Netlify Dashboard →</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.resend.com',
      port: 443,
      path: '/emails',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': emailData.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Email sent via Resend:', data);
          resolve(JSON.parse(data));
        } else {
          console.error('❌ Resend API error:', res.statusCode, data);
          reject(new Error(`Resend API error: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Failed to send email via Resend:', error);
      reject(error);
    });

    req.write(emailData);
    req.end();
  });
}

/**
 * Send Slack notification
 */
async function sendSlackNotification(formData) {
  // Only send if Slack webhook URL is configured
  if (!process.env.SLACK_WEBHOOK_URL) {
    console.log('⚠️ SLACK_WEBHOOK_URL not configured, skipping Slack notification');
    return null;
  }

  const slackMessage = JSON.stringify({
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🔔 New Consultation Request',
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Name:*\n${formData.name || 'N/A'}`
          },
          {
            type: 'mrkdwn',
            text: `*Email:*\n<mailto:${formData.email}|${formData.email || 'N/A'}>`
          },
          {
            type: 'mrkdwn',
            text: `*Company:*\n${formData.company || 'Not provided'}`
          },
          {
            type: 'mrkdwn',
            text: `*Timeline:*\n${formData.timeline || 'N/A'}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Tier of Interest:*\n${formData['tier-interest'] || 'Not sure yet'}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Current Database:*\n${formData['current-db'] || 'Not provided'}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Requirements:*\n${formData.requirements || 'Not provided'}`
        }
      },
      {
        type: 'divider'
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Submitted: ${new Date().toISOString()}`
          }
        ]
      }
    ]
  });

  const webhookUrl = new URL(process.env.SLACK_WEBHOOK_URL);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: webhookUrl.hostname,
      port: 443,
      path: webhookUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': slackMessage.length
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ Slack notification sent');
          resolve(data);
        } else {
          console.error('❌ Slack webhook error:', res.statusCode, data);
          reject(new Error(`Slack error: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Failed to send Slack notification:', error);
      reject(error);
    });

    req.write(slackMessage);
    req.end();
  });
}

/**
 * Netlify Function Handler
 *
 * Triggered automatically by Netlify when form is submitted
 * Event type: submission-created
 */
exports.handler = async (event) => {
  // Only handle form submission events
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // Parse the Netlify form submission payload
    // Netlify sends URL-encoded form data, not JSON
    let formData = {};

    // Check if it's JSON or URL-encoded
    const contentType = event.headers['content-type'] || '';

    if (contentType.includes('application/json')) {
      // JSON format (webhook/direct submission)
      const payload = JSON.parse(event.body);
      formData = payload.data || payload;
    } else {
      // URL-encoded format (standard Netlify Forms submission)
      const params = new URLSearchParams(event.body);
      for (const [key, value] of params.entries()) {
        formData[key] = value;
      }
    }

    console.log('📝 Form submission received:', {
      form: formData['form-name'] || formData.form_name || 'unknown',
      email: formData.email,
      timestamp: new Date().toISOString()
    });

    // Send notifications in parallel
    const [emailResult, slackResult] = await Promise.allSettled([
      sendResendEmail(formData),
      sendSlackNotification(formData)
    ]);

    // Log results
    if (emailResult.status === 'fulfilled') {
      console.log('✅ Email notification sent successfully');
    } else {
      console.error('❌ Email notification failed:', emailResult.reason);
    }

    if (slackResult.status === 'fulfilled') {
      console.log('✅ Slack notification sent successfully');
    } else if (process.env.SLACK_WEBHOOK_URL) {
      console.error('❌ Slack notification failed:', slackResult.reason);
    }

    // Return success even if some notifications failed
    // (Netlify form submission should still succeed)
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Notifications sent',
        emailSent: emailResult.status === 'fulfilled',
        slackSent: slackResult.status === 'fulfilled'
      })
    };

  } catch (error) {
    console.error('❌ Error processing form submission:', error);

    // Return 200 anyway to avoid blocking form submission
    // Log the error for debugging
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Form received, notification error logged',
        error: error.message
      })
    };
  }
};
