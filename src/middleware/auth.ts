// Authentication middleware for Influence Combine

import { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';
import type { Bindings, Variables, User } from '../types';
import { verifyToken } from '../lib/utils';
import { getSession, getUserById } from '../lib/db';

/**
 * Auth middleware - requires authentication
 */
export async function authMiddleware(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  next: Next
) {
  try {
    const token = getCookie(c, 'auth_token') || c.req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }
    
    const secret = c.env.JWT_SECRET || 'dev-secret-change-in-production';
    const payload = await verifyToken(token, secret);
    
    if (!payload || !payload.userId) {
      return c.json({ success: false, error: 'Невалидный токен' }, 401);
    }
    
    // Verify session
    const session = await getSession(c.env.DB, payload.sessionId as string);
    if (!session) {
      return c.json({ success: false, error: 'Сессия истекла' }, 401);
    }
    
    // Get user
    const user = await getUserById(c.env.DB, payload.userId as string);
    if (!user) {
      return c.json({ success: false, error: 'Пользователь не найден' }, 404);
    }
    
    // Set user in context
    c.set('user', user);
    c.set('session_id', payload.sessionId as string);
    
    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json({ success: false, error: 'Ошибка авторизации' }, 401);
  }
}

/**
 * Optional auth middleware - doesn't require authentication but sets user if available
 */
export async function optionalAuthMiddleware(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  next: Next
) {
  try {
    const token = getCookie(c, 'auth_token') || c.req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const secret = c.env.JWT_SECRET || 'dev-secret-change-in-production';
      const payload = await verifyToken(token, secret);
      
      if (payload?.userId) {
        const session = await getSession(c.env.DB, payload.sessionId as string);
        if (session) {
          const user = await getUserById(c.env.DB, payload.userId as string);
          if (user) {
            c.set('user', user);
            c.set('session_id', payload.sessionId as string);
          }
        }
      }
    }
    
    await next();
  } catch (error) {
    // Silently fail for optional auth
    await next();
  }
}

/**
 * Plan check middleware - requires specific plan
 */
export function requirePlan(plans: ('free' | 'pro' | 'team')[]) {
  return async (
    c: Context<{ Bindings: Bindings; Variables: Variables }>,
    next: Next
  ) => {
    const user = c.get('user');
    
    if (!user) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }
    
    if (!plans.includes(user.plan)) {
      return c.json({ 
        success: false, 
        error: 'Для этой функции требуется подписка',
        required_plans: plans,
        current_plan: user.plan
      }, 403);
    }
    
    await next();
  };
}

/**
 * Onboarding check middleware - requires completed onboarding
 */
export async function requireOnboarding(
  c: Context<{ Bindings: Bindings; Variables: Variables }>,
  next: Next
) {
  const user = c.get('user');
  
  if (!user) {
    return c.json({ success: false, error: 'Не авторизован' }, 401);
  }
  
  if (!user.onboarding_completed_at) {
    return c.json({ 
      success: false, 
      error: 'Необходимо завершить онбординг',
      redirect: '/onboarding'
    }, 403);
  }
  
  await next();
}
