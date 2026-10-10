import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { signJWT } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Query user from Supabase
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, password_hash, email, team_name, is_admin')
      .eq('username', username.trim())
      .single();

    if (!user || error) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Create JWT
    const token = await signJWT({
      sub: user.id,
      username: user.username,
      team_name: user.team_name,
      is_admin: user.is_admin,
    });

    const userSafe = {
      id: user.id,
      username: user.username,
      email: user.email,
      team_name: user.team_name,
      is_admin: user.is_admin,
    };

    const response = NextResponse.json(
      { message: 'Login successful', user: userSafe },
      { status: 200 }
    );

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error during login' },
      { status: 500 }
    );
  }
}
