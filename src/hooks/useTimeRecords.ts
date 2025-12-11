import { useState, useEffect, useCallback } from 'react';
import { TimeRecord, WorkDay } from '@/types';
import { format, parseISO, differenceInMinutes, startOfDay, endOfDay, isWithinInterval } from 'date-fns';

export function useTimeRecords(userId?: string) {
  const [records, setRecords] = useState<TimeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecords = useCallback(() => {
    const allRecords = JSON.parse(localStorage.getItem('timeRecords') || '[]');
    if (userId) {
      setRecords(allRecords.filter((r: TimeRecord) => r.userId === userId));
    } else {
      setRecords(allRecords);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const addRecord = (record: Omit<TimeRecord, 'id'>) => {
    const allRecords = JSON.parse(localStorage.getItem('timeRecords') || '[]');
    const newRecord = {
      ...record,
      id: crypto.randomUUID(),
    };
    allRecords.push(newRecord);
    localStorage.setItem('timeRecords', JSON.stringify(allRecords));
    loadRecords();
    return newRecord;
  };

  const getTodayRecords = (targetUserId?: string) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const uid = targetUserId || userId;
    return records.filter(
      (r) => r.userId === uid && r.timestamp.startsWith(today)
    );
  };

  const getLastRecord = (targetUserId?: string) => {
    const todayRecords = getTodayRecords(targetUserId);
    return todayRecords.length > 0 ? todayRecords[todayRecords.length - 1] : null;
  };

  const calculateDayHours = (dayRecords: TimeRecord[]): number => {
    let totalMinutes = 0;
    const sorted = [...dayRecords].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
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

    // If still clocked in, calculate until now
    if (clockInTime) {
      totalMinutes += differenceInMinutes(new Date(), clockInTime);
    }

    return Math.round((totalMinutes / 60) * 100) / 100;
  };

  const getWorkDays = (
    startDate: Date,
    endDate: Date,
    targetUserId?: string
  ): WorkDay[] => {
    const uid = targetUserId || userId;
    const filteredRecords = records.filter((r) => {
      if (uid && r.userId !== uid) return false;
      const recordDate = parseISO(r.timestamp);
      return isWithinInterval(recordDate, {
        start: startOfDay(startDate),
        end: endOfDay(endDate),
      });
    });

    const groupedByDate: { [key: string]: TimeRecord[] } = {};
    filteredRecords.forEach((r) => {
      const date = format(parseISO(r.timestamp), 'yyyy-MM-dd');
      if (!groupedByDate[date]) {
        groupedByDate[date] = [];
      }
      groupedByDate[date].push(r);
    });

    return Object.entries(groupedByDate).map(([date, dayRecords]) => {
      const totalHours = calculateDayHours(dayRecords);
      const hasClockOut = dayRecords.some((r) => r.type === 'clock-out');

      return {
        date,
        userId: uid || '',
        records: dayRecords,
        totalHours,
        status: hasClockOut ? 'complete' : totalHours > 0 ? 'incomplete' : 'absent',
      };
    });
  };

  const getAllEmployeesSummary = (startDate: Date, endDate: Date) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    return users
      .filter((u: any) => u.role === 'employee')
      .map((user: any) => {
        const userRecords = records.filter((r) => {
          if (r.userId !== user.id) return false;
          const recordDate = parseISO(r.timestamp);
          return isWithinInterval(recordDate, {
            start: startOfDay(startDate),
            end: endOfDay(endDate),
          });
        });

        const workDays = getWorkDays(startDate, endDate, user.id);
        const totalHours = workDays.reduce((sum, day) => sum + day.totalHours, 0);
        const daysWorked = workDays.filter((d) => d.totalHours > 0).length;

        return {
          user,
          totalHours: Math.round(totalHours * 100) / 100,
          daysWorked,
          averageHoursPerDay: daysWorked > 0 ? Math.round((totalHours / daysWorked) * 100) / 100 : 0,
          records: userRecords,
        };
      });
  };

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
  };
}
