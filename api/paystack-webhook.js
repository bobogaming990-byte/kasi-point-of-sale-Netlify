/**
 * Vercel Serverless Function: Paystack Webhook Handler
 * 
 * Endpoint: /api/paystack-webhook
 * Method: POST
 * 
 * SECURITY: Webhook signature is verified using PAYSTACK_WEBHOOK_SECRET
 */

const crypto = require('crypto');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  try {
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET;
    const signature = req.headers['x-paystack-signature'];

    // Verify webhook signature if secret is configured
    if (secret && signature) {
      // Vercel parses body automatically; we need the raw body for HMAC
      const rawBody = JSON.stringify(req.body);
      const hash = crypto
        .createHmac('sha512', secret)
        .update(rawBody)
        .digest('hex');

      if (hash !== signature) {
        console.error('Invalid webhook signature');
        return res.status(401).send('Invalid signature');
      }
    } else if (secret && !signature) {
      console.warn('Webhook secret configured but no signature received');
    }

    const payload = req.body;
    const eventType = payload.event;
    const data = payload.data;

    console.log(`Paystack webhook received: ${eventType}`, JSON.stringify(data, null, 2));

    switch (eventType) {
      case 'charge.success':
        console.log('✅ Payment successful:', {
          reference: data.reference,
          amount: data.amount / 100,
          currency: data.currency,
          customer: data.customer?.email,
          metadata: data.metadata
        });
        break;

      case 'subscription.create':
        console.log('📅 Subscription created:', {
          subscription_code: data.subscription_code,
          customer: data.customer?.email,
          plan: data.plan?.name,
          amount: data.amount / 100
        });
        break;

      case 'invoice.payment_failed':
        console.log('❌ Payment failed:', {
          subscription_code: data.subscription_code,
          customer: data.customer?.email,
          attempt: data.attempt,
          next_payment_attempt: data.next_payment_attempt
        });
        break;

      case 'subscription.disable':
        console.log('🚫 Subscription disabled:', {
          subscription_code: data.subscription_code,
          customer: data.customer?.email
        });
        break;

      case 'subscription.not_renew':
        console.log('⚠️ Subscription not renewing:', {
          subscription_code: data.subscription_code,
          customer: data.customer?.email,
          cancel_at_period_end: true
        });
        break;

      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }

    return res.status(200).send('Webhook received');

  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).send('Internal server error');
  }
};
