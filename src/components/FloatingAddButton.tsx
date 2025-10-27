'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function FloatingAddButton() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            asChild
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40"
            size="icon"
          >
            <Link href="/dashboard/new-trade">
              <Plus className="h-6 w-6" />
              <span className="sr-only">Tambah Trade Baru</span>
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Tambah Trade Baru</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
