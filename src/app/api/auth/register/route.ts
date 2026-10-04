import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { username, password, email, team_name } = await request.json();
    
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password required' },
        { status: 400 }
      );
    }

    const supabase = createServerComponentClient({ cookies });

    //hash password
    const password_hash = await bcrypt.hash(password, 10);

    //create user
    const { data, error } = await supabase
      .from('users')
      .insert({
        username,
        password_hash,
        email,
        team_name,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    //create score entry
    await supabase
      .from('scores')
      .insert({
        user_id: data.id,
      });

    return NextResponse.json(
      { message: 'User registered successfully', user: data },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    );
  }
}
