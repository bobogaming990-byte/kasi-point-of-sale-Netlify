/**
 * Vercel Serverless Function: Initialize Paystack Payment
 * 
 * Endpoint: /api/paystack-initialize
 * Method: POST
 * 
 * Body: { email: string, company_id: string }
 * Response: { authorization_url: string, reference: string, access_code: string }
 */

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, company_id } = req.body;

    if (!email || !company_id) {
      return res.status(400).json({ error: 'Missing required fields: email, company_id' });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      console.error('PAYSTACK_SECRET_KEY not configured');
      return res.status(200).json({
        demo: true,
        reference: 'DEMO_' + Date.now(),
        message: 'Paystack not configured - demo mode available'
      });
    }

    const PLAN_PRICE_ZAR = 55;
    const amountInCents = PLAN_PRICE_ZAR * 100;

    const callbackUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.APP_BASE_URL || 'https://kasi-point-of-sale.vercel.app';

    const paystackResponse = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email || 'customer@kasi-pos.app',
        amount: amountInCents,
        currency: 'ZAR',
        callback_url: `${callbackUrl}/subscription?reference=`,
        metadata: {
          company_id,
          plan: 'monthly',
          custom_fields: [
            {
              display_name: 'Company ID',
              variable_name: 'company_id',
              value: company_id
            }
          ]
        }
      })
    });

    const paystackData = await paystackResponse.json();

    if (!paystackResponse.ok || !paystackData.status) {
      console.error('Paystack initialize error:', paystackData);
      return res.status(500).json({
        error: paystackData.message || 'Failed to initialize payment'
      });
    }

    return res.status(200).json({
      authorization_url: paystackData.data.authorization_url,
      reference: paystackData.data.reference,
      access_code: paystackData.data.access_code
    });

  } catch (error) {
    console.error('Paystack initialize error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
