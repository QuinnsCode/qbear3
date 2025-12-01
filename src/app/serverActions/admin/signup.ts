// @/app/serverActions/admin/signup.ts
"use server";

import { requestInfo } from "rwsdk/worker";
import { db } from "@/db";
import { initializeServices } from "@/lib/middlewareFunctions";
import { initAuth } from "@/lib/auth";

function getRedirectUrl(slug: string, request: Request): string {
  const url = new URL(request.url);
  const hostname = url.hostname;
  const protocol = url.protocol;
  
  // Local development (localhost)
  if (hostname.includes('localhost')) {
    const port = url.port || '5173';
    return `${protocol}//${slug}.localhost:${port}/sanctum`;
  }
  
  // Wrangler dev (workers.dev)
  if (hostname.includes('workers.dev')) {
    const workerDomain = hostname.split('.').slice(-3).join('.');
    return `${protocol}//${slug}.${workerDomain}/sanctum`;
  }
  
  // Production (qntbr.com)
  return `${protocol}//${slug}.qntbr.com/sanctum`;
}

// Helper function to check availability (can be called before signup)
export async function checkUsernameAvailability(username: string) {
    try {
        await initializeServices();

        // Validate format
        if (!/^[a-z0-9][a-z0-9\-]*[a-z0-9]$/.test(username)) {
        return {
            available: false,
            error: 'Invalid format'
        };
        }

        if (username.length < 3 || username.length > 32) {
        return {
            available: false,
            error: 'Must be 3-32 characters'
        };
        }

        // Check reserved words
        const reserved = [
        'www', 'api', 'admin', 'app', 'mail', 'ftp', 'localhost', 
        'staging', 'dev', 'test', 'demo', 'blog', 'docs', 'support',
        'help', 'status', 'about', 'contact', 'legal', 'privacy',
        'terms', 'signup', 'signin', 'login', 'logout', 'register'
        ];

        if (reserved.includes(username)) {
        return {
            available: false,
            error: 'Reserved username'
        };
        }

        // Check if taken
        const existingOrg = await db.organization.findUnique({
        where: { slug: username }
        });

        return {
        available: !existingOrg,
        username
        };

    } catch (error) {
        console.error('Error checking username:', error);
        return {
        available: false,
        error: 'Error checking availability'
        };
    }
}

export async function signupWithOrg(formData: FormData) {
  try {
    // Initialize services first
    await initializeServices();
    
    const { request } = requestInfo;
    
    const username = formData.get('username') as string;
    const displayName = formData.get('displayName') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const lairName = formData.get('lairName') as string;

    // Validate inputs
    if (!username || !displayName || !email || !password || !lairName) {
      throw new Error('All fields are required');
    }

    // Validate username format (will be subdomain)
    if (!/^[a-z0-9][a-z0-9\-]*[a-z0-9]$/.test(username)) {
      throw new Error('Username can only contain lowercase letters, numbers, and hyphens (not at start/end)');
    }

    if (username.length < 3) {
      throw new Error('Username must be at least 3 characters');
    }

    // Validate password
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    console.log('🔐 Starting signup for username:', username);

    // Check if username/slug is already taken
    const existingOrg = await db.organization.findUnique({
      where: { slug: username }
    });

    if (existingOrg) {
      throw new Error('Username is not available');
    }

    // Check if email is already registered
    const existingUser = await db.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new Error('Email is already registered');
    }

    // 1. Create user with BetterAuth
    console.log('👤 Creating user with BetterAuth...');
    const authInstance = initAuth();
    
    const signUpResult = await authInstance.api.signUpEmail({
      body: {
        email,
        password,
        name: displayName,
      },
      headers: request.headers
    });

    if (!signUpResult || !signUpResult.user) {
      throw new Error('Failed to create user account');
    }

    const userId = signUpResult.user.id;
    console.log('✅ User created:', userId);

    // 2. Create their personal organization
    console.log('🏰 Creating personal organization...');
    const org = await db.organization.create({
      data: {
        id: crypto.randomUUID(),
        name: lairName, // Use custom lair name from form
        slug: username,
        metadata: JSON.stringify({ isPersonal: true }),
        createdAt: new Date()
      }
    });

    console.log('✅ Organization created:', org.id);

    // 3. Add user as owner of the org
    await db.member.create({
      data: {
        id: crypto.randomUUID(),
        userId: userId,
        organizationId: org.id,
        role: 'owner',
        createdAt: new Date()
      }
    });

    console.log('✅ User added as owner to org');

    // Get the appropriate redirect URL based on environment
    const redirectUrl = getRedirectUrl(username, request);
    console.log('🔗 Redirect URL:', redirectUrl);

    // Return success with redirect URL and session info
    return {
      success: true,
      redirectUrl: redirectUrl,
      user: {
        id: userId,
        email: signUpResult.user.email,
        name: signUpResult.user.name,
      },
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug
      },
      session: signUpResult.session // Pass session for client to use
    };

  } catch (error) {
    console.error('❌ Signup error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create account'
    };
  }
}
