import { Link, useLocation } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SectionContext = 'plans' | 'resources' | 'taxonomy' | 'reports';

interface SimplePlanLinkProps {
  id: string;
  slug?: string | null;
  name: string;
  section: SectionContext;
  icon: LucideIcon;
}

export function SimplePlanLink({
  id,
  slug,
  name,
  section,
  icon: Icon,
}: SimplePlanLinkProps) {
  const location = useLocation();
  const planIdentifier = slug || id;
  
  // Build URL based on section context
  const getSectionSuffix = () => {
    switch (section) {
      case 'resources': return '/resources';
      case 'taxonomy': return '/taxonomy';
      case 'reports': return '/reports';
      default: return '';
    }
  };
  
  const planUrl = `/media-plans/${planIdentifier}${getSectionSuffix()}`;
  
  // Check if current path matches this specific section
  const isActive = (() => {
    const basePath = `/media-plans/${planIdentifier}`;
    const currentPath = location.pathname;
    
    switch (section) {
      case 'resources':
        return currentPath === `${basePath}/resources` || currentPath.startsWith(`${basePath}/resources/`);
      case 'taxonomy':
        return currentPath === `${basePath}/taxonomy` || currentPath.startsWith(`${basePath}/taxonomy/`);
      case 'reports':
        return currentPath === `${basePath}/reports` || currentPath.startsWith(`${basePath}/reports/`);
      case 'plans':
      default:
        return currentPath === basePath || currentPath === `${basePath}/edit`;
    }
  })();

  return (
    <Link to={planUrl}>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "w-full justify-start h-7 text-xs font-normal truncate",
          isActive && "bg-sidebar-accent font-semibold text-primary"
        )}
      >
        <Icon className="h-3 w-3 mr-2 shrink-0" />
        <span className="truncate">{name}</span>
      </Button>
    </Link>
  );
}
