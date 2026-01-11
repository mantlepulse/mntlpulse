/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse and DDoS attacks
 */

import rateLimit from 'express-rate-limit';
import { config } from '../config/env';

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: 'Too many requests from this IP, please try again later.',
  },
  skip: (req) => {
    // Skip rate limiting in development if needed
    return config.server.isDevelopment && process.env.SKIP_RATE_LIMIT === 'true';
  },
});

/**
 * Strict rate limiter for sensitive operations
 * 20 requests per 15 minutes per IP
 * Use for: shift creation, preference updates
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please wait before trying again.',
  },
  skip: (req) => {
    return config.server.isDevelopment && process.env.SKIP_RATE_LIMIT === 'true';
  },
});

/**
 * Very strict rate limiter for resource-intensive operations
 * 5 requests per 15 minutes per IP
 * Use for: contract interactions, blockchain queries
 */
export const veryStrictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Rate limit exceeded. This operation is limited to 5 requests per 15 minutes.',
  },
  skip: (req) => {
    return config.server.isDevelopment && process.env.SKIP_RATE_LIMIT === 'true';
  },
});

/**
 * Webhook rate limiter
 * Allows more requests since webhooks come from trusted sources
 * 500 requests per 15 minutes per IP
 */
export const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Higher limit for webhooks
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Webhook rate limit exceeded.',
  },
  skip: (req) => {
    return config.server.isDevelopment && process.env.SKIP_RATE_LIMIT === 'true';
  },
});

/**
 * Auth rate limiter for login/signup attempts
 * Prevents brute force attacks
 * 5 requests per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skipSuccessfulRequests: true, // Don't count successful requests
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts. Please try again later.',
  },
});
