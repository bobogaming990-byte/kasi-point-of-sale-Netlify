/**
 * Netlify Function: Initialize Paystack Payment
 * 
 * Endpoint: /.netlify/functions/paystack-initialize
 * Method: POST
 * 
 * Body: { email: string, company_id: string }
 * Response: { authorization_url: string, reference: string, access_code: string }
 */

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
      headers: { 'Access-Control-Allow-Origin': '*' }
    };
  }

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const body = JSON.parse(event.body);
    const { email, company_id } = body;

    // Validate required fields
    if (!email || !company_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: email, company_id' }),
        headers
      };
    }

    // Get Paystack secret key from environment
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      console.error('PAYSTACK_SECRET_KEY not configured');
      
      // Return demo mode for local testing (admin can bypass)
      return {
        statusCode: 200,
        body: JSON.stringify({
          demo: true,
          reference: 'DEMO_' + Date.now(),
          message: 'Paystack not configured - demo mode available'
        }),
        headers
      };
    }

    const PLAN_PRICE_ZAR = 55; // R55 per month
    const amountInCents = PLAN_PRICE_ZAR * 100; // Paystack expects amount in cents

    // Build callback URL
    const callbackUrl = process.env.URL || process.env.DEPLOY_URL || 'https://kasi-point-of-sale.netlify.app';
    
    // Initialize Paystack transaction
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
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: paystackData.message || 'Failed to initialize payment' 
        }),
        headers
      };
    }

    // Return authorization URL to frontend
    return {
      statusCode: 200,
      body: JSON.stringify({
        authorization_url: paystackData.data.authorization_url,
        reference: paystackData.data.reference,
        access_code: paystackData.data.access_code
      }),
      headers
    };

  } catch (error) {
    console.error('Paystack initialize error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
      headers
    };
  }
};
