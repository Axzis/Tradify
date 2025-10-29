'use client';

import { useState } from 'react';
import { useUser } from '@/firebase';
import {
  getAuth,
  updateProfile,
  sendPasswordResetEmail,
  User,
} from 'firebase/auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';

const profileSchema = z.object({
  displayName: z.string().min(1, 'Nama tidak boleh kosong'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function SettingsPage() {
  const { user } = useUser();
  const auth = getAuth();
  const { toast } = useToast();
  const [isPasswordResetLoading, setIsPasswordResetLoading] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: user?.displayName || '',
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = form;

  const onProfileSubmit = async (data: ProfileFormData) => {
    if (!auth.currentUser) return;
    try {
      await updateProfile(auth.currentUser, {
        displayName: data.displayName,
      });
      toast({
        title: 'Sukses',
        description: 'Nama Anda berhasil diperbarui.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Gagal Memperbarui Profil',
        description: error.message,
      });
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    setIsPasswordResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      toast({
        title: 'Email Terkirim',
        description:
          'Silakan periksa email Anda untuk instruksi pengaturan ulang kata sandi.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Gagal Mengirim Email',
        description: error.message,
      });
    } finally {
      setIsPasswordResetLoading(false);
    }
  };

  return (
    <>
      <div className="flex items-center">
        <h1 className="text-lg font-semibold md:text-2xl">Pengaturan</h1>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Profil</CardTitle>
            <CardDescription>
              Perbarui informasi profil Anda di sini.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={handleSubmit(onProfileSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Tampilan</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Simpan Perubahan
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Keamanan</CardTitle>
            <CardDescription>Kelola pengaturan keamanan akun Anda.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Kata Sandi</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Kami akan mengirimkan email untuk mengatur ulang kata sandi Anda.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handlePasswordReset}
              disabled={isPasswordResetLoading}
            >
              {isPasswordResetLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Kirim Email Pengaturan Ulang Kata Sandi
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tampilan</CardTitle>
            <CardDescription>
              Sesuaikan tampilan dan nuansa aplikasi.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form>
              <div className="space-y-3">
                <Label>Tema Aplikasi</Label>
                <RadioGroup
                  defaultValue="dark"
                  className="flex flex-col space-y-1"
                  disabled // Disabled until full theme provider is implemented
                >
                  <div className="flex items-center space-x-3 space-y-0">
                    <RadioGroupItem value="light" id="theme-light" />
                    <Label htmlFor="theme-light" className="font-normal">
                      Terang
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 space-y-0">
                    <RadioGroupItem value="dark" id="theme-dark" />
                    <Label htmlFor="theme-dark" className="font-normal">
                      Gelap
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
