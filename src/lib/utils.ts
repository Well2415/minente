import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0,
        v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function formatHoursDecimal(hoursDecimal: number): string {
  if (isNaN(hoursDecimal) || hoursDecimal < 0) {
    return '00:00';
  }

  const totalMinutes = Math.floor(hoursDecimal * 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const paddedHours = String(hours).padStart(2, '0');
  const paddedMinutes = String(minutes).padStart(2, '0');

  return `${paddedHours}:${paddedMinutes}`;
}

export function translateRecordType(type: string): string {
  switch (type) {
    case 'clock-in':
      return 'Entrada';
    case 'clock-out':
      return 'Saída';
    case 'break-start':
      return 'Início da Pausa';
    case 'break-end':
      return 'Fim da Pausa';
    default:
      return type;
  }
}
