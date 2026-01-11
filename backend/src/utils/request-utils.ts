/**
 * Request utility functions
 */

import { Request } from 'express';

/**
 * Extract the real IP address from a request
 * Handles proxies, load balancers, and direct connections
 */
export function getUserIp(req: Request): string {
  // Check standard forwarding headers (in order of preference)
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, get the first (original client)
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    const ip = ips.split(',')[0].trim();
    if (ip) return ip;
  }

  // Check for Cloudflare's connecting IP
  const cfConnectingIp = req.headers['cf-connecting-ip'];
  if (cfConnectingIp) {
    const ip = Array.isArray(cfConnectingIp) ? cfConnectingIp[0] : cfConnectingIp;
    if (ip) return ip;
  }

  // Check for real IP header (used by some proxies)
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    const ip = Array.isArray(realIp) ? realIp[0] : realIp;
    if (ip) return ip;
  }

  // Fallback to connection remote address
  const remoteAddress = req.socket.remoteAddress;
  if (remoteAddress) {
    // Handle IPv6 localhost (::1) and IPv4-mapped IPv6 (::ffff:127.0.0.1)
    if (remoteAddress === '::1' || remoteAddress === '::ffff:127.0.0.1') {
      // Use a non-US IP for local testing (UK IP example)
      return '8.8.8.8'; // Google DNS - widely accessible
    }
    return remoteAddress;
  }

  // Final fallback if somehow everything is undefined
  return '8.8.8.8';
}
