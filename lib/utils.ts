import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhoneNumber(phone: string): string {
  // Format Nigerian phone numbers
  if (phone.startsWith("+234")) {
    return phone.replace(/(\+234)(\d{3})(\d{3})(\d{4})/, "$1 $2 $3 $4");
  }
  if (phone.startsWith("0")) {
    return phone.replace(/(0\d{3})(\d{3})(\d{4})/, "$1 $2 $3");
  }
  return phone;
}

export function getOpportunityColor(score: string): string {
  switch (score) {
    case "high":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    case "medium":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
    case "low":
      return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
    default:
      return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "new":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
    case "contacted":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
    case "interested":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    case "closed":
      return "bg-purple-500/10 text-purple-600 dark:text-purple-400";
    case "archived":
      return "bg-gray-500/10 text-gray-600 dark:text-gray-400";
    default:
      return "bg-gray-500/10 text-gray-600";
  }
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
