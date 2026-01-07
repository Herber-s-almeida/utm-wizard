import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PercentageInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Parses a percentage string, handling Brazilian format (comma as decimal separator)
 */
function parsePercentage(value: string): number {
  // Remove % symbol and whitespace
  let cleaned = value.replace(/%/g, '').trim();
  
  // Replace comma with dot for decimal
  cleaned = cleaned.replace(',', '.');
  
  // Remove any non-numeric characters except dot and minus
  cleaned = cleaned.replace(/[^\d.-]/g, '');
  
  const result = parseFloat(cleaned);
  return isNaN(result) ? 0 : Math.round(result * 100) / 100;
}

export function PercentageInput({ value, onChange, className, disabled }: PercentageInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditingRef = useRef(false);

  // Format number for display (Brazilian format with comma)
  const formatForDisplay = (num: number): string => {
    if (num === 0) return '';
    return num.toLocaleString('pt-BR', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 2 
    });
  };

  useEffect(() => {
    if (!isEditingRef.current) {
      setDisplayValue(formatForDisplay(value));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setDisplayValue(rawValue);
    
    if (rawValue === '') {
      onChange(0);
      return;
    }
  };

  const handleBlur = () => {
    isEditingRef.current = false;
    const parsed = parsePercentage(displayValue);
    const clamped = Math.min(100, Math.max(0, parsed));
    onChange(clamped);
    setDisplayValue(formatForDisplay(clamped));
  };

  const handleFocus = () => {
    isEditingRef.current = true;
    inputRef.current?.select();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const parsed = parsePercentage(pastedText);
    const clamped = Math.min(100, Math.max(0, parsed));
    onChange(clamped);
    setDisplayValue(formatForDisplay(clamped));
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onPaste={handlePaste}
        disabled={disabled}
        placeholder="0"
        className={cn("pr-6 text-right", className)}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
        %
      </span>
    </div>
  );
}
