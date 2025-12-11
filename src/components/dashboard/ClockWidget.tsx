import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTimeRecords } from '@/hooks/useTimeRecords';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Coffee, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export function ClockWidget() {
  const { user } = useAuth();
  const { addRecord, getLastRecord, getTodayRecords, calculateDayHours } = useTimeRecords(user?.id);
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayHours, setTodayHours] = useState(0);

  const lastRecord = getLastRecord();
  const todayRecords = getTodayRecords();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      setTodayHours(calculateDayHours(todayRecords));
    }, 1000);

    return () => clearInterval(timer);
  }, [todayRecords, calculateDayHours]);

  const getStatus = () => {
    if (!lastRecord) return 'not-started';
    switch (lastRecord.type) {
      case 'clock-in':
        return 'working';
      case 'break-start':
        return 'on-break';
      case 'clock-out':
        return 'finished';
      case 'break-end':
        return 'working';
      default:
        return 'not-started';
    }
  };

  const status = getStatus();

  const handleClockIn = () => {
    addRecord({
      userId: user!.id,
      type: 'clock-in',
      timestamp: new Date().toISOString(),
    });
    toast({
      title: 'Entrada registrada!',
      description: `Você iniciou sua jornada às ${format(new Date(), 'HH:mm')}`,
    });
  };

  const handleClockOut = () => {
    addRecord({
      userId: user!.id,
      type: 'clock-out',
      timestamp: new Date().toISOString(),
    });
    toast({
      title: 'Saída registrada!',
      description: `Você encerrou sua jornada às ${format(new Date(), 'HH:mm')}`,
    });
  };

  const handleBreakStart = () => {
    addRecord({
      userId: user!.id,
      type: 'break-start',
      timestamp: new Date().toISOString(),
    });
    toast({
      title: 'Pausa iniciada!',
      description: 'Aproveite seu descanso.',
    });
  };

  const handleBreakEnd = () => {
    addRecord({
      userId: user!.id,
      type: 'break-end',
      timestamp: new Date().toISOString(),
    });
    toast({
      title: 'Pausa encerrada!',
      description: 'Bem-vindo de volta ao trabalho!',
    });
  };

  const statusConfig = {
    'not-started': {
      label: 'Não iniciado',
      color: 'bg-muted text-muted-foreground',
    },
    working: {
      label: 'Trabalhando',
      color: 'bg-success text-success-foreground',
    },
    'on-break': {
      label: 'Em pausa',
      color: 'bg-warning text-warning-foreground',
    },
    finished: {
      label: 'Finalizado',
      color: 'bg-primary text-primary-foreground',
    },
  };

  return (
    <Card className="overflow-hidden">
      <div className="gradient-bg p-6 text-primary-foreground">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            <span className="font-medium">Relógio de Ponto</span>
          </div>
          <Badge className={statusConfig[status].color}>
            {statusConfig[status].label}
          </Badge>
        </div>
        
        <div className="text-center">
          <p className="text-5xl font-display font-bold tracking-tight">
            {format(currentTime, 'HH:mm:ss')}
          </p>
          <p className="text-primary-foreground/80 mt-1">
            {format(currentTime, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
      </div>

      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Horas hoje</p>
            <p className="text-2xl font-display font-bold">{todayHours.toFixed(2)}h</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Registros</p>
            <p className="text-2xl font-display font-bold">{todayRecords.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {status === 'not-started' || status === 'finished' ? (
            <Button
              onClick={handleClockIn}
              className="col-span-2 h-12 gradient-bg text-lg font-semibold"
            >
              <Play className="mr-2 h-5 w-5" />
              Iniciar Jornada
            </Button>
          ) : (
            <>
              <Button
                onClick={handleClockOut}
                variant="destructive"
                className="h-12"
              >
                <Square className="mr-2 h-4 w-4" />
                Encerrar
              </Button>
              {status === 'working' ? (
                <Button
                  onClick={handleBreakStart}
                  variant="outline"
                  className="h-12"
                >
                  <Coffee className="mr-2 h-4 w-4" />
                  Pausar
                </Button>
              ) : (
                <Button
                  onClick={handleBreakEnd}
                  variant="secondary"
                  className="h-12"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Retomar
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
