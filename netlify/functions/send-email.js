/**
 * Netlify Function: Send Email via Resend
 * 
 * Endpoint: /.netlify/functions/send-email
 * Method: POST
 * 
 * Body: { template: string, to: string, data: object }
 * 
 * Templates:
 *   - welcome          → New company registration
 *   - new-user         → New user added to company
 *   - payment-success  → Payment confirmed
 *   - payment-failed   → Payment failed
 *   - trial-expiring   → Trial expiration warning
 *   - subscription-active → Subscription activated
 */

const { Resend } = require('resend');

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn('RESEND_API_KEY not configured — skipping email');
      return {
        statusCode: 200,
        body: JSON.stringify({ sent: false, reason: 'Email service not configured' }),
        headers,
      };
    }

    const resend = new Resend(apiKey);
    const { template, to, data } = JSON.parse(event.body);

    if (!template || !to) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: template, to' }),
        headers,
      };
    }

    // Get the from address
    const fromAddress = process.env.EMAIL_FROM || 'Kasi P.O.S <noreply@kasipos.co.za>';
    const replyTo = process.env.EMAIL_REPLY_TO || 'support@kasipos.co.za';

    // Generate email content based on template
    const email = getEmailContent(template, data);
    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `Unknown template: ${template}` }),
        headers,
      };
    }

    // Send via Resend
    const result = await resend.emails.send({
      from: fromAddress,
      to: [to],
      replyTo: replyTo,
      subject: email.subject,
      html: email.html,
    });

    console.log(`Email sent: ${template} → ${to}`, result);

    return {
      statusCode: 200,
      body: JSON.stringify({ sent: true, id: result.data?.id }),
      headers,
    };

  } catch (error) {
    console.error('Email send error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to send email' }),
      headers,
    };
  }
};

// ============================================================
// EMAIL TEMPLATES
// ============================================================

function getEmailContent(template, data) {
  const templates = {

    // ─── WELCOME: New Company Registration ──────────────────────
    'welcome': {
      subject: `Welcome to Kasi P.O.S, ${data?.businessName || 'Boss'}! 🎉`,
      html: baseLayout(`
        <h1 style="color: #1a1a2e; font-size: 28px; margin: 0 0 8px;">
          Welcome to Kasi P.O.S! 🎉
        </h1>
        <p style="color: #666; font-size: 16px; margin: 0 0 32px;">
          Your business is now set up and ready to sell.
        </p>

        <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 0; font-weight: 600; color: #166534;">✅ Account Created Successfully</p>
          <p style="margin: 4px 0 0; color: #15803d; font-size: 14px;">
            Business: <strong>${data?.businessName || 'Your Business'}</strong><br/>
            Admin: <strong>${data?.adminUsername || 'admin'}</strong><br/>
            Store Code: <strong>${data?.storeCode || '—'}</strong>
          </p>
        </div>

        <h2 style="font-size: 18px; color: #1a1a2e; margin: 0 0 12px;">What's included in your free trial:</h2>
        <ul style="color: #444; font-size: 14px; line-height: 2; padding-left: 20px;">
          <li>Unlimited sales & transactions</li>
          <li>Full inventory management with barcodes</li>
          <li>Multi-user support (Admin + Cashiers)</li>
          <li>Daily sales reports & activity log</li>
          <li>Returns management</li>
          <li>Prepaid airtime & data sales</li>
        </ul>

        <div style="background: #fefce8; border-left: 4px solid #eab308; padding: 16px; border-radius: 8px; margin: 24px 0;">
          <p style="margin: 0; font-weight: 600; color: #854d0e;">⏰ Your 90-day free trial has started</p>
          <p style="margin: 4px 0 0; color: #92400e; font-size: 14px;">
            Trial ends: <strong>${data?.trialEndDate || '—'}</strong><br/>
            Upgrade anytime for just R55/month.
          </p>
        </div>

        ${ctaButton('Open Kasi P.O.S', data?.appUrl || 'https://kasi-point-of-sale.netlify.app')}

        <p style="color: #999; font-size: 13px; margin-top: 32px;">
          Keep your Store Code <strong>${data?.storeCode || ''}</strong> safe — you'll need it to add new devices.
        </p>
      `),
    },

    // ─── NEW USER: Added to Company ─────────────────────────────
    'new-user': {
      subject: `You've been added to ${data?.businessName || 'Kasi P.O.S'} 👋`,
      html: baseLayout(`
        <h1 style="color: #1a1a2e; font-size: 28px; margin: 0 0 8px;">
          You're in! 👋
        </h1>
        <p style="color: #666; font-size: 16px; margin: 0 0 32px;">
          An admin has added you to <strong>${data?.businessName || 'Kasi P.O.S'}</strong>.
        </p>

        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 0; font-weight: 600; color: #1e40af;">Your Login Details</p>
          <p style="margin: 8px 0 0; color: #1d4ed8; font-size: 14px;">
            Username: <strong>${data?.username || '—'}</strong><br/>
            Role: <strong>${data?.role || 'cashier'}</strong><br/>
            Store Code: <strong>${data?.storeCode || '—'}</strong>
          </p>
        </div>

        <p style="color: #444; font-size: 14px; line-height: 1.6;">
          ${data?.role === 'admin'
            ? 'As an admin, you have full access to all features including reports, inventory, user management, and settings.'
            : 'As a cashier, you can process sales, scan barcodes, handle returns, and sell prepaid products.'}
        </p>

        ${ctaButton('Log In Now', data?.appUrl || 'https://kasi-point-of-sale.netlify.app')}

        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; border-radius: 8px; margin-top: 24px;">
          <p style="margin: 0; color: #991b1b; font-size: 13px;">
            🔒 <strong>Security:</strong> Change your password after first login. Never share your login details.
          </p>
        </div>
      `),
    },

    // ─── PAYMENT SUCCESS ─────────────────────────────────────────
    'payment-success': {
      subject: `Payment Confirmed — Kasi P.O.S Pro Active! ✅`,
      html: baseLayout(`
        <h1 style="color: #1a1a2e; font-size: 28px; margin: 0 0 8px;">
          Payment Successful! ✅
        </h1>
        <p style="color: #666; font-size: 16px; margin: 0 0 32px;">
          Your Kasi P.O.S Pro subscription is now active.
        </p>

        <div style="background: #f0fdf4; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; font-size: 14px;">Amount</td>
              <td style="padding: 8px 0; color: #1a1a2e; font-size: 14px; text-align: right; font-weight: 600;">R${data?.amount || '55.00'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-size: 14px;">Reference</td>
              <td style="padding: 8px 0; color: #1a1a2e; font-size: 14px; text-align: right; font-family: monospace;">${data?.reference || '—'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-size: 14px;">Date</td>
              <td style="padding: 8px 0; color: #1a1a2e; font-size: 14px; text-align: right;">${data?.date || new Date().toLocaleDateString('en-ZA')}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-size: 14px;">Next Renewal</td>
              <td style="padding: 8px 0; color: #1a1a2e; font-size: 14px; text-align: right; font-weight: 600;">${data?.nextRenewal || '—'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-size: 14px;">Plan</td>
              <td style="padding: 8px 0; color: #22c55e; font-size: 14px; text-align: right; font-weight: 600;">Pro Monthly</td>
            </tr>
          </table>
        </div>

        <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 0; font-weight: 600; color: #166534;">🎉 Pro Features Unlocked</p>
          <p style="margin: 4px 0 0; color: #15803d; font-size: 14px;">
            All features are now fully active across all your devices. Enjoy!
          </p>
        </div>

        ${ctaButton('Open Kasi P.O.S', data?.appUrl || 'https://kasi-point-of-sale.netlify.app')}
      `),
    },

    // ─── PAYMENT FAILED ──────────────────────────────────────────
    'payment-failed': {
      subject: `⚠️ Payment Failed — Action Required`,
      html: baseLayout(`
        <h1 style="color: #1a1a2e; font-size: 28px; margin: 0 0 8px;">
          Payment Failed ⚠️
        </h1>
        <p style="color: #666; font-size: 16px; margin: 0 0 32px;">
          We couldn't process your Kasi P.O.S subscription payment.
        </p>

        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 0; font-weight: 600; color: #991b1b;">Payment Details</p>
          <p style="margin: 8px 0 0; color: #b91c1c; font-size: 14px;">
            Amount: <strong>R${data?.amount || '55.00'}</strong><br/>
            Date: <strong>${data?.date || new Date().toLocaleDateString('en-ZA')}</strong><br/>
            Reason: <strong>${data?.reason || 'Card declined'}</strong>
          </p>
        </div>

        <p style="color: #444; font-size: 14px; line-height: 1.6;">
          Your subscription is in a <strong>grace period</strong>. Please update your payment method within 7 days to avoid service interruption.
        </p>

        ${ctaButton('Retry Payment', (data?.appUrl || 'https://kasi-point-of-sale.netlify.app') + '/subscription')}

        <p style="color: #999; font-size: 13px; margin-top: 24px;">
          Need help? Reply to this email or contact support.
        </p>
      `),
    },

    // ─── TRIAL EXPIRING WARNING ──────────────────────────────────
    'trial-expiring': {
      subject: `⏰ Your Kasi P.O.S trial expires in ${data?.daysLeft || '7'} days`,
      html: baseLayout(`
        <h1 style="color: #1a1a2e; font-size: 28px; margin: 0 0 8px;">
          Trial Ending Soon ⏰
        </h1>
        <p style="color: #666; font-size: 16px; margin: 0 0 32px;">
          Your free trial expires in <strong>${data?.daysLeft || '7'} days</strong>.
        </p>

        <div style="background: #fefce8; border-left: 4px solid #eab308; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 0; font-weight: 600; color: #854d0e;">Don't lose access to your data!</p>
          <p style="margin: 4px 0 0; color: #92400e; font-size: 14px;">
            Business: <strong>${data?.businessName || 'Your Store'}</strong><br/>
            Trial Ends: <strong>${data?.trialEndDate || '—'}</strong><br/>
            Sales Recorded: <strong>${data?.totalSales || '—'}</strong> transactions
          </p>
        </div>

        <p style="color: #444; font-size: 14px; line-height: 1.6;">
          Upgrade to <strong>Kasi P.O.S Pro</strong> for just <strong>R55/month</strong> and keep all your data, reports, and features.
        </p>

        ${ctaButton('Upgrade Now — R55/month', (data?.appUrl || 'https://kasi-point-of-sale.netlify.app') + '/subscription')}

        <p style="color: #999; font-size: 13px; margin-top: 24px;">
          After your trial expires, you'll still be able to view your data but won't be able to process new sales.
        </p>
      `),
    },

    // ─── SUBSCRIPTION ACTIVATED ──────────────────────────────────
    'subscription-active': {
      subject: `🚀 Kasi P.O.S Pro is Active!`,
      html: baseLayout(`
        <h1 style="color: #1a1a2e; font-size: 28px; margin: 0 0 8px;">
          You're Pro Now! 🚀
        </h1>
        <p style="color: #666; font-size: 16px; margin: 0 0 32px;">
          <strong>${data?.businessName || 'Your Business'}</strong> is now running on Kasi P.O.S Pro.
        </p>

        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; color: white;">
          <p style="margin: 0; font-size: 22px; font-weight: 700;">Kasi P.O.S Pro</p>
          <p style="margin: 4px 0 16px; opacity: 0.9; font-size: 14px;">R55/month • All features unlocked</p>
          <div style="display: flex; gap: 16px;">
            <span style="font-size: 13px;">✅ Unlimited Sales</span>
            <span style="font-size: 13px;">✅ Cloud Sync</span>
            <span style="font-size: 13px;">✅ Multi-Device</span>
          </div>
        </div>

        ${ctaButton('Start Selling', data?.appUrl || 'https://kasi-point-of-sale.netlify.app')}
      `),
    },

    // ─── PASSWORD RESET ──────────────────────────────────────────
    'password-reset': {
      subject: `🔒 Password Changed — Kasi P.O.S`,
      html: baseLayout(`
        <h1 style="color: #1a1a2e; font-size: 28px; margin: 0 0 8px;">
          Password Changed 🔒
        </h1>
        <p style="color: #666; font-size: 16px; margin: 0 0 32px;">
          Your Kasi P.O.S password was recently changed.
        </p>

        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 0; color: #1e40af; font-size: 14px;">
            Username: <strong>${data?.username || '—'}</strong><br/>
            Changed: <strong>${data?.date || new Date().toLocaleDateString('en-ZA')}</strong>
          </p>
        </div>

        <p style="color: #444; font-size: 14px; line-height: 1.6;">
          If you didn't make this change, contact your admin immediately.
        </p>

        ${ctaButton('Log In', data?.appUrl || 'https://kasi-point-of-sale.netlify.app')}
      `),
    },

    // ─── DAILY SALES REPORT ──────────────────────────────────────
    'daily-report': {
      subject: `📊 Daily Sales Report — ${data?.date || new Date().toLocaleDateString('en-ZA')}`,
      html: baseLayout(`
        <h1 style="color: #1a1a2e; font-size: 28px; margin: 0 0 8px;">
          Daily Sales Report 📊
        </h1>
        <p style="color: #666; font-size: 16px; margin: 0 0 32px;">
          ${data?.businessName || 'Your Store'} • ${data?.date || new Date().toLocaleDateString('en-ZA')}
        </p>

        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 12px 0; color: #666; font-size: 14px; border-bottom: 1px solid #e2e8f0;">Total Revenue</td>
              <td style="padding: 12px 0; color: #1a1a2e; font-size: 18px; text-align: right; font-weight: 700; border-bottom: 1px solid #e2e8f0;">R${data?.revenue || '0.00'}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; color: #666; font-size: 14px; border-bottom: 1px solid #e2e8f0;">Transactions</td>
              <td style="padding: 12px 0; color: #1a1a2e; font-size: 14px; text-align: right; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${data?.transactions || '0'}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; color: #666; font-size: 14px; border-bottom: 1px solid #e2e8f0;">Profit</td>
              <td style="padding: 12px 0; color: #22c55e; font-size: 14px; text-align: right; font-weight: 600; border-bottom: 1px solid #e2e8f0;">R${data?.profit || '0.00'}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; color: #666; font-size: 14px; border-bottom: 1px solid #e2e8f0;">Returns</td>
              <td style="padding: 12px 0; color: #ef4444; font-size: 14px; text-align: right; font-weight: 600; border-bottom: 1px solid #e2e8f0;">${data?.returns || '0'}</td>
            </tr>
            <tr>
              <td style="padding: 12px 0; color: #666; font-size: 14px;">Low Stock Items</td>
              <td style="padding: 12px 0; color: #f59e0b; font-size: 14px; text-align: right; font-weight: 600;">${data?.lowStock || '0'}</td>
            </tr>
          </table>
        </div>

        ${ctaButton('View Full Report', (data?.appUrl || 'https://kasi-point-of-sale.netlify.app') + '/accounting')}
      `),
    },
  };

  return templates[template] || null;
}

// ============================================================
// BASE LAYOUT
// ============================================================

function baseLayout(content) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    </head>
    <body style="margin: 0; padding: 0; background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        
        <!-- Logo -->
        <div style="text-align: center; margin-bottom: 32px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 12px 24px; border-radius: 12px;">
            <span style="color: white; font-size: 20px; font-weight: 800; letter-spacing: -0.5px;">Kasi P.O.S</span>
          </div>
        </div>

        <!-- Content Card -->
        <div style="background: white; border-radius: 16px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          ${content}
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 32px; padding: 0 20px;">
          <p style="color: #999; font-size: 12px; line-height: 1.6;">
            Kasi P.O.S — Smart Point of Sale for South African Businesses<br/>
            <a href="https://kasi-point-of-sale.netlify.app" style="color: #666; text-decoration: underline;">kasi-point-of-sale.netlify.app</a>
          </p>
          <p style="color: #ccc; font-size: 11px;">
            You received this because you're registered on Kasi P.O.S.<br/>
            If you didn't sign up, you can safely ignore this email.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function ctaButton(text, url) {
  return `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${url}" style="
        display: inline-block;
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        color: white;
        text-decoration: none;
        padding: 14px 32px;
        border-radius: 10px;
        font-weight: 600;
        font-size: 15px;
        box-shadow: 0 4px 12px rgba(26, 26, 46, 0.3);
      ">${text}</a>
    </div>
  `;
}
