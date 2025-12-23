import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PercentageInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
}

export function PercentageInput({ value, onChange, className, disabled }: PercentageInputProps) {
  const [displayValue, setDisplayValue] = useState(value === 0 ? '' : value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Only update display value if the input isn't focused
    if (document.activeElement !== inputRef.current) {
      setDisplayValue(value === 0 ? '' : value.toString());
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    
    // Allow empty string for easy editing
    if (rawValue === '') {
      setDisplayValue('');
      onChange(0);
      return;
    }
    
    // Parse and validate
    const numValue = parseFloat(rawValue);
    if (!isNaN(numValue)) {
      setDisplayValue(rawValue);
      onChange(Math.min(100, Math.max(0, numValue)));
    }
  };

  const handleBlur = () => {
    // On blur, format the value properly
    if (displayValue === '' || parseFloat(displayValue) === 0) {
      setDisplayValue('');
    } else {
      setDisplayValue(value.toString());
    }
  };

  const handleFocus = () => {
    // Select all text on focus for easy replacement
    inputRef.current?.select();
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="number"
        min={0}
        max={100}
        step={0.01}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        disabled={disabled}
        placeholder="0"
        className={cn("pr-6 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none", className)}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
        %
      </span>
    </div>
  );
}
