import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number, decimals: number = 2): string {
  if (num === 0) return '0.00';
  
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(decimals) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(decimals) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(decimals) + 'K';
  }
  
  // For small numbers, show more decimals if they are non-zero
  const autoDecimals = num < 0.01 && num > 0 ? Math.max(decimals, 6) : decimals;
  
  return num.toLocaleString(undefined, {
    minimumFractionDigits: autoDecimals,
    maximumFractionDigits: autoDecimals,
  });
}
