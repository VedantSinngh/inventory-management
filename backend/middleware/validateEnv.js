/**
 * Validate that all required environment variables are set
 * Fail fast if critical env vars are missing to prevent silent failures
 * Provides secure defaults for optional variables
 */
export const validateEnv = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  // Required environment variables
  const required = {
    'JWT_SECRET': {
      minLength: 32,
      description: 'JWT signing secret (min 32 chars)'
    },
    'MONGO_URI': {
      pattern: /^mongodb(\+srv)?:\/\/.+/,
      description: 'MongoDB connection string'
    }
  };

  // Optional environment variables with defaults
  const optional = {
    'NODE_ENV': { default: 'development' },
    'PORT': { default: '5000' },
    'CORS_ORIGIN': { default: 'http://localhost:5173' },
    'SOCKET_IO_CORS_ORIGIN': { default: 'http://localhost:5173' },
    'FRONTEND_URL': { default: 'http://localhost:5173' },
    'SENDGRID_API_KEY': { default: null, production: true }, // Required in production
    'SENDGRID_FROM_EMAIL': { default: null, production: true },
    'LOG_LEVEL': { default: 'info' },
    'REDIS_URL': { default: null }, // Optional for caching
  };

  // Validate required variables
  const missingVars = [];
  const invalidVars = [];

  Object.entries(required).forEach(([varName, config]) => {
    const value = process.env[varName];
    
    if (!value) {
      missingVars.push(`${varName} - ${config.description}`);
      return;
    }

    // Validate minimum length
    if (config.minLength && value.length < config.minLength) {
      invalidVars.push(`${varName} must be at least ${config.minLength} characters`);
    }

    // Validate pattern
    if (config.pattern && !config.pattern.test(value)) {
      invalidVars.push(`${varName} has invalid format`);
    }

    // Prevent weak defaults
    if (varName === 'JWT_SECRET' && (value === 'secret' || value === 'your-secret-key')) {
      invalidVars.push('JWT_SECRET is using a default/weak value');
    }
  });

  // Production-only validations
  if (nodeEnv === 'production') {
    if (!process.env.SENDGRID_API_KEY) {
      invalidVars.push('SENDGRID_API_KEY is required for production (email service)');
    }
    if (!process.env.SENDGRID_FROM_EMAIL) {
      invalidVars.push('SENDGRID_FROM_EMAIL is required for production');
    }
    if (!process.env.CORS_ORIGIN || process.env.CORS_ORIGIN.includes('localhost')) {
      invalidVars.push('CORS_ORIGIN must be set to production domain');
    }
    if (!process.env.SOCKET_IO_CORS_ORIGIN || process.env.SOCKET_IO_CORS_ORIGIN.includes('localhost')) {
      invalidVars.push('SOCKET_IO_CORS_ORIGIN must be set to production domain');
    }
  }

  // Report errors
  if (missingVars.length > 0 || invalidVars.length > 0) {
    let errorMsg = '\n❌ ENVIRONMENT VALIDATION FAILED:\n';
    if (missingVars.length > 0) {
      errorMsg += '\nMissing required variables:\n';
      missingVars.forEach(v => errorMsg += `  • ${v}\n`);
    }
    if (invalidVars.length > 0) {
      errorMsg += '\nInvalid environment variables:\n';
      invalidVars.forEach(v => errorMsg += `  • ${v}\n`);
    }
    errorMsg += '\nPlease configure these variables and try again.\n';
    throw new Error(errorMsg);
  }

  // Set optional defaults
  Object.entries(optional).forEach(([varName, config]) => {
    if (!process.env[varName] && config.default !== null) {
      process.env[varName] = config.default;
    }
  });

  // Log environment info
  console.log('\n✅ Environment Validation Successful');
  console.log(`   Node Environment: ${process.env.NODE_ENV}`);
  console.log(`   Server Port: ${process.env.PORT}`);
  console.log(`   CORS Origin: ${process.env.CORS_ORIGIN}`);
  if (process.env.SENDGRID_API_KEY) {
    console.log(`   Email Service: SendGrid configured`);
  }
  if (process.env.REDIS_URL) {
    console.log(`   Cache: Redis configured`);
  }
  console.log('');
};
