/**
 * Validate that all required environment variables are set
 * Fail fast if critical env vars are missing to prevent silent failures
 */
export const validateEnv = () => {
  const requiredVars = ['JWT_SECRET', 'MONGO_URI'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      `Please set these in your .env file or environment.`
    );
  }

  // Validate JWT_SECRET is not the default/weak value
  if (process.env.JWT_SECRET === 'secret' || process.env.JWT_SECRET.length < 32) {
    throw new Error(
      'JWT_SECRET is weak or using default value. ' +
      'Please set a strong JWT_SECRET (min 32 characters) in your .env file.'
    );
  }

  console.log('✓ Environment variables validated successfully');
};
