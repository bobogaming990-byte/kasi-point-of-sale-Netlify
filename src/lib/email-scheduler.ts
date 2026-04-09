// Email Notification Scheduler
// Checks subscription state on app load and sends appropriate emails.
// Uses localStorage to track what's been sent and avoid duplicate emails.

import { emailService } from './email-service';
import { subscriptionStore } from './subscription-store';
import { companyStore } from './company-store';
import { store } from './store';

const SENT_KEY = 'kasi_email_sent';

interface SentLog {
  [key: string]: string; // key = email type identifier, value = ISO date sent
}

function getSentLog(): SentLog {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) || '{}');
  } catch { return {}; }
}

function markSent(key: string): void {
  const log = getSentLog();
  log[key] = new Date().toISOString();
  localStorage.setItem(SENT_KEY, JSON.stringify(log));
}

function wasSentToday(key: string): boolean {
  const log = getSentLog();
  if (!log[key]) return false;
  const sentDate = new Date(log[key]).toDateString();
  return sentDate === new Date().toDateString();
}

function wasSentEver(key: string): boolean {
  return !!getSentLog()[key];
}

function getEmail(): string | null {
  const company = companyStore.get();
  return company.email || null;
}

/**
 * Run all email checks. Call once after login / app boot.
 * Non-blocking — all sends are fire-and-forget.
 */
export function runEmailScheduler(username: string, role: string): void {
  const email = getEmail();
  if (!email) return; // no email configured — skip all

  const sub = subscriptionStore.get();
  const company = companyStore.get();
  const businessName = company.businessName || 'Your Store';

  // ── First Login: send quick-start guide on very first login ─────────────
  if (!wasSentEver('first-login')) {
    markSent('first-login');
    emailService.sendFirstLogin({
      to: email,
      username,
      businessName,
      role,
      trialDaysLeft: subscriptionStore.getTrialDaysLeft(),
    });
  }

  // ── Trial Expiring: warn at 30, 14, 7, 3, 1 days ───────────────────────
  if (sub.subscription_status === 'trial') {
    const daysLeft = subscriptionStore.getTrialDaysLeft();
    const milestones = [30, 14, 7, 3, 1];

    for (const milestone of milestones) {
      if (daysLeft <= milestone && daysLeft > 0) {
        const key = `trial-expiring-${milestone}`;
        if (!wasSentEver(key)) {
          markSent(key);
          const sales = store.getSales?.() || [];
          emailService.sendTrialExpiring({
            to: email,
            businessName,
            daysLeft,
            trialEndDate: subscriptionStore.getTrialExpiryDate().toLocaleDateString('en-ZA', {
              day: '2-digit', month: 'short', year: 'numeric',
            }),
            totalSales: sales.length,
          });
        }
        break; // only send the most urgent milestone
      }
    }
  }

  // ── Grace Period: daily reminder while in grace ─────────────────────────
  if (sub.subscription_status === 'grace_period') {
    const key = 'grace-period-daily';
    if (!wasSentToday(key)) {
      markSent(key);
      emailService.sendGracePeriod({
        to: email,
        businessName,
        graceDaysLeft: subscriptionStore.getGraceDaysLeft(),
        graceEndDate: sub.grace_period_end
          ? new Date(sub.grace_period_end).toLocaleDateString('en-ZA', {
              day: '2-digit', month: 'short', year: 'numeric',
            })
          : '—',
      });
    }
  }

  // ── Suspended: send once when account transitions to suspended ──────────
  if (sub.subscription_status === 'suspended') {
    const key = 'account-suspended';
    if (!wasSentEver(key)) {
      markSent(key);
      emailService.sendAccountSuspended({
        to: email,
        businessName,
        suspendedDate: new Date().toLocaleDateString('en-ZA', {
          day: '2-digit', month: 'short', year: 'numeric',
        }),
      });
    }
  }

  // ── Renewal Reminder: 3 days before active subscription renews ──────────
  if (sub.subscription_status === 'active' && sub.next_renewal_date) {
    const daysUntil = Math.ceil(
      (new Date(sub.next_renewal_date).getTime() - Date.now()) / 86_400_000
    );
    if (daysUntil > 0 && daysUntil <= 3) {
      const key = `renewal-reminder-${daysUntil}`;
      if (!wasSentEver(key)) {
        markSent(key);
        emailService.sendRenewalReminder({
          to: email,
          daysUntilRenewal: daysUntil,
          renewalDate: new Date(sub.next_renewal_date).toLocaleDateString('en-ZA', {
            day: '2-digit', month: 'short', year: 'numeric',
          }),
          amount: '55.00',
        });
      }
    }
  }
}
