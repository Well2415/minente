export type UserRole = 'employee' | 'manager' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  avatar?: string;
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

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
