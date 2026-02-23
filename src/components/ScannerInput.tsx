'use client';

import { useEffect, useRef, useCallback } from 'react';

interface ScannerInputProps {
  onScan: (value: string) => void;
  disabled?: boolean;
}

export default function ScannerInput({ onScan, disabled = false }: ScannerInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const focusInput = useCallback(() => {
    if (inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [disabled]);

  useEffect(() => {
    focusInput();
    const interval = setInterval(focusInput, 1000);
    document.addEventListener('click', focusInput);
    return () => {
      clearInterval(interval);
      document.removeEventListener('click', focusInput);
    };
  }, [focusInput]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputRef.current) {
      const value = inputRef.current.value.trim();
      if (value) {
        onScan(value);
        inputRef.current.value = '';
      }
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className="absolute opacity-0 w-0 h-0 pointer-events-none"
      aria-hidden="true"
      autoComplete="off"
      tabIndex={-1}
    />
  );
}
