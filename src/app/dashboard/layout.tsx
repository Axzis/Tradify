'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAuth, signOut } from 'firebase/auth';
import { useUser } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import {
  LayoutGrid,
  Activity,
  PlusCircle,
  Settings,
  LogOut,
} from 'lucide-react';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import Logo from '@/components/logo';
import { useToast } from '@/hooks/use-toast';

const navItems = [
  { href: '/dashboard', icon: LayoutGrid, label: 'Dashboard' },
  { href: '/dashboard/trade-history', icon: Activity, label: 'Riwayat Trade' },
  { href: '/dashboard/new-trade', icon: PlusCircle, label: 'Tambah Trade Baru' },
  { href: '/dashboard/settings', icon: Settings, label: 'Pengaturan' },
];

function MainSidebar() {
  const { state } = useSidebar();
  return (
    <Sidebar>
      <SidebarHeader>
        <Logo iconOnly={state === 'collapsed'} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <Button asChild variant="ghost" className="w-full justify-start">
                <Link href={item.href}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { toast } = useToast();
  const auth = getAuth();
  const { user } = useUser();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Logout Gagal',
        description: error.message,
      });
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen">
        <MainSidebar />
        <SidebarInset>
          <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
            <SidebarTrigger className="md:hidden" />
            <div className="w-full flex-1">
              <span className="font-semibold">Selamat Datang!</span>
              {user && (
                <p className="text-xs text-muted-foreground">
                  UserID: {user.uid}
                </p>
              )}
            </div>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </header>
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
