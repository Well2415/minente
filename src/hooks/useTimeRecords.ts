import { useState, useEffect, useCallback, useMemo } from 'react';
import { TimeRecord, WorkDay } from '@/types'; // REMOVIDO WorkScheduleTemplate, ShiftSchedule
import { format, parseISO, differenceInMinutes, startOfDay, endOfDay, isWithinInterval, isBefore, setHours, setMinutes, subDays, isValid } from 'date-fns';

// import { sendNotification } from '@/lib/notificationService'; // Pode ser removido se não houver mais notificações de jornada
import axios from 'axios'; // Adicionar importação do axios

export function useTimeRecords(currentEmployeeId?: string | null) {
  const [allRecords, setAllRecords] = useState<TimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayHours, setTodayHours] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Novos estados para dados do dashboard
  const [dashboardWeeklyHours, setDashboardWeeklyHours] = useState(0);
  const [dashboardMonthlyHours, setDashboardMonthlyHours] = useState(0);
  const [dashboardMonthlyWorkDays, setDashboardMonthlyWorkDays] = useState(0);
  const [dashboardWeeklyHoursPerDay, setDashboardWeeklyHoursPerDay] = useState<
    { date: string; hours: number }[]
  >([]);

  // REMOVIDOS workScheduleTemplates e shiftSchedules
  // const [workScheduleTemplates, setWorkScheduleTemplates] = useState<WorkScheduleTemplate[]>([]);
  // const [shiftSchedules, setShiftSchedules] = useState<ShiftSchedule[]>([]);
  
  const refreshData = useCallback(async (startDate?: string, endDate?: string) => {
    setLoading(true);
    try {
      let timeRecordsEndpoint = '';
      const params = new URLSearchParams();

      if (currentEmployeeId === undefined) { // Manager/Admin context
        timeRecordsEndpoint = '/api/timerecords';
        // For managers, we want to fetch all records for the current period, so apply date filters
        if (startDate && endDate) {
            params.append('startDate', startDate);
            params.append('endDate', endDate);
        }
      } else if (currentEmployeeId !== null) { // Specific user context
        timeRecordsEndpoint = `/api/timerecords`; // Use the generic endpoint to pass userId as param
        params.append('userId', currentEmployeeId);
        if (startDate && endDate) {
            params.append('startDate', startDate);
            params.append('endDate', endDate);
        }
      } else { // currentEmployeeId is null (not logged in or invalid user)
        setAllRecords([]);
        setLoading(false);
        // Clear dashboard states for non-logged-in users
        setDashboardWeeklyHours(0);
        setDashboardMonthlyHours(0);
        setDashboardMonthlyWorkDays(0);
        setDashboardWeeklyHoursPerDay([]);
        return;
      }
      
      const cacheBuster = `_=${new Date().getTime()}`;
      
      const recordsUrl = `${timeRecordsEndpoint}?${params.toString()}&${cacheBuster}`;

      const fetches = [
        axios.get(recordsUrl),
        // REMOVIDO axios.get(`/api/work-schedule-templates?${cacheBuster}`),
      ];

      // Fetch dashboard data only for specific users (not managers viewing all)
      if (currentEmployeeId && currentEmployeeId !== undefined) {
        fetches.push(
          axios.get(`/api/dashboard/total-hours-weekly?userId=${currentEmployeeId}&${cacheBuster}`),
          axios.get(`/api/dashboard/total-hours-monthly?userId=${currentEmployeeId}&${cacheBuster}`),
          axios.get(`/api/dashboard/total-days-worked-monthly?userId=${currentEmployeeId}&${cacheBuster}`),
          axios.get(`/api/dashboard/hours-per-day-weekly?userId=${currentEmployeeId}&${cacheBuster}`)
        );
      }

      const results = await Promise.all(fetches);

      setAllRecords(results[0].data);
      // setUsers(results[1].data); // Removido, pois users não é mais gerenciado aqui
      // setWorkScheduleTemplates(results[1].data); // REMOVIDO
      // setShiftSchedules([]); // REMOVIDO

      // Process dashboard results if they were fetched
      if (currentEmployeeId && currentEmployeeId !== undefined) {
        let resultIndex = 1; // Ajustado de 2 para 1
        setDashboardWeeklyHours(results[resultIndex++].data.totalHours);
        setDashboardMonthlyHours(results[resultIndex++].data.totalHours);
        setDashboardMonthlyWorkDays(results[resultIndex++].data.totalDays);
        setDashboardWeeklyHoursPerDay(results[resultIndex++].data);
      }
    } catch (error) {
      console.error('Failed to fetch data from API:', error);
      // Optionally clear dashboard states on error
      setDashboardWeeklyHours(0);
      setDashboardMonthlyHours(0);
      setDashboardMonthlyWorkDays(0);
      setDashboardWeeklyHoursPerDay([]);
    } finally {
      setLoading(false);
    }
  }, [currentEmployeeId]);

  // Initial data fetch
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Periodic data refresh for real-time updates
  useEffect(() => {
    const intervalId = setInterval(() => {
      refreshData();
    }, 60000); // Refresh every 60 seconds

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [refreshData]);
  
  const records = useMemo(() => {
    if (currentEmployeeId === null) { // Se currentEmployeeId é null (usuário não logado)
      return []; // Retorna array vazio
    }
    if (currentEmployeeId === undefined) { // Se currentEmployeeId é undefined (gerente)
      return allRecords; // Retorna todos os registros para gerentes
    }
    // Funcionário específico logado
    return allRecords.filter(r => r.userId === parseInt(currentEmployeeId, 10)); // Converter currentEmployeeId para número
  }, [allRecords, currentEmployeeId]);



interface NewTimeRecordInput {
  employeeId: string;
  type: 'clock-in' | 'clock-out' | 'break-start' | 'break-end';
  timestamp: string;
  location?: string;
}

const addRecord = async (record: NewTimeRecordInput) => {
    try {
      const response = await axios.post('/api/timerecords', {
        employeeId: record.employeeId,
        type: record.type,
        timestamp: record.timestamp,
        location: record.location,
      });
      const newRecord = response.data; // Backend returns the created record with ID
      // if (newRecord.type === 'clock-in') {
      //   checkAndNotifyForIrregularClockIn(newRecord); // Desabilitado temporariamente
      // }
      refreshData(); // Refresh all records from backend
      return newRecord;
    } catch (error) {
      console.error('Failed to add time record:', error);
      // Adicionar log detalhado do erro para depuração
      if (axios.isAxiosError(error)) {
        console.error('Axios Error Details:', {
          message: error.message,
          code: error.code,
          response: error.response?.data,
          status: error.response?.status,
          headers: error.response?.headers,
        });
      } else {
        console.error('General Error Details:', error);
      }
      throw error; // Re-throw for component to handle
    }
  };

  const updateRecord = async (record: TimeRecord) => {
    try {
      const response = await axios.put(`/api/timerecords/${record.id}`, record);
      refreshData(); // Refresh all records from backend
      return response.data;
    } catch (error) {
      console.error('Failed to update time record:', error);
      throw error;
    }
  };

  const deleteRecord = async (id: string) => {
    try {
      await axios.delete(`/api/timerecords/${id}`);
      refreshData(); // Refresh all records from backend
    } catch (error) {
      console.error('Failed to delete time record:', error);
      throw error;
    }
  };
  
  const getTodayRecords = useCallback((targetUserId?: string | null) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const uid = targetUserId !== undefined ? targetUserId : currentEmployeeId; // Usa targetUserId se fornecido, senão currentEmployeeId
    
    if (uid === null) { // Se nenhum usuário válido (não é gerente, e não tem ID)
        return [];
    }
    const recordsToFilter = uid === undefined // Se uid é undefined (gerente)
        ? allRecords // Todos os registros
        : allRecords.filter(r => r.userId === parseInt(uid, 10)); // Converter uid para número
    
    return recordsToFilter.filter(
      (r) => r.timestamp.startsWith(today)
    );
  }, [allRecords, currentEmployeeId]);

  const getLastRecord = useCallback((targetUserId?: string | null) => {
    const todayRecords = getTodayRecords(targetUserId);
    return todayRecords.length > 0 ? todayRecords[todayRecords.length - 1] : null;
  }, [getTodayRecords]);

  const calculateDayHours = useCallback((dayRecords: TimeRecord[], isCurrentDay: boolean = false): number => {
    if (!dayRecords || dayRecords.length === 0) {
      return 0;
    }

    const sortedRecords = [...dayRecords].sort(
      (a, b) => {
        const dateA = parseISO(a.timestamp);
        const dateB = parseISO(b.timestamp);
        
        if (!isValid(dateA)) {
            // console.warn(`Invalid date found in record A: ${a.timestamp}`);
            return -1;
        }
        if (!isValid(dateB)) {
            // console.warn(`Invalid date found in record B: ${b.timestamp}`);
            return 1;
        }
        return dateA.getTime() - dateB.getTime();
      }
    );

    const workIntervals: { start: Date; end: Date }[] = [];
    const breakIntervals: { start: Date; end: Date }[] = [];

    let currentClockIn: Date | null = null;
    let currentBreakStart: Date | null = null;

    for (const record of sortedRecords) {
      const recordTime = parseISO(record.timestamp);
      // Further debug: check if recordTime is valid
      if (!isValid(recordTime)) {
        // console.error(`Skipping invalid recordTime from timestamp: ${record.timestamp}`);
        continue; // Skip this record if its timestamp is invalid
      }
      // console.log(`Processing record: ${record.type}, Timestamp: ${record.timestamp}, Parsed Date: ${recordTime}`);

      switch (record.type) {
        case 'clock-in':
          // If already clocked in, this is a new clock-in. Close any previous open work/break.
          if (currentClockIn) {
            workIntervals.push({ start: currentClockIn, end: recordTime });
          } else if (currentBreakStart) {
            // If on break, close break before starting work again
            breakIntervals.push({ start: currentBreakStart, end: recordTime });
            currentBreakStart = null;
          }
          currentClockIn = recordTime;
          break;

        case 'clock-out':
          if (currentClockIn) {
            if (currentBreakStart) {
              // If on break, close break before clocking out
              breakIntervals.push({ start: currentBreakStart, end: recordTime });
              currentBreakStart = null;
            }
            workIntervals.push({ start: currentClockIn, end: recordTime });
            currentClockIn = null;
          }
          break;

        case 'break-start':
          if (currentClockIn) { // If working, close work period and start break
            workIntervals.push({ start: currentClockIn, end: recordTime });
            currentClockIn = null;
            currentBreakStart = recordTime;
          } else if (currentBreakStart) {
            // Already on break, just update break start (error in sequence, but handle gracefully)
            breakIntervals.push({ start: currentBreakStart, end: recordTime }); // Close previous break
            currentBreakStart = recordTime; // Start new break
          }
          break;

        case 'break-end':
          if (currentBreakStart) { // If on break, close break and resume work
            breakIntervals.push({ start: currentBreakStart, end: recordTime });
            currentBreakStart = null;
            currentClockIn = recordTime; // Resume work from break end
          }
          break;
      }
    }

    // Handle open intervals for the current day
    if (isCurrentDay) {
      const now = new Date();
      if (currentClockIn && isValid(currentClockIn)) { // Check validity
        workIntervals.push({ start: currentClockIn, end: now });
      } else if (currentBreakStart && isValid(currentBreakStart)) { // Check validity
        breakIntervals.push({ start: currentBreakStart, end: now });
      }
    }
    
    // Calculate total work minutes
    let grossWorkMinutes = 0;
    workIntervals.forEach(interval => {
        if (isValid(interval.start) && isValid(interval.end)) { // Check validity
            grossWorkMinutes += differenceInMinutes(interval.end, interval.start);
        } else {
            // console.warn('Skipping invalid work interval:', interval);
        }
    });

    let totalBreakDuration = 0;
    breakIntervals.forEach(interval => {
        if (isValid(interval.start) && isValid(interval.end)) { // Check validity
            totalBreakDuration += differenceInMinutes(interval.end, interval.start);
        } else {
            // console.warn('Skipping invalid break interval:', interval);
        }
    });

    // The actual worked minutes are gross work minutes minus breaks that occurred during work intervals.
    // This refined logic is needed because breaks might not perfectly align.
    // For simplicity, let's assume valid break entries are always inside a work interval.
    // A more complex overlap calculation would be needed for absolute precision.

    // Given the previous state-based interval generation, this should be accurate
    // as breaks close work intervals and vice-versa.
    const netMinutes = grossWorkMinutes - totalBreakDuration; // This is the simplified approach
    
    return Math.max(0, netMinutes / 60); // Return hours
  }, []);

  // Effect para atualizar currentTime e todayHours every second
  useEffect(() => {
    const timer = setInterval(() => {
      const newTime = new Date();
      setCurrentTime(newTime);
      const todayUserRecords = getTodayRecords();
      const calculatedHours = calculateDayHours(todayUserRecords, true);
      setTodayHours(calculatedHours); 
    }, 1000);

    return () => clearInterval(timer);
  }, [allRecords, currentEmployeeId, getTodayRecords, calculateDayHours]); // Depend on allRecords

  const getWorkDays = useCallback((startDate: Date, endDate: Date, targetUserId?: string | null) => {
    const uid = targetUserId !== undefined ? targetUserId : currentEmployeeId; // Usa targetUserId se fornecido, senão currentEmployeeId

    if (uid === null) { // Se nenhum usuário válido (não é gerente, e não tem ID)
      return [];
    }
    const userRecords = uid === undefined // Se uid é undefined (gerente)
      ? allRecords
      : allRecords.filter(r => r.userId === parseInt(uid, 10)); // Converter uid para número

    const daysMap = new Map<string, { date: Date; totalHours: number; records: TimeRecord[] }>();

    userRecords.forEach(record => {
      const recordDate = parseISO(record.timestamp);
      if (isWithinInterval(recordDate, { start: startDate, end: endDate })) {
        const dayKey = format(recordDate, 'yyyy-MM-dd');
        if (!daysMap.has(dayKey)) {
          daysMap.set(dayKey, { date: startOfDay(recordDate), totalHours: 0, records: [] });
        }
        daysMap.get(dayKey)!.records.push(record);
      }
    });

    const workDays: WorkDay[] = Array.from(daysMap.values()).map(dayEntry => ({
      date: dayEntry.date,
      records: dayEntry.records,
      totalHours: calculateDayHours(dayEntry.records, format(dayEntry.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')),
    }));

    return workDays.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [allRecords, calculateDayHours, currentEmployeeId]);

  // REMOVIDO: getEffectiveWorkSchedule, pois não temos mais workScheduleTemplates ou shiftSchedules
  // const getEffectiveWorkSchedule = useCallback((date: Date, userId: string) => {
  //   const dateString = format(date, 'yyyy-MM-dd');
    
  //   // 1. Find a specific shift schedule for the user and date
  //   const shift = shiftSchedules.find(s => s.userId === userId && s.date === dateString);
  //   if (shift) {
  //     return workScheduleTemplates.find(t => t.id === shift.workScheduleTemplateId) || null;
  //   }

  //   // 2. Fallback to the user's default work schedule (needs user data)
  //   // This part is tricky as useTimeRecords doesn't have all users' data.
  //   // For now, we'll assume a default or that this logic will be expanded.
  //   // Let's assume we can't determine a default here and return null if no shift is found.
  //   return null;
  // }, [shiftSchedules, workScheduleTemplates]);

  const getAllEmployeesSummary = useCallback(async (startDate: Date, endDate: Date, selectedEmployeeId?: string) => {
    try {
      let employees: any[] = [];
      if (selectedEmployeeId && selectedEmployeeId !== 'all') {
        const employeeResponse = await axios.get(`/api/employees/${selectedEmployeeId}`);
        employees = [employeeResponse.data];
      } else {
        const employeesResponse = await axios.get('/api/employees');
        employees = employeesResponse.data;
      }
      console.log('getAllEmployeesSummary: Funcionários da API /api/employees:', employees); // Log 1

      const summaryPromises = employees.map(async (employee: any) => {
        const employeeRecordsResponse = await axios.get('/api/timerecords', {
          params: {
            userId: employee.id, // O backend espera o ID do funcionário aqui
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
          },
        });
        const employeeRecords = employeeRecordsResponse.data;
        console.log(`getAllEmployeesSummary: Registros de ponto para ${employee.name}:`, employeeRecords); // Log 2

        // Calculate total hours and days worked for the period
        const recordsByDay = employeeRecords.reduce((acc: any, record: TimeRecord) => {
          const date = format(parseISO(record.timestamp), 'yyyy-MM-dd');
          if (!acc[date]) acc[date] = [];
          acc[date].push(record);
          return acc;
        }, {});

        let totalHours = 0;
        let daysWorked = 0;

        // Itera sobre as datas para calcular horas e dias trabalhados
        // Somente conta dias como 'trabalhados' se houver horas calculadas para aquele dia.
        for (const dateKey in recordsByDay) {
          const dailyHours = calculateDayHours(recordsByDay[dateKey]);
          if (dailyHours > 0) {
            totalHours += dailyHours;
            daysWorked++; // Conta apenas se trabalhou horas naquele dia
          }
        }

        const employeeSummary = {
          user: employee,
          totalHours: parseFloat(totalHours.toFixed(2)),
          daysWorked: daysWorked,
        };
        console.log(`getAllEmployeesSummary: Resumo para ${employee.name}:`, employeeSummary); // Log 3
        return employeeSummary;
      });

      const finalSummary = await Promise.all(summaryPromises);
      console.log('getAllEmployeesSummary: Resumo final:', finalSummary); // Log 4
      return finalSummary;
    } catch (error) {
      console.error('Error fetching all employees summary:', error);
      return [];
    }
  }, [calculateDayHours]);


  return {
    records,
    loading,
    addRecord,
    updateRecord,
    deleteRecord,
    getTodayRecords,
    getLastRecord,
    calculateDayHours,
    todayHours,
    getWorkDays,
    // REMOVIDO: workScheduleTemplates,
    // REMOVIDO: shiftSchedules,
    // REMOVIDO: getEffectiveWorkSchedule,
    refreshData,
    dashboardWeeklyHours,
    dashboardMonthlyHours,
    dashboardMonthlyWorkDays,
    dashboardWeeklyHoursPerDay,
    getAllEmployeesSummary,
  };
}