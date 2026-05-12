const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { id: 'f091b987-2936-4665-8bb9-0e4620a87994', role: 'driver' },
  process.env.JWT_SECRET || 'qc-driver-super-secret-change-in-production',
  { expiresIn: '30d' }
);
console.log(token);
