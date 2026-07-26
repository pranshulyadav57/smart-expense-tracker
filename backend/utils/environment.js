// =========================
// ENVIRONMENT VALIDATION
// =========================

/**
 * Required environment variables for production
 */
const REQUIRED_ENV_VARS = [
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET',
  'REFRESH_TOKEN_SECRET'
];

/**
 * Optional environment variables with defaults
 */
const OPTIONAL_ENV_VARS = {
  'PORT': '5000',
  'NODE_ENV': 'development',
  'CLIENT_URL': 'http://localhost:3000',
  'LOG_LEVEL': 'info',
  'JWT_EXPIRY': '7d',
  'REFRESH_TOKEN_EXPIRY': '30d'
  ,'NOTIFICATION_PROVIDER': 'console'
};

/**
 * Validate all required environment variables
 * @returns {Object} Validation result {valid: boolean, errors: string[]}
 */
const validateEnvironment = () => {
  const errors = [];

  // Check required variables
  REQUIRED_ENV_VARS.forEach(varName => {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  });

  // Check optional variables and set defaults
  Object.entries(OPTIONAL_ENV_VARS).forEach(([varName, defaultValue]) => {
    if (!process.env[varName]) {
      process.env[varName] = defaultValue;
      console.warn(`⚠️  ${varName} not set, using default: ${defaultValue}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Throw error and exit if validation fails
 */
const requireValidEnvironment = () => {
  const validation = validateEnvironment();
  
  if (!validation.valid) {
    console.error('🔥 Environment Validation Failed:');
    validation.errors.forEach(error => {
      console.error(`  - ${error}`);
    });
    process.exit(1);
  }

  console.log('✅ Environment validation passed');
};

/**
 * Get all env config
 */
const getConfig = () => {
  return {
    port: process.env.PORT || '5000',
    database: {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      name: process.env.DB_NAME
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRY || '7d'
    },
    nodeEnv: process.env.NODE_ENV,
    clientUrl: process.env.CLIENT_URL,
    logLevel: process.env.LOG_LEVEL,
    notificationProvider: process.env.NOTIFICATION_PROVIDER || 'console'
  };
};

module.exports = {
  validateEnvironment,
  requireValidEnvironment,
  getConfig,
  REQUIRED_ENV_VARS,
  OPTIONAL_ENV_VARS
};
