import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnimatedCollapsibleProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

interface AnimatedCollapsibleTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
}

interface AnimatedCollapsibleContentProps {
  children: React.ReactNode;
  className?: string;
}

const AnimatedCollapsibleContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
}>({
  open: false,
  onOpenChange: () => {},
});

export function AnimatedCollapsible({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
  className,
}: AnimatedCollapsibleProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  
  const handleOpenChange = React.useCallback((newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  }, [isControlled, onOpenChange]);

  return (
    <AnimatedCollapsibleContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      <div className={className} data-state={open ? "open" : "closed"}>
        {children}
      </div>
    </AnimatedCollapsibleContext.Provider>
  );
}

export function AnimatedCollapsibleTrigger({
  children,
  asChild,
  className,
}: AnimatedCollapsibleTriggerProps) {
  const { open, onOpenChange } = React.useContext(AnimatedCollapsibleContext);

  const handleClick = () => {
    onOpenChange(!open);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ onClick?: () => void; 'data-state'?: string }>, {
      onClick: handleClick,
      'data-state': open ? 'open' : 'closed',
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
      data-state={open ? "open" : "closed"}
    >
      {children}
    </button>
  );
}

export function AnimatedCollapsibleContent({
  children,
  className,
}: AnimatedCollapsibleContentProps) {
  const { open } = React.useContext(AnimatedCollapsibleContext);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ 
            height: "auto", 
            opacity: 1,
            transition: {
              height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
              opacity: { duration: 0.25, delay: 0.05 }
            }
          }}
          exit={{ 
            height: 0, 
            opacity: 0,
            transition: {
              height: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
              opacity: { duration: 0.15 }
            }
          }}
          className={cn("overflow-hidden", className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
