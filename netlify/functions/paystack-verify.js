/**
 * Netlify Function: Verify Paystack Payment
 * 
 * Endpoint: /.netlify/functions/paystack-verify
 * Method: POST
 * 
 * Body: { reference: string }
 * Response: { verified: boolean, status: string, data: object }
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
    const { reference, company_id } = body;

    // Validate required fields
    if (!reference) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required field: reference' }),
        headers
      };
    }

    // Handle demo references (for local testing without Paystack configured)
    if (reference.startsWith('DEMO_')) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          verified: true,
          status: 'active',
          demo: true,
          message: 'Demo payment verified'
        }),
        headers
      };
    }

    // Get Paystack secret key from environment
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      console.error('PAYSTACK_SECRET_KEY not configured');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Paystack not configured' }),
        headers
      };
    }

    // Verify transaction with Paystack
    const paystackResponse = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json'
      }
    });

    const paystackData = await paystackResponse.json();

    if (!paystackResponse.ok || !paystackData.status) {
      console.error('Paystack verify error:', paystackData);
      return {
        statusCode: 200,
        body: JSON.stringify({
          verified: false,
          status: 'failed',
          message: paystackData.message || 'Payment verification failed'
        }),
        headers
      };
    }

    const transaction = paystackData.data;

    // Check if payment was successful
    if (transaction.status === 'success') {
      return {
        statusCode: 200,
        body: JSON.stringify({
          verified: true,
          status: 'active',
          data: {
            reference: transaction.reference,
            amount: transaction.amount / 100, // Convert from cents
            currency: transaction.currency,
            paid_at: transaction.paid_at,
            channel: transaction.channel,
            metadata: transaction.metadata
          }
        }),
        headers
      };
    } else {
      // Payment not successful
      return {
        statusCode: 200,
        body: JSON.stringify({
          verified: false,
          status: transaction.status, // 'failed', 'abandoned', 'pending'
          message: `Payment status: ${transaction.status}`
        }),
        headers
      };
    }

  } catch (error) {
    console.error('Paystack verify error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
      headers
    };
  }
};
