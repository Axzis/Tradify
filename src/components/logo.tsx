import { CandlestickChart } from "lucide-react";
import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
  iconOnly?: boolean;
};

export default function Logo({ className, iconOnly = false }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <CandlestickChart className="h-6 w-6 text-primary" />
      {!iconOnly && (
        <span className="text-lg font-bold font-headline">Tradify</span>
      )}
    </div>
  );
}
