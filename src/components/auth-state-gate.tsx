'use client';

import { useUser } from '@/firebase/provider';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

const publicPaths = ['/', '/login', '/register'];

export default function AuthStateGate({ children }: { children: ReactNode }) {
  const { user, loading } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const isPublicPath = publicPaths.includes(pathname);
    const isDashboardPath = pathname.startsWith('/dashboard');

    if (user && isPublicPath) {
      // User is logged in but on a public page, redirect to dashboard
      router.push('/dashboard');
    } else if (!user && isDashboardPath) {
      // User is not logged in but trying to access a protected page, redirect to login
      router.push('/login');
    }
  }, [user, loading, pathname, router]);

  // While loading, or if a redirect is imminent, show nothing to prevent flicker.
  const isPublicPath = publicPaths.includes(pathname);
  const isDashboardPath = pathname.startsWith('/dashboard');

  if (loading || (user && isPublicPath) || (!user && isDashboardPath)) {
    return null;
  }
  
  return <>{children}</>;
}
