/**
 * Validate that all required environment variables are set
 * Fail fast if critical env vars are missing to prevent silent failures
 * Provides secure defaults for optional variables
 */
export const validateEnv = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  // Required environment variables in ALL environments
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
    'CORS_ORIGIN': { default: 'http://localhost:3000' },
    'SOCKET_IO_CORS_ORIGIN': { default: 'http://localhost:3000' },
    'FRONTEND_URL': { default: 'http://localhost:3000' },
    'JWT_EXPIRES_IN': { default: '30d' },
    'MAPS_PROVIDER': { default: 'osm' },
    'LLM_PROVIDER': { default: 'groq' },
    'LLM_MODEL': { default: 'llama-3.3-70b-versatile' },
    'LLM_ENDPOINT': { default: 'https://api.groq.com/openai/v1' },
    'LOG_LEVEL': { default: 'info' },
    'REDIS_URL': { default: null },
    'SMTP_HOST': { default: 'smtp.gmail.com' },
    'SMTP_PORT': { default: '587' },
    'SMTP_USER': { default: null },
    'SMTP_PASS': { default: null },
    'EMAIL_FROM': { default: null },
    'SENDGRID_API_KEY': { default: null },
    'SENDGRID_FROM_EMAIL': { default: null },
    'MAPBOX_API_KEY': { default: null },
    'GOOGLE_MAPS_API_KEY': { default: null }
  };

  const missingVars = [];
  const invalidVars = [];

  // Validate global required variables
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

  // Apply defaults for optional variables so we can reference them in conditional checks
  Object.entries(optional).forEach(([varName, config]) => {
    if (!process.env[varName] && config.default !== null) {
      process.env[varName] = config.default;
    }
  });

  // Conditional Required Rules:
  
  // 1. SMTP is required only if NODE_ENV=production
  if (process.env.NODE_ENV === 'production') {
    const smtpFields = ['SMTP_USER', 'SMTP_PASS'];
    smtpFields.forEach(field => {
      if (!process.env[field]) {
        missingVars.push(`${field} - Required in production for SMTP email service`);
      }
    });

    if (!process.env.CORS_ORIGIN || process.env.CORS_ORIGIN.includes('localhost')) {
      invalidVars.push('CORS_ORIGIN must be set to production domain in production environment');
    }
    if (!process.env.SOCKET_IO_CORS_ORIGIN || process.env.SOCKET_IO_CORS_ORIGIN.includes('localhost')) {
      invalidVars.push('SOCKET_IO_CORS_ORIGIN must be set to production domain in production environment');
    }
  }

  // 2. LLM_API_KEY is required only if LLM_PROVIDER is openai, anthropic, or groq
  const llmProvider = (process.env.LLM_PROVIDER || '').toLowerCase();
  const requiresLlmKey = ['openai', 'anthropic', 'groq'].includes(llmProvider);
  if (requiresLlmKey && !process.env.LLM_API_KEY) {
    missingVars.push(`LLM_API_KEY - Required when LLM_PROVIDER is '${llmProvider}'`);
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

  // Log environment info
  console.log('\n✅ Environment Validation Successful');
  console.log(`   Node Environment: ${process.env.NODE_ENV}`);
  console.log(`   Server Port: ${process.env.PORT}`);
  console.log(`   CORS Origin: ${process.env.CORS_ORIGIN}`);
  console.log(`   Maps Provider: ${process.env.MAPS_PROVIDER}`);
  console.log(`   LLM Provider: ${process.env.LLM_PROVIDER}`);
  if (process.env.SMTP_USER) {
    console.log(`   Email Service: SMTP configured (${process.env.SMTP_HOST})`);
  } else {
    console.log(`   Email Service: SMTP credentials not set (Development console mode)`);
  }
  if (process.env.REDIS_URL) {
    console.log(`   Cache: Redis configured`);
  }
  console.log('');
};
