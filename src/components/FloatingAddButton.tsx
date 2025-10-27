'use client';

import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import React from 'react';

const FloatingAddButton = React.forwardRef<HTMLButtonElement>((props, ref) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            ref={ref}
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-40"
            size="icon"
            {...props}
          >
            <Plus className="h-6 w-6" />
            <span className="sr-only">Tambah Trade Baru</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Tambah Trade Baru</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

FloatingAddButton.displayName = 'FloatingAddButton';

export default FloatingAddButton;
