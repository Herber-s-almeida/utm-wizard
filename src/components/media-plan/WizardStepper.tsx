import { cn } from '@/lib/utils';
import { Check, HelpCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Step {
  id: number;
  title: string;
  description?: string;
  helpText?: string;
}

interface WizardStepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (step: number) => void;
  completionPercentage?: number;
  showProgressBar?: boolean;
}

export function WizardStepper({ 
  steps, 
  currentStep, 
  onStepClick,
  completionPercentage,
  showProgressBar = true,
}: WizardStepperProps) {
  // Calculate step progress if completionPercentage not provided
  const stepProgress = completionPercentage ?? Math.round(((currentStep - 1) / (steps.length - 1)) * 100);
  
  return (
    <nav aria-label="Progress" className="mb-8 space-y-4">
      {/* Progress bar */}
      {showProgressBar && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progresso</span>
            <span className="font-medium text-foreground">{stepProgress}%</span>
          </div>
          <Progress value={stepProgress} className="h-2" />
        </div>
      )}
      
      {/* Steps */}
      <ol className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isClickable = onStepClick && step.id <= currentStep;

          return (
            <li key={step.id} className="relative flex-1">
              <div className="flex flex-col items-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => isClickable && onStepClick(step.id)}
                        disabled={!isClickable}
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all",
                          isCompleted && "bg-primary border-primary text-primary-foreground",
                          isCurrent && "border-primary text-primary bg-primary/10",
                          !isCompleted && !isCurrent && "border-muted-foreground/30 text-muted-foreground bg-background",
                          isClickable && "cursor-pointer hover:scale-105"
                        )}
                      >
                        {isCompleted ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          step.id
                        )}
                      </button>
                    </TooltipTrigger>
                    {step.helpText && (
                      <TooltipContent side="bottom" className="max-w-xs text-center">
                        <p>{step.helpText}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
                <div className="mt-2 text-center">
                  <span className={cn(
                    "text-xs font-medium",
                    isCurrent ? "text-primary" : "text-muted-foreground"
                  )}>
                    {step.title}
                  </span>
                  {step.description && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[100px]">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div 
                  className={cn(
                    "absolute top-5 left-1/2 w-full h-0.5 -translate-y-1/2",
                    isCompleted ? "bg-primary" : "bg-muted-foreground/20"
                  )}
                  style={{ left: 'calc(50% + 20px)', width: 'calc(100% - 40px)' }}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}