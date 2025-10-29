'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getAuth, signOut } from 'firebase/auth';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  LayoutGrid,
  Activity,
  PlusCircle,
  Settings,
  LogOut,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarTrigger,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import Logo from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import FloatingAddButton from '@/components/FloatingAddButton';
import NewTradeForm from '@/components/NewTradeForm';

const navItems = [
  { href: '/dashboard', icon: LayoutGrid, label: 'Dashboard' },
  { href: '/dashboard/trade-history', icon: Activity, label: 'Riwayat Trade' },
];

function MainSidebar() {
  const { state } = useSidebar();
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <Logo iconOnly={state === 'collapsed'} />
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <Button
                asChild
                variant={pathname === item.href ? 'secondary' : 'ghost'}
                className="w-full justify-start"
              >
                <Link href={item.href}>
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            </SidebarMenuItem>
          ))}
          {/* We keep this item visible but separate */}
          <SidebarMenuItem className="md:hidden">
             <Button
                asChild
                variant={pathname === '/dashboard/new-trade' ? 'secondary' : 'ghost'}
                className="w-full justify-start"
              >
                <Link href={'/dashboard/new-trade'}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Tambah Trade Baru
                </Link>
              </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <Button
              asChild
              variant={
                pathname.startsWith('/dashboard/settings') ? 'secondary' : 'ghost'
              }
              className="w-full justify-start"
            >
              <Link href="/dashboard/settings">
                <Settings className="mr-2 h-4 w-4" />
                Pengaturan
              </Link>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { toast } = useToast();
  const auth = getAuth();
  const { user } = useUser();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut(auth);
      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Logout Gagal',
        description: error.message,
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex group/sidebar-wrapper">
        <MainSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
            <SidebarTrigger className="md:flex hidden" />
            <SidebarTrigger className="md:hidden" />
            <div className="w-full flex-1">
              <span className="font-semibold text-sm sm:text-base">
                Selamat Datang, {user?.displayName || 'Pengguna'}!
              </span>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={user?.photoURL || ''}
                      alt={user?.displayName || ''}
                    />
                    <AvatarFallback>
                      {getInitials(user?.displayName)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.displayName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Pengaturan</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
                  {isLoggingOut ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="mr-2 h-4 w-4" />
                  )}
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="flex-1 p-4 lg:p-6 md:ml-[16rem] group-data-[state=collapsed]/sidebar-wrapper:md:ml-[3rem] transition-[margin-left] duration-300 ease-in-out">
            <div className="w-full max-w-6xl mx-auto">
              {children}
            </div>
          </main>
           <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <FloatingAddButton />
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tambah Trade Baru</DialogTitle>
              </DialogHeader>
              <NewTradeForm onSuccess={() => setIsFormOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </SidebarProvider>
  );
}
