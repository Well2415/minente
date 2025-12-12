import { useState, useEffect, useCallback } from 'react';
import { TimeRecord, WorkDay, Notification, User, WorkScheduleTemplate, ShiftSchedule } from '@/types';
import { format, parseISO, differenceInMinutes, startOfDay, endOfDay, isWithinInterval, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale'; // Importar ptBR aqui
import { generateUUID } from '@/lib/utils';
import { useNotifications } from './useNotifications';
import { v4 as uuidv4 } from 'uuid'; // Adicionar importação de uuidv4

export function useTimeRecords(currentUserId?: string) { // Renomeado para evitar conflito com userId nos parâmetros
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayHours, setTodayHours] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  const [users, setUsers] = useState<User[]>([]);
  const [workScheduleTemplates, setWorkScheduleTemplates] = useState<WorkScheduleTemplate[]>([]);
  const [shiftSchedules, setShiftSchedules] = useState<ShiftSchedule[]>([]);

  const { addNotification } = useNotifications();

  // Carrega usuários, templates e agendamentos do localStorage
  useEffect(() => {
    const storedUsers = JSON.parse(localStorage.getItem('users') || '[]');
    setUsers(storedUsers);

    const storedTemplates = JSON.parse(localStorage.getItem('workScheduleTemplates') || '[]');
    setWorkScheduleTemplates(storedTemplates);

    const storedSchedules = JSON.parse(localStorage.getItem('shiftSchedules') || '[]');
    setShiftSchedules(storedSchedules);
  }, []); // Executa apenas uma vez na montagem

  // Funções auxiliares para calcular horas e intervalo de um WorkScheduleTemplate
  const parseWorkSchedule = useCallback((scheduleString?: string) => {
    let totalExpectedMinutes = 0;
    let totalBreakMinutes = 0;

    if (!scheduleString) {
      return { totalExpectedMinutes, totalBreakMinutes };
    }

    const periods = scheduleString.split(',').map(p => p.trim());
    for (const period of periods) {
      const [startStr, endStr] = period.split('-');
      if (startStr && endStr) {
        const start = parseISO(`2000-01-01T${startStr}:00`);
        const end = parseISO(`2000-01-01T${endStr}:00`);
        totalExpectedMinutes += differenceInMinutes(end, start);
      }
    }
    // Assumimos que a pausa é a diferença entre o final do primeiro período e o início do segundo, se houver
    if (periods.length > 1) {
      const firstPeriodEnd = periods[0].split('-')[1];
      const secondPeriodStart = periods[1].split('-')[0];
      if (firstPeriodEnd && secondPeriodStart) {
        const breakStart = parseISO(`2000-01-01T${firstPeriodEnd}:00`);
        const breakEnd = parseISO(`2000-01-01T${secondPeriodStart}:00`);
        totalBreakMinutes = differenceInMinutes(breakEnd, breakStart);
      }
    }

    return { totalExpectedMinutes, totalBreakMinutes };
  }, []);

  const getEffectiveWorkSchedule = useCallback((userId: string, date: Date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    
    // 1. Procurar em shiftSchedules para o dia específico
    const specificShift = shiftSchedules.find(
      s => s.userId === userId && s.date === formattedDate
    );

    if (specificShift) {
      return workScheduleTemplates.find(t => t.id === specificShift.workScheduleTemplateId);
    }

    // 2. Se não houver shift específico, usar o template padrão do usuário
    const user = users.find(u => u.id === userId);
    if (user && user.workScheduleTemplateId) {
      return workScheduleTemplates.find(t => t.id === user.workScheduleTemplateId);
    }

    // 3. Retornar um template padrão (ex: 8 horas padrão, sem sábado, domingo de descanso)
    // Ou retornar null e lidar com isso downstream
    return {
      id: 'default',
      name: 'Padrão (8h)',
      workSchedule: '08:00-12:00, 13:00-17:00', // 8 horas
      saturdayWorkSchedule: '',
      weeklyRestDay: 'Sábado e Domingo',
    } as WorkScheduleTemplate; // Retorna um objeto que se encaixa na interface
  }, [users, workScheduleTemplates, shiftSchedules]);

  // Remove a função antiga getEmployeeWorkSettings
  // const getEmployeeWorkSettings = useCallback((employeeId: string) => { /* ... */ }, []);

  const loadRecords = useCallback(() => {
    try {
      const allRecords = JSON.parse(localStorage.getItem('timeRecords') || '[]');
      if (currentUserId) { // Usar currentUserId aqui
        setRecords(allRecords.filter((r: TimeRecord) => r.userId === currentUserId));
      } else {
        setRecords(allRecords);
      }
    } catch (error) {
      console.error("Failed to load records from localStorage", error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]); // currentUserId como dependência

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'timeRecords') {
        loadRecords();
      } else if (event.key === 'users') { // Monitorar mudanças em 'users'
        setUsers(JSON.parse(event.newValue || '[]'));
      } else if (event.key === 'workScheduleTemplates') { // Monitorar mudanças em 'workScheduleTemplates'
        setWorkScheduleTemplates(JSON.parse(event.newValue || '[]'));
      } else if (event.key === 'shiftSchedules') { // Monitorar mudanças em 'shiftSchedules'
        setShiftSchedules(JSON.parse(event.newValue || '[]'));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadRecords]);

  const addRecord = (record: Omit<TimeRecord, 'id'>) => {
    const newRecord = {
      ...record,
      id: uuidv4(),
    };
    setRecords(prevRecords => [...prevRecords, newRecord]);
    try {
      const allRecords = JSON.parse(localStorage.getItem('timeRecords') || '[]');
      allRecords.push(newRecord);
      localStorage.setItem('timeRecords', JSON.stringify(allRecords));
    } catch (error) {
      console.error("Failed to save record to localStorage", error);
      setRecords(prevRecords => prevRecords.filter(r => r.id !== newRecord.id));
    }
    return newRecord;
  };

  const getTodayRecords = useCallback((targetUserId?: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const uid = targetUserId || currentUserId; // Usar currentUserId
    if (!uid) return [];
    return records.filter(
      (r) => r.userId === uid && r.timestamp.startsWith(today)
    );
  }, [records, currentUserId]);

  const getLastRecord = useCallback((targetUserId?: string) => {
    const todayRecords = getTodayRecords(targetUserId);
    return todayRecords.length > 0 ? todayRecords[todayRecords.length - 1] : null;
  }, [getTodayRecords]);

  const calculateDayHours = useCallback((dayRecords: TimeRecord[]): number => {
    let totalMinutes = 0;
    const sorted = [...dayRecords].sort(
      (a, b) => parseISO(a.timestamp).getTime() - parseISO(b.timestamp).getTime()
    );

    let clockInTime: Date | null = null;
    let breakStartTime: Date | null = null;

    for (const record of sorted) {
      const time = parseISO(record.timestamp);
      switch (record.type) {
        case 'clock-in':
          clockInTime = time;
          break;
        case 'clock-out':
          if (clockInTime) {
            totalMinutes += differenceInMinutes(time, clockInTime);
            clockInTime = null;
          }
          break;
        case 'break-start':
          if (clockInTime) {
            totalMinutes += differenceInMinutes(time, clockInTime);
            clockInTime = null;
            breakStartTime = time;
          }
          break;
        case 'break-end':
          if (breakStartTime) {
            clockInTime = time;
            breakStartTime = null;
          }
          break;
      }
    }

    if (clockInTime) {
      totalMinutes += differenceInMinutes(new Date(), clockInTime);
    }

    return Math.round((totalMinutes / 60) * 100) / 100;
  }, []);

  const getWorkDays = useCallback((
    startDate: Date,
    endDate: Date,
    targetUserId?: string
  ): WorkDay[] => {
    const uid = targetUserId || currentUserId;
    if (!uid) return [];

    const filteredRecords = records.filter((r) => {
      if (r.userId !== uid) return false;
      const recordDate = parseISO(r.timestamp);
      return isWithinInterval(recordDate, { start: startOfDay(startDate), end: endOfDay(endDate) });
    });

    const groupedByDate: { [key: string]: TimeRecord[] } = {};
    filteredRecords.forEach((r) => {
      const date = format(parseISO(r.timestamp), 'yyyy-MM-dd');
      if (!groupedByDate[date]) {
        groupedByDate[date] = [];
      }
      groupedByDate[date].push(r);
    });

    // Criar uma lista completa de dias no período
    const allDatesInPeriod: Date[] = [];
    let currentDate = startOfDay(startDate);
    const lastDate = endOfDay(endDate);
    while (currentDate <= lastDate) {
      allDatesInPeriod.push(currentDate);
      currentDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
    }


    return allDatesInPeriod.map(date => {
      const formattedDate = format(date, 'yyyy-MM-dd');
      const dayRecords = groupedByDate[formattedDate] || [];
      const totalHours = calculateDayHours(dayRecords);
      const hasClockOut = dayRecords.some((r) => r.type === 'clock-out');
      
      const effectiveSchedule = getEffectiveWorkSchedule(uid, date);
      const { totalExpectedMinutes } = parseWorkSchedule(effectiveSchedule?.workSchedule);
      const requiredHours = totalExpectedMinutes / 60; // Converter para horas

      let status: 'complete' | 'incomplete' | 'absent' = 'absent';

      if (totalHours > 0) {
        if (hasClockOut && totalHours >= requiredHours) {
          status = 'complete';
        } else if (hasClockOut && totalHours < requiredHours) {
          status = 'incomplete';
        } else if (!hasClockOut) { // Usuário está logado e trabalhando
          status = 'incomplete'; 
        }
      } else { // totalHours === 0
        // Verificar se é um dia de descanso
        const dayOfWeek = format(date, 'EEEE', { locale: ptBR });
        const isRestDay = effectiveSchedule?.weeklyRestDay?.includes(dayOfWeek);

        if (isRestDay) {
          status = 'complete'; // Se é dia de descanso, conta como completo (não precisa trabalhar)
        } else {
          status = 'absent'; // Se não trabalhou e não é dia de descanso
        }
      }


      return {
        date: formattedDate,
        userId: uid,
        records: dayRecords,
        totalHours,
        status: status,
      };
    });
  }, [records, currentUserId, calculateDayHours, getEffectiveWorkSchedule, parseWorkSchedule]);

  // Effect para atualizar currentTime e todayHours every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      const todayUserRecords = getTodayRecords();
      setTodayHours(calculateDayHours(todayUserRecords));
    }, 1000);

    return () => clearInterval(timer);
  }, [records, currentUserId, getTodayRecords, calculateDayHours]);

  // Effect para verificar ponto incompleto do dia anterior
  useEffect(() => {
    if (!currentUserId) return;

    const yesterday = subDays(new Date(), 1);
    const yesterdayDateStr = format(yesterday, 'yyyy-MM-dd');

    const workDays = getWorkDays(yesterday, yesterday, currentUserId);
    const yesterdayWorkDay = workDays.find(wd => wd.date === yesterdayDateStr);

    if (yesterdayWorkDay && yesterdayWorkDay.status === 'incomplete' && !yesterdayWorkDay.records.some(r => r.type === 'clock-out')) {
      const existingNotifications = JSON.parse(localStorage.getItem('notifications') || '[]');
      const notificationExists = existingNotifications.some((notif: Notification) => 
        notif.message.includes('Ponto incompleto referente ao dia') && notif.message.includes(yesterdayDateStr) && !notif.read
      );

      if (!notificationExists) {
        addNotification(
          `Ponto incompleto referente ao dia ${format(yesterday, 'dd/MM/yyyy')}. Você esqueceu de registrar a saída.`,
          'warning',
          '/ponto'
        );
      }
    }
  }, [currentUserId, records, addNotification, getWorkDays]);

  // Effect to handle auto clock-out
  useEffect(() => {
    if (!currentUserId) return;

    const autoClockOutInterval = setInterval(() => {
      const todayDate = new Date();
      const effectiveSchedule = getEffectiveWorkSchedule(currentUserId, todayDate);
      
      // A lógica de autoClockOut não está mais ligada a employeeSettings
      // Precisamos determinar se o autoClockOut é desejado para o usuário
      // Por simplicidade, assumimos que 'employeeSettings' ainda pode guardar essa flag.
      const allEmployeeSettings = JSON.parse(localStorage.getItem('employeeSettings') || '{}');
      const employeeSettings = allEmployeeSettings[currentUserId] || { autoClockOut: false };
      const userAutoClockOut = employeeSettings.autoClockOut;


      if (userAutoClockOut && effectiveSchedule) {
        const { totalExpectedMinutes } = parseWorkSchedule(effectiveSchedule.workSchedule);
        const requiredHours = totalExpectedMinutes / 60;

        const lastRec = getLastRecord(currentUserId);
        const currentTodayRecords = getTodayRecords(currentUserId);
        const currentTodayHours = calculateDayHours(currentTodayRecords);

        if (
          currentTodayRecords.some(r => r.type === 'clock-in') &&
          lastRec &&
          (lastRec.type === 'clock-in' || lastRec.type === 'break-end') &&
          currentTodayHours >= requiredHours
        ) {
          setTimeout(() => {
            const recheckLastRec = getLastRecord(currentUserId);
            const recheckCurrentTodayRecords = getTodayRecords(currentUserId);
            const recheckCurrentTodayHours = calculateDayHours(recheckCurrentTodayRecords);
            
            // Re-checar userAutoClockOut e requiredHours
            const recheckEmployeeSettings = JSON.parse(localStorage.getItem('employeeSettings') || '{}');
            const recheckUserAutoClockOut = (recheckEmployeeSettings[currentUserId] || { autoClockOut: false }).autoClockOut;
            const recheckEffectiveSchedule = getEffectiveWorkSchedule(currentUserId, new Date());
            const recheckRequiredHours = recheckEffectiveSchedule ? parseWorkSchedule(recheckEffectiveSchedule.workSchedule).totalExpectedMinutes / 60 : 0;


            if (
              recheckUserAutoClockOut &&
              recheckLastRec &&
              (recheckLastRec.type === 'clock-in' || recheckLastRec.type === 'break-end') &&
              recheckCurrentTodayHours >= recheckRequiredHours &&
              !recheckCurrentTodayRecords.some(r => r.type === 'clock-out')
            ) {
                 addRecord({
                    userId: currentUserId,
                    type: 'clock-out',
                    timestamp: new Date().toISOString(),
                });
                console.log(`Auto clock-out registered for user ${currentUserId} at ${new Date().toLocaleTimeString()}`);
            }
          }, 1000 * 30);
        }
      }
    }, 1000 * 60 * 5);

    return () => clearInterval(autoClockOutInterval);
  }, [currentUserId, addRecord, calculateDayHours, getTodayRecords, getLastRecord, getEffectiveWorkSchedule, parseWorkSchedule]);

  const getAllEmployeesSummary = useCallback((startDate: Date, endDate: Date) => {
    // Usar a lista 'users' gerenciada pelo hook
    return users
      .filter((u: User) => u.role === 'employee')
      .map((user: User) => {
        const workDays = getWorkDays(startDate, endDate, user.id);
        const totalHours = workDays.reduce((sum, day) => sum + day.totalHours, 0);
        const daysWorked = workDays.filter((d) => d.totalHours > 0).length;

        return {
          user,
          totalHours: Math.round(totalHours * 100) / 100,
          daysWorked,
          averageHoursPerDay: daysWorked > 0 ? Math.round((totalHours / daysWorked) * 100) / 100 : 0,
        };
      });
  }, [users, records, getWorkDays]); // Adicionar 'users' e 'records' como dependências

  return {
    records,
    loading,
    addRecord,
    getTodayRecords,
    getLastRecord,
    calculateDayHours,
    getWorkDays,
    getAllEmployeesSummary,
    reload: loadRecords,
    todayHours,
    currentTime,
    getEffectiveWorkSchedule, // Expor a nova função
    parseWorkSchedule, // Expor a nova função
  };
}