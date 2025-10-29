'use client';

import { useUser } from '@/firebase/provider';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import LoginPage from '@/app/login/page';
import DashboardPage from '@/app/dashboard/page';

const publicPaths = ['/', '/login', '/register'];

/**
 * A component that gates content based on authentication status.
 * It handles rendering the correct component based on auth state
 * to avoid race conditions with redirects.
 */
export default function AuthStateGate({ children }: { children: ReactNode }) {
  const { user, isUserLoading } = useUser();
  const pathname = usePathname();

  const isPublic = publicPaths.includes(pathname);
  const isDashboard = pathname.startsWith('/dashboard');

  // While checking auth status, show a loader
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If user is logged in...
  if (user) {
    // ...but is on a public page, render the dashboard directly
    // This avoids a redirect race condition.
    if (isPublic) {
      return <DashboardPage />;
    }
    // ...and is on a dashboard page, show the content.
    return <>{children}</>;
  }

  // If user is NOT logged in...
  if (!user) {
    // ...and is trying to access a protected dashboard page,
    // render the login page directly.
    if (isDashboard) {
      return <LoginPage />;
    }
    // ...and is on a public page, show the content.
    return <>{children}</>;
  }

  // Fallback to showing a loader as a safe default
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}
