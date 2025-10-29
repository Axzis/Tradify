'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { useAuth } from '@/firebase';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Logo from '@/components/logo';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();

  const handleSignUp = async () => {
    if (!name) {
      toast({
        variant: 'destructive',
        title: 'Registrasi Gagal',
        description: 'Nama tidak boleh kosong.',
      });
      return;
    }
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      // Update the user's profile with the name
      await updateProfile(userCredential.user, { displayName: name });
      // You might want to also save the user's name to Firestore here
      // Let AuthStateGate handle the redirect
    } catch (error: any) {
      let description = error.message;
      if (error.code === 'auth/network-request-failed') {
        description =
          'Gagal terhubung ke server. Periksa koneksi internet Anda.';
      } else if (error.code === 'auth/email-already-in-use') {
        description = 'Email ini sudah terdaftar. Silakan gunakan email lain.';
      } else if (error.code === 'auth/weak-password') {
        description = 'Password terlalu lemah. Gunakan minimal 6 karakter.';
      }
      toast({
        variant: 'destructive',
        title: 'Registrasi Gagal',
        description,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center">
          <Logo />
          <CardTitle className="text-2xl">Buat sebuah akun</CardTitle>
          <CardDescription>
            Masukkan informasi Anda untuk membuat akun.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nama</Label>
            <Input
              id="name"
              placeholder="Max Robinson"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            className="w-full"
            onClick={handleSignUp}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Buat akun
          </Button>
          <div className="text-center text-sm">
            Sudah punya akun?{' '}
            <Link
              href="/login"
              className={
                isLoading
                  ? 'pointer-events-none text-muted-foreground'
                  : 'underline'
              }
            >
              Sign in
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
