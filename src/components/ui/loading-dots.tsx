import { cn } from "@/lib/utils";

interface LoadingDotsProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingDots({ className, size = "md" }: LoadingDotsProps) {
  const dotSize = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-3 h-3",
  };

  return (
    <div className={cn("flex items-center justify-center gap-1", className)}>
      <span
        className={cn(
          "rounded-full bg-primary animate-[loading-dot_1.4s_ease-in-out_infinite]",
          dotSize[size]
        )}
        style={{ animationDelay: "0s" }}
      />
      <span
        className={cn(
          "rounded-full bg-primary animate-[loading-dot_1.4s_ease-in-out_infinite]",
          dotSize[size]
        )}
        style={{ animationDelay: "0.2s" }}
      />
      <span
        className={cn(
          "rounded-full bg-primary animate-[loading-dot_1.4s_ease-in-out_infinite]",
          dotSize[size]
        )}
        style={{ animationDelay: "0.4s" }}
      />
    </div>
  );
}

export function LoadingPage({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <LoadingDots size="lg" />
      {message && (
        <p className="text-sm text-muted-foreground animate-fade-in">
          {message}
        </p>
      )}
    </div>
  );
}
