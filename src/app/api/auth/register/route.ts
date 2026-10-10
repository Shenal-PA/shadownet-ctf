import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabase } from '@/lib/supabase';
import { signJWT } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password, email, team_name } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    if (username.trim().length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('username', username.trim())
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      );
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user in Supabase
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        username: username.trim(),
        password_hash,
        email: email ? email.trim() : null,
        team_name: team_name ? team_name.trim() : null,
        is_admin: false,
      })
      .select('id, username, email, team_name, is_admin')
      .single();

    if (userError || !newUser) {
      console.error('Registration error:', userError);
      return NextResponse.json(
        { error: 'Registration failed. Please try again.' },
        { status: 500 }
      );
    }

    // Initialize score entry for user
    await supabase.from('scores').insert({
      user_id: newUser.id,
      total_points: 0,
      challenges_solved: 0,
    });

    // Generate JWT token
    const token = await signJWT({
      sub: newUser.id,
      username: newUser.username,
      team_name: newUser.team_name,
      is_admin: newUser.is_admin,
    });

    const response = NextResponse.json(
      { message: 'Registration successful', user: newUser },
      { status: 201 }
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
    console.error('Registration server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
