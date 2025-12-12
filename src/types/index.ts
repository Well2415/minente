export type UserRole = 'employee' | 'manager' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  avatar?: string;
  ctps?: string;
  admissionDate?: string;
  workSchedule?: string; // Mantido para flexibilidade/retrocompatibilidade
  saturdayWorkSchedule?: string; // Mantido para flexibilidade/retrocompatibilidade
  weeklyRestDay?: string; // Mantido para flexibilidade/retrocompatibilidade
  workScheduleTemplateId?: string; // ID do modelo de jornada
}

export interface WorkScheduleTemplate {
  id: string;
  name: string;
  workSchedule: string;
  saturdayWorkSchedule?: string;
  weeklyRestDay?: string;
}

export interface TimeRecord {
  id: string;
  userId: string;
  type: 'clock-in' | 'clock-out' | 'break-start' | 'break-end';
  timestamp: string;
  location?: string;
}

export interface WorkDay {
  date: string;
  userId: string;
  records: TimeRecord[];
  totalHours: number;
  status: 'complete' | 'incomplete' | 'absent';
}

export interface ShiftSchedule {
  id: string; // ID único para o agendamento
  userId: string; // ID do funcionário
  date: string; // Data do turno (formato 'YYYY-MM-DD')
  workScheduleTemplateId: string; // ID do modelo de jornada aplicado
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface Notification {
  id: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  timestamp: string;
  link?: string;
}
