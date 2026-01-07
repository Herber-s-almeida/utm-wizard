import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
  prefix?: string;
}

/**
 * Parses a Brazilian currency string (e.g., "R$ 55.710,92") to a number (55710.92)
 */
function parseBrazilianCurrency(value: string): number {
  // Remove currency symbol (R$, $, etc.) and whitespace
  let cleaned = value.replace(/[R$\s]/gi, '').trim();
  
  // Check if it's Brazilian format (uses . as thousand separator and , as decimal)
  // Brazilian format: 55.710,92 or 1.234.567,89
  // US format: 55,710.92 or 1,234,567.89
  
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');
  
  if (lastComma > lastDot) {
    // Brazilian format: comma is the decimal separator
    // Remove thousand separators (dots) and replace comma with dot
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > lastComma) {
    // US format or just dots: dot is the decimal separator
    // Remove thousand separators (commas)
    cleaned = cleaned.replace(/,/g, '');
  } else if (lastComma !== -1 && lastDot === -1) {
    // Only comma present - could be decimal separator
    const parts = cleaned.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      // Likely a decimal: 55710,92
      cleaned = cleaned.replace(',', '.');
    } else {
      // Likely thousand separator: 55,710
      cleaned = cleaned.replace(/,/g, '');
    }
  }
  
  // Remove any remaining non-numeric characters except dot and minus
  cleaned = cleaned.replace(/[^\d.-]/g, '');
  
  const result = parseFloat(cleaned);
  return isNaN(result) ? 0 : Math.round(result * 100) / 100;
}

export function CurrencyInput({ value, onChange, className, disabled, prefix = 'R$' }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const isEditingRef = useRef(false);

  // Format number for display
  const formatForDisplay = (num: number): string => {
    if (num === 0) return '';
    return num.toLocaleString('pt-BR', { 
      minimumFractionDigits: 2, 
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
    const parsed = parseBrazilianCurrency(displayValue);
    onChange(parsed);
    setDisplayValue(formatForDisplay(parsed));
  };

  const handleFocus = () => {
    isEditingRef.current = true;
    inputRef.current?.select();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const parsed = parseBrazilianCurrency(pastedText);
    onChange(parsed);
    setDisplayValue(formatForDisplay(parsed));
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
        placeholder="0,00"
        className={cn("text-right font-mono", className)}
      />
    </div>
  );
}
