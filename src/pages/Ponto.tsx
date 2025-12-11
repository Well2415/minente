import { useAuth } from '@/contexts/AuthContext';
import { useTimeRecords } from '@/hooks/useTimeRecords';
import { AppLayout } from '@/components/layout/AppLayout';
import { ClockWidget } from '@/components/dashboard/ClockWidget';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar, Clock, LogIn, LogOut, Coffee, Play } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Ponto() {
  const { user } = useAuth();
  const { getWorkDays, records } = useTimeRecords(user?.id);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const workDays = getWorkDays(monthStart, monthEnd, user?.id);

  const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const totalHours = workDays.reduce((sum, day) => sum + day.totalHours, 0);

  const getRecordIcon = (type: string) => {
    switch (type) {
      case 'clock-in':
        return <LogIn className="h-3 w-3 text-success" />;
      case 'clock-out':
        return <LogOut className="h-3 w-3 text-destructive" />;
      case 'break-start':
        return <Coffee className="h-3 w-3 text-warning" />;
      case 'break-end':
        return <Play className="h-3 w-3 text-primary" />;
      default:
        return null;
    }
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Meu Ponto</h1>
          <p className="text-muted-foreground">
            Registre e acompanhe suas horas trabalhadas
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Clock Widget */}
          <ClockWidget />

          {/* Monthly Summary */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <CardTitle>Histórico do Mês</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={previousMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[140px] text-center font-medium">
                    {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                  <Button variant="outline" size="icon" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4 p-4 bg-secondary/50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Total de horas</p>
                  <p className="text-2xl font-display font-bold">{totalHours.toFixed(1)}h</p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Dias trabalhados</p>
                  <p className="text-2xl font-display font-bold">
                    {workDays.filter((d) => d.totalHours > 0).length}
                  </p>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Média diária</p>
                  <p className="text-2xl font-display font-bold">
                    {workDays.filter((d) => d.totalHours > 0).length > 0
                      ? (totalHours / workDays.filter((d) => d.totalHours > 0).length).toFixed(1)
                      : '0.0'}
                    h
                  </p>
                </div>
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {allDays.map((day) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const workDay = workDays.find((wd) => wd.date === dateStr);
                    const dayRecords = records.filter(
                      (r) => r.timestamp.startsWith(dateStr)
                    ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                    const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                    return (
                      <div
                        key={dateStr}
                        className={`p-3 rounded-lg border transition-colors ${
                          isToday
                            ? 'border-primary bg-primary/5'
                            : isWeekend
                            ? 'border-border/50 bg-muted/30'
                            : 'border-border hover:bg-secondary/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold ${
                                isToday
                                  ? 'gradient-bg text-primary-foreground'
                                  : 'bg-secondary text-foreground'
                              }`}
                            >
                              {format(day, 'd')}
                            </div>
                            <div>
                              <p className="font-medium">
                                {format(day, 'EEEE', { locale: ptBR })}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                {dayRecords.map((r) => (
                                  <div
                                    key={r.id}
                                    className="flex items-center gap-1 text-xs"
                                    title={`${r.type} - ${format(parseISO(r.timestamp), 'HH:mm')}`}
                                  >
                                    {getRecordIcon(r.type)}
                                    <span className="text-muted-foreground">
                                      {format(parseISO(r.timestamp), 'HH:mm')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            {workDay && workDay.totalHours > 0 ? (
                              <>
                                <p className="font-semibold">
                                  {workDay.totalHours.toFixed(2)}h
                                </p>
                                <Badge
                                  variant={workDay.status === 'complete' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {workDay.status === 'complete' ? 'Completo' : 'Em andamento'}
                                </Badge>
                              </>
                            ) : isWeekend ? (
                              <Badge variant="outline" className="text-xs">
                                Fim de semana
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">
                                Sem registro
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }).reverse()}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
