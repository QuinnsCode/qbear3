// @/app/api/main/check-username.ts
import { db } from "@/db";

export default async function handler({ request }: { request: Request }) {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const url = new URL(request.url);
  const username = url.searchParams.get('username');

  if (!username) {
    return new Response(JSON.stringify({ 
      available: false, 
      error: 'Username is required' 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Validate username format
  if (username.length < 3) {
    return new Response(JSON.stringify({ 
      available: false, 
      error: 'Username must be at least 3 characters' 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (username.length > 32) {
    return new Response(JSON.stringify({ 
      available: false, 
      error: 'Username must be 32 characters or less' 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(username)) {
    return new Response(JSON.stringify({ 
      available: false, 
      error: 'Username can only contain lowercase letters, numbers, and hyphens (not at start/end)' 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Check if username is reserved
  const reserved = [
    'www', 'api', 'admin', 'app', 'mail', 'ftp', 'localhost', 
    'staging', 'dev', 'test', 'demo', 'blog', 'docs', 'support',
    'help', 'status', 'about', 'contact', 'legal', 'privacy',
    'terms', 'signup', 'signin', 'login', 'logout', 'register'
  ];

  if (reserved.includes(username)) {
    return new Response(JSON.stringify({ 
      available: false, 
      error: 'This username is reserved' 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // Check if username exists in users table
    const existingUser = await db.user.findFirst({
      where: { username },
      select: { id: true }
    });

    // Also check if it's taken as an organization slug
    const existingOrg = await db.organization.findFirst({
      where: { slug: username },
      select: { id: true }
    });

    const available = !existingUser && !existingOrg;

    return new Response(JSON.stringify({ 
      available,
      username 
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error checking username:', error);
    return new Response(JSON.stringify({ 
      available: false,
      error: 'Error checking username availability' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}