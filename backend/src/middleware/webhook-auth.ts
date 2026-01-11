/**
 * Webhook authentication middleware
 * Verifies webhook requests are from Sideshift
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../config/env';
import crypto from 'crypto';

export const webhookAuth = (req: Request, res: Response, next: NextFunction) => {
  const signature = req.headers['x-sideshift-signature'] as string;

  if (!signature) {
    return res.status(401).json({ error: 'Missing signature' });
  }

  // Verify signature
  const payload = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', config.security.webhookSecret)
    .update(payload)
    .digest('hex');

  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  next();
};
