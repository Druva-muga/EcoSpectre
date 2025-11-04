// Environment configuration
// For production, use environment variables or SecureStore (via Settings screen)
export const ENV = {
  // Fallback only - should be set via SecureStore in Settings or environment
  GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
};