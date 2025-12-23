import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { STATUS_LABELS, STATUS_COLORS, MediaPlan } from '@/types/media';
import { cn } from '@/lib/utils';

type PlanStatus = MediaPlan['status'];

interface StatusSelectorProps {
  status: PlanStatus;
  onStatusChange: (status: PlanStatus) => void;
  disabled?: boolean;
  size?: 'sm' | 'default';
}

const AVAILABLE_STATUSES: PlanStatus[] = ['draft', 'active', 'completed'];

export function StatusSelector({ 
  status, 
  onStatusChange, 
  disabled = false,
  size = 'default'
}: StatusSelectorProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (newStatus: PlanStatus) => {
    if (newStatus !== status) {
      onStatusChange(newStatus);
    }
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button 
          variant="ghost" 
          className={cn(
            "gap-1 font-medium transition-colors",
            STATUS_COLORS[status],
            size === 'sm' ? 'h-6 px-2 text-xs' : 'h-7 px-2.5 text-xs'
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {STATUS_LABELS[status]}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36" onClick={(e) => e.stopPropagation()}>
        {AVAILABLE_STATUSES.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => handleSelect(s)}
            className="flex items-center justify-between"
          >
            <span className={cn("px-2 py-0.5 rounded text-xs font-medium", STATUS_COLORS[s])}>
              {STATUS_LABELS[s]}
            </span>
            {s === status && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
