require('dotenv').config();

const testCashfree = async () => {
  console.log('Testing Cashfree API...\n');
  console.log('Credentials:');
  console.log('- APP_ID:', process.env.CASHFREE_APP_ID?.substring(0, 10) + '...');
  console.log('- SECRET:', process.env.CASHFREE_SECRET_KEY?.substring(0, 10) + '...');
  console.log('- ENV:', process.env.CASHFREE_ENVIRONMENT);

  const CF_API_URL = process.env.CASHFREE_ENVIRONMENT === 'PRODUCTION'
    ? 'https://api.cashfree.com'
    : 'https://sandbox.cashfree.com';

  const orderId = `TEST_${Date.now()}`;
  const amount = 100;

  console.log('\nCreating order:', { orderId, amount });
  console.log('API URL:', CF_API_URL + '/pg/orders\n');

  try {
    const response = await fetch(`${CF_API_URL}/pg/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': process.env.CASHFREE_APP_ID,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY,
      },
      body: JSON.stringify({
        order_id: orderId,
        order_amount: amount,
        order_currency: 'INR',
        customer_details: {
          customer_id: 'TEST_VENDOR',
          customer_email: 'test@example.com',
          customer_phone: '9999999999',
          customer_name: 'Test Vendor',
        },
      }),
    });

    const data = await response.json();

    console.log('Response Status:', response.status);
    console.log('\nFull Response:');
    console.log(JSON.stringify(data, null, 2));

    console.log('\nExtractable fields:');
    console.log('- payment_link:', data.payment_link || 'NOT FOUND');
    console.log('- payment_session_id:', data.payment_session_id || 'NOT FOUND');
    console.log('- session_id:', data.session_id || 'NOT FOUND');
    console.log('- order_meta:', data.order_meta ? JSON.stringify(data.order_meta) : 'NOT FOUND');

  } catch (error) {
    console.error('Error:', error.message);
  }
};

testCashfree();
