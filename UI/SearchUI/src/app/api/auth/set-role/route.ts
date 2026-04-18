import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { setUserRole, type UserRole } from '@/models/User';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { role } = body as { role: UserRole };

    if (!role || !['user', 'recruiter'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "user" or "recruiter".' },
        { status: 400 }
      );
    }

    const updated = await setUserRole(session.user.email, role);
    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update role' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, role });
  } catch (error) {
    console.error('Set role error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
