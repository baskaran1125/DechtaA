// src/routes/auth.js
const { sendOtpHandler, verifyOtpHandler, refreshTokenHandler } = require('../controllers/authController');

async function authRoutes(fastify, options) {

  // POST /api/auth/send-otp
  fastify.post('/send-otp', {
    schema: {
      body: {
        type: 'object',
        required: ['mobile'],
        properties: {
          // STEP 3 — Backend: enforce 10 digits, starting with 6-9 (Indian mobile)
          mobile: {
            type: 'string',
            minLength: 10,
            maxLength: 10,
            pattern: '^[6-9][0-9]{9}$',
          },
        },
      },
    },
    // Custom error message for pattern failure
    attachValidation: true,
    handler: async (request, reply) => {
      if (request.validationError) {
        return reply.code(400).send({
          success: false,
          message: 'Invalid mobile number. Must be a 10-digit Indian number starting with 6, 7, 8, or 9.',
        });
      }
      return sendOtpHandler(request, reply);
    },
  });

  // POST /api/auth/verify-otp
  fastify.post('/verify-otp', {
    schema: {
      body: {
        type: 'object',
        required: ['mobile', 'otp'],
        properties: {
          mobile: {
            type: 'string',
            minLength: 10,
            maxLength: 10,
            pattern: '^[6-9][0-9]{9}$',
          },
          // STEP 3 — OTP must be exactly 4 digits
          otp: {
            type: 'string',
            minLength: 4,
            maxLength: 4,
            pattern: '^[0-9]{4}$',
          },
        },
      },
    },
    attachValidation: true,
    handler: async (request, reply) => {
      if (request.validationError) {
        const { mobile, otp } = request.body || {};
        request.log.error({
          validationError: request.validationError.message,
          received: { mobile, otp },
          mobileLength: mobile?.length,
          otpLength: otp?.length,
        });
        return reply.code(400).send({
          success: false,
          message: `Invalid input: ${request.validationError.message}. Mobile: 10 digits (6-9), OTP: exactly 4 digits.`,
        });
      }
      return verifyOtpHandler(request, reply);
    },
  });

  // POST /api/auth/refresh — requires valid token
  fastify.post('/refresh', { handler: refreshTokenHandler });
}

module.exports = authRoutes;