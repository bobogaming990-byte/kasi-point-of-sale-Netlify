/**
 * Vercel Serverless Function: Verify Paystack Payment
 * 
 * Endpoint: /api/paystack-verify
 * Method: POST
 * 
 * Body: { reference: string }
 * Response: { verified: boolean, status: string, data: object }
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
    const { reference, company_id } = req.body;

    if (!reference) {
      return res.status(400).json({ error: 'Missing required field: reference' });
    }

    // Handle demo references
    if (reference.startsWith('DEMO_')) {
      return res.status(200).json({
        verified: true,
        status: 'active',
        demo: true,
        message: 'Demo payment verified'
      });
    }

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      console.error('PAYSTACK_SECRET_KEY not configured');
      return res.status(500).json({ error: 'Paystack not configured' });
    }

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
      return res.status(200).json({
        verified: false,
        status: 'failed',
        message: paystackData.message || 'Payment verification failed'
      });
    }

    const transaction = paystackData.data;

    if (transaction.status === 'success') {
      return res.status(200).json({
        verified: true,
        status: 'active',
        data: {
          reference: transaction.reference,
          amount: transaction.amount / 100,
          currency: transaction.currency,
          paid_at: transaction.paid_at,
          channel: transaction.channel,
          metadata: transaction.metadata
        }
      });
    } else {
      return res.status(200).json({
        verified: false,
        status: transaction.status,
        message: `Payment status: ${transaction.status}`
      });
    }

  } catch (error) {
    console.error('Paystack verify error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
