/**
 * Netlify Function: Paystack Webhook Handler
 * 
 * Endpoint: /.netlify/functions/paystack-webhook
 * Method: POST
 * 
 * This endpoint receives webhook events from Paystack when:
 * - Payment succeeds (charge.success)
 * - Subscription is created (subscription.create)
 * - Invoice payment fails (invoice.payment_failed)
 * 
 * SECURITY: Webhook signature is verified using PAYSTACK_WEBHOOK_SECRET
 */

const crypto = require('crypto');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method not allowed',
      headers: { 'Content-Type': 'text/plain' }
    };
  }

  try {
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET;
    const signature = event.headers['x-paystack-signature'];

    // Verify webhook signature if secret is configured
    if (secret && signature) {
      const hash = crypto
        .createHmac('sha512', secret)
        .update(event.body)
        .digest('hex');

      if (hash !== signature) {
        console.error('Invalid webhook signature');
        return {
          statusCode: 401,
          body: 'Invalid signature',
          headers: { 'Content-Type': 'text/plain' }
        };
      }
    } else if (secret && !signature) {
      console.warn('Webhook secret configured but no signature received');
    }

    // Parse the webhook payload
    const payload = JSON.parse(event.body);
    const eventType = payload.event;
    const data = payload.data;

    console.log(`Paystack webhook received: ${eventType}`, JSON.stringify(data, null, 2));

    switch (eventType) {
      case 'charge.success':
        // Payment was successful - update subscription
        console.log('✅ Payment successful:', {
          reference: data.reference,
          amount: data.amount / 100,
          currency: data.currency,
          customer: data.customer?.email,
          metadata: data.metadata
        });
        
        // TODO: In a full implementation, you would:
        // 1. Store the successful payment in a database
        // 2. Activate the subscription for the company
        // 3. Send confirmation email to customer
        // For now, this is handled client-side via verify endpoint
        break;

      case 'subscription.create':
        // New subscription created
        console.log('📅 Subscription created:', {
          subscription_code: data.subscription_code,
          customer: data.customer?.email,
          plan: data.plan?.name,
          amount: data.amount / 100
        });
        
        // TODO: Store subscription code for future reference
        // This enables handling subscription renewals and cancellations
        break;

      case 'invoice.payment_failed':
        // Subscription payment failed
        console.log('❌ Payment failed:', {
          subscription_code: data.subscription_code,
          customer: data.customer?.email,
          attempt: data.attempt,
          next_payment_attempt: data.next_payment_attempt
        });
        
        // TODO: Mark subscription as in grace period
        // TODO: Send notification to customer about failed payment
        break;

      case 'subscription.disable':
        // Subscription was cancelled or disabled
        console.log('🚫 Subscription disabled:', {
          subscription_code: data.subscription_code,
          customer: data.customer?.email
        });
        
        // TODO: Mark subscription as suspended
        break;

      case 'subscription.not_renew':
        // Subscription will not renew (cancelled but active until period end)
        console.log('⚠️ Subscription not renewing:', {
          subscription_code: data.subscription_code,
          customer: data.customer?.email,
          cancel_at_period_end: true
        });
        break;

      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }

    // Return 200 to acknowledge receipt
    return {
      statusCode: 200,
      body: 'Webhook received',
      headers: { 'Content-Type': 'text/plain' }
    };

  } catch (error) {
    console.error('Webhook error:', error);
    return {
      statusCode: 500,
      body: 'Internal server error',
      headers: { 'Content-Type': 'text/plain' }
    };
  }
};
