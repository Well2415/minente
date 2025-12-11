import { useTimeRecords } from '@/hooks/useTimeRecords';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, LogIn, LogOut, Coffee, Play } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RecentActivityProps {
  userId?: string;
}

export function RecentActivity({ userId }: RecentActivityProps) {
  const { records } = useTimeRecords(userId);

  const recentRecords = [...records]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10);

  const getRecordIcon = (type: string) => {
    switch (type) {
      case 'clock-in':
        return <LogIn className="h-4 w-4 text-success" />;
      case 'clock-out':
        return <LogOut className="h-4 w-4 text-destructive" />;
      case 'break-start':
        return <Coffee className="h-4 w-4 text-warning" />;
      case 'break-end':
        return <Play className="h-4 w-4 text-primary" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getRecordLabel = (type: string) => {
    switch (type) {
      case 'clock-in':
        return 'Entrada';
      case 'clock-out':
        return 'Saída';
      case 'break-start':
        return 'Início da pausa';
      case 'break-end':
        return 'Fim da pausa';
      default:
        return type;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle>Atividade Recente</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          {recentRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Activity className="h-12 w-12 mb-2 opacity-50" />
              <p>Nenhuma atividade registrada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentRecords.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center">
                    {getRecordIcon(record.type)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{getRecordLabel(record.type)}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(parseISO(record.timestamp), "d 'de' MMMM 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
