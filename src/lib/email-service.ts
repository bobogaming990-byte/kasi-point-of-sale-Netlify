// Email Service - Sends transactional emails via Netlify Function
// Uses Resend behind the scenes, configured via RESEND_API_KEY env var

type EmailTemplate =
  | 'welcome'
  | 'new-user'
  | 'payment-success'
  | 'payment-failed'
  | 'trial-expiring'
  | 'subscription-active'
  | 'password-reset'
  | 'daily-report';

interface SendEmailParams {
  template: EmailTemplate;
  to: string;
  data: Record<string, any>;
}

const APP_URL = window.location.origin;

// ============================================================
// CORE SEND FUNCTION
// ============================================================

async function sendEmail({ template, to, data }: SendEmailParams): Promise<boolean> {
  try {
    // Add app URL to all emails
    data.appUrl = data.appUrl || APP_URL;

    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template, to, data }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error(`Email (${template}) failed:`, result.error);
      return false;
    }

    console.log(`Email (${template}) → ${to}:`, result.sent ? '✅' : '⏭️ skipped');
    return result.sent;
  } catch (error) {
    // Emails should never crash the app
    console.error(`Email (${template}) error:`, error);
    return false;
  }
}

// ============================================================
// CONVENIENCE METHODS
// ============================================================

export const emailService = {
  /**
   * Send welcome email when a new company registers
   */
  async sendWelcome(params: {
    to: string;
    businessName: string;
    adminUsername: string;
    storeCode: string;
    trialEndDate: string;
  }): Promise<boolean> {
    return sendEmail({
      template: 'welcome',
      to: params.to,
      data: params,
    });
  },

  /**
   * Send notification when a new user is added to a company
   */
  async sendNewUser(params: {
    to: string;
    username: string;
    role: string;
    businessName: string;
    storeCode: string;
  }): Promise<boolean> {
    return sendEmail({
      template: 'new-user',
      to: params.to,
      data: params,
    });
  },

  /**
   * Send payment success confirmation
   */
  async sendPaymentSuccess(params: {
    to: string;
    amount: string;
    reference: string;
    date: string;
    nextRenewal: string;
  }): Promise<boolean> {
    return sendEmail({
      template: 'payment-success',
      to: params.to,
      data: params,
    });
  },

  /**
   * Send payment failed notification
   */
  async sendPaymentFailed(params: {
    to: string;
    amount: string;
    date: string;
    reason: string;
  }): Promise<boolean> {
    return sendEmail({
      template: 'payment-failed',
      to: params.to,
      data: params,
    });
  },

  /**
   * Send trial expiring warning
   */
  async sendTrialExpiring(params: {
    to: string;
    businessName: string;
    daysLeft: number;
    trialEndDate: string;
    totalSales: number;
  }): Promise<boolean> {
    return sendEmail({
      template: 'trial-expiring',
      to: params.to,
      data: {
        ...params,
        daysLeft: String(params.daysLeft),
        totalSales: String(params.totalSales),
      },
    });
  },

  /**
   * Send subscription activation confirmation
   */
  async sendSubscriptionActive(params: {
    to: string;
    businessName: string;
  }): Promise<boolean> {
    return sendEmail({
      template: 'subscription-active',
      to: params.to,
      data: params,
    });
  },

  /**
   * Send password change notification
   */
  async sendPasswordReset(params: {
    to: string;
    username: string;
    date: string;
  }): Promise<boolean> {
    return sendEmail({
      template: 'password-reset',
      to: params.to,
      data: params,
    });
  },

  /**
   * Send daily sales report
   */
  async sendDailyReport(params: {
    to: string;
    businessName: string;
    date: string;
    revenue: string;
    transactions: number;
    profit: string;
    returns: number;
    lowStock: number;
  }): Promise<boolean> {
    return sendEmail({
      template: 'daily-report',
      to: params.to,
      data: {
        ...params,
        transactions: String(params.transactions),
        returns: String(params.returns),
        lowStock: String(params.lowStock),
      },
    });
  },
};
