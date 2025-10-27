'use client';

import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseProvider } from '@/firebase/provider';
import AuthStateGate from '@/components/auth-state-gate';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head/>
      <body className="font-body antialiased">
        <FirebaseProvider>
          <AuthStateGate>{children}</AuthStateGate>
          <Toaster />
        </FirebaseProvider>
      </body>
    </html>
  );
}
