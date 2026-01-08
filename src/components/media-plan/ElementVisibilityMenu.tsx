import { Eye, EyeOff } from 'lucide-react';
import { DropdownMenuItem, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from '@/components/ui/dropdown-menu';
import { PlanElementVisibility, PlanElementKey } from '@/hooks/usePlanElementsVisibility';

interface ElementVisibilityMenuProps {
  elements: PlanElementVisibility[];
  onToggle: (key: PlanElementKey) => void;
}

export function ElementVisibilityMenu({ elements, onToggle }: ElementVisibilityMenuProps) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Eye className="w-4 h-4 mr-2" />
        Exibir/Ocultar Elementos
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-56">
        {elements.map((element) => (
          <DropdownMenuItem
            key={element.key}
            onClick={(e) => {
              e.preventDefault();
              onToggle(element.key);
            }}
            className="cursor-pointer"
          >
            {element.visible ? (
              <Eye className="w-4 h-4 mr-2 text-primary" />
            ) : (
              <EyeOff className="w-4 h-4 mr-2 text-muted-foreground" />
            )}
            <span className={element.visible ? '' : 'text-muted-foreground'}>
              {element.label}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
