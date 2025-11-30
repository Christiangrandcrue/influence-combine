// Authentication routes for Influence Combine

import { Hono } from 'hono';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import type { Bindings, Variables, User } from '../types';
import { createToken, verifyToken } from '../lib/utils';
import { createAuthCode, verifyAuthCode, createSession, getSession, deleteSession, createUser, getUserByEmail, getUserById } from '../lib/db';

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Request auth code (passwordless login)
auth.post('/request-code', async (c) => {
  try {
    const { email } = await c.req.json<{ email: string }>();
    
    if (!email || !email.includes('@')) {
      return c.json({ success: false, error: 'Неверный email' }, 400);
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    const code = await createAuthCode(c.env.DB, normalizedEmail);
    
    // In production, send email via SendGrid
    // For now, log the code (dev mode)
    console.log(`Auth code for ${normalizedEmail}: ${code}`);
    
    // TODO: Integrate SendGrid
    // if (c.env.SENDGRID_API_KEY) {
    //   await sendEmail(c.env.SENDGRID_API_KEY, normalizedEmail, code);
    // }
    
    return c.json({ 
      success: true, 
      message: 'Код отправлен на email',
      // DEV ONLY: Remove in production!
      dev_code: code
    });
  } catch (error) {
    console.error('Request code error:', error);
    return c.json({ success: false, error: 'Ошибка сервера' }, 500);
  }
});

// Verify code and login
auth.post('/verify-code', async (c) => {
  try {
    const { email, code } = await c.req.json<{ email: string; code: string }>();
    
    if (!email || !code) {
      return c.json({ success: false, error: 'Email и код обязательны' }, 400);
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    const isValid = await verifyAuthCode(c.env.DB, normalizedEmail, code);
    
    if (!isValid) {
      return c.json({ success: false, error: 'Неверный или истёкший код' }, 401);
    }
    
    // Get or create user
    let user = await getUserByEmail(c.env.DB, normalizedEmail);
    if (!user) {
      user = await createUser(c.env.DB, normalizedEmail);
    }
    
    // Create session
    const sessionId = await createSession(c.env.DB, user.id);
    
    // Create JWT token
    const secret = c.env.JWT_SECRET || 'dev-secret-change-in-production';
    const token = await createToken({ userId: user.id, sessionId }, secret, 30 * 24 * 60 * 60); // 30 days
    
    // Set cookie
    setCookie(c, 'auth_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    });
    
    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        onboarding_completed: !!user.onboarding_completed_at
      },
      token
    });
  } catch (error) {
    console.error('Verify code error:', error);
    return c.json({ success: false, error: 'Ошибка сервера' }, 500);
  }
});

// Get current user
auth.get('/me', async (c) => {
  try {
    const token = getCookie(c, 'auth_token');
    
    if (!token) {
      return c.json({ success: false, error: 'Не авторизован' }, 401);
    }
    
    const secret = c.env.JWT_SECRET || 'dev-secret-change-in-production';
    const payload = await verifyToken(token, secret);
    
    if (!payload || !payload.userId) {
      return c.json({ success: false, error: 'Невалидный токен' }, 401);
    }
    
    // Verify session is still valid
    const session = await getSession(c.env.DB, payload.sessionId as string);
    if (!session) {
      return c.json({ success: false, error: 'Сессия истекла' }, 401);
    }
    
    const user = await getUserById(c.env.DB, payload.userId as string);
    
    if (!user) {
      return c.json({ success: false, error: 'Пользователь не найден' }, 404);
    }
    
    return c.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
        plan: user.plan,
        niche: user.niche,
        target_audience: user.target_audience,
        content_style: user.content_style,
        expertise: user.expertise,
        goals: user.goals,
        analyses_used: user.analyses_used,
        analyses_limit: user.analyses_limit,
        ideas_used: user.ideas_used,
        ideas_limit: user.ideas_limit,
        onboarding_completed: !!user.onboarding_completed_at
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    return c.json({ success: false, error: 'Ошибка сервера' }, 500);
  }
});

// Logout
auth.post('/logout', async (c) => {
  try {
    const token = getCookie(c, 'auth_token');
    
    if (token) {
      const secret = c.env.JWT_SECRET || 'dev-secret-change-in-production';
      const payload = await verifyToken(token, secret);
      
      if (payload?.sessionId) {
        await deleteSession(c.env.DB, payload.sessionId as string);
      }
    }
    
    deleteCookie(c, 'auth_token', { path: '/' });
    
    return c.json({ success: true, message: 'Выход выполнен' });
  } catch (error) {
    console.error('Logout error:', error);
    return c.json({ success: false, error: 'Ошибка сервера' }, 500);
  }
});

export default auth;
