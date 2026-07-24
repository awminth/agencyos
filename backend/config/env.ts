import dotenv from 'dotenv';

dotenv.config({ override: true, quiet: true });

/** Required env: BACKEND_PORT, FRONTEND_PORT, DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME */
/** Optional Web Push: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto: or https URL) */
export const env = {
  /** Render sets PORT; prefer it in production. */
  backendPort: Number(process.env.PORT || process.env.BACKEND_PORT) || 1012,
  frontendPort: Number(process.env.FRONTEND_PORT) || 1011,
  dbHost: process.env.DB_HOST || 'localhost',
  dbPort: Number(process.env.DB_PORT) || 3306,
  dbUser: process.env.DB_USER || 'root',
  dbPassword: process.env.DB_PASSWORD || '',
  dbName: process.env.DB_NAME || 'mt_agencyos',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  nodeEnv: process.env.NODE_ENV || 'development',
  vapidPublicKey: (process.env.VAPID_PUBLIC_KEY || '').trim(),
  vapidPrivateKey: (process.env.VAPID_PRIVATE_KEY || '').trim(),
  /** Localhost-safe default; override in production with mailto:you@domain.com */
  vapidSubject: (process.env.VAPID_SUBJECT || 'mailto:agencyos@localhost').trim(),
};

export function isWebPushConfigured(): boolean {
  return Boolean(env.vapidPublicKey && env.vapidPrivateKey);
}
