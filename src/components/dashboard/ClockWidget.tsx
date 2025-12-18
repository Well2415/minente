import { useAuth } from '@/contexts/AuthContext';
import { useSharedTimeRecords } from '@/contexts/TimeRecordsContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Square, Coffee, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from "@/components/ui/use-toast";
import { formatHoursDecimal } from '@/lib/utils';
import axios, { AxiosError } from 'axios'; // Adicionar AxiosError


export function ClockWidget() {
  const { user } = useAuth();
  const {
    addRecord,
    getLastRecord,
    getTodayRecords,
    currentTime = new Date(),
    todayHours,
  } = useSharedTimeRecords();
  const { toast } = useToast();

  // Removido o estado saldoHoras

  const lastRecord = getLastRecord();
  const todayRecords = getTodayRecords();

  const getStatus = () => { // <--- DEFINIÇÃO CORRETA DA FUNÇÃO
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
  }; // <--- FIM DA FUNÇÃO

  const status = getStatus(); // <--- CHAMADA DA FUNÇÃO AQUI

  // Removido o Effect para calcular saldo de horas


  const handleClockIn = async () => {
    if (!user || !user.employeeId) { // Adicionar verificação para employeeId
      toast({
        title: 'Erro de autenticação',
        description: 'Usuário não vinculado a um funcionário. Faça login novamente ou contate o administrador.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await addRecord({
        employeeId: user.employeeId, // Alterado de userId para employeeId
        type: 'clock-in',
        timestamp: new Date().toISOString(),
      });
      toast({
        title: 'Entrada registrada!',
        description: `Você iniciou sua jornada às ${format(new Date(), 'HH:mm')}`,
      });
    } catch (error) {
      let descriptionMessage = 'Não foi possível registrar sua entrada. Tente novamente.';
      if (axios.isAxiosError(error) && error.response?.data?.error === 'Funcionário não encontrado.') { // Removido status 404, pois agora o erro pode ser outro
        descriptionMessage = 'Seu usuário não está vinculado a um funcionário (verificação de employeeId falhou no backend). Por favor, entre em contato com o administrador.';
      } else if (axios.isAxiosError(error) && error.response?.data?.error) {
        descriptionMessage = error.response.data.error; // Exibir mensagem de erro do backend
      }
      toast({
        title: 'Erro ao registrar entrada',
        description: descriptionMessage,
        variant: 'destructive',
      });
      console.error('Erro ao registrar entrada:', error);
    }
  };

  const handleClockOut = async () => {
    if (!user || !user.employeeId) { // Adicionar verificação para employeeId
      toast({
        title: 'Erro de autenticação',
        description: 'Usuário não vinculado a um funcionário. Faça login novamente ou contate o administrador.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await addRecord({
        employeeId: user.employeeId, // Alterado de userId para employeeId
        type: 'clock-out',
        timestamp: new Date().toISOString(),
      });
      toast({
        title: 'Saída registrada!',
        description: `Você encerrou sua jornada às ${format(new Date(), 'HH:mm')}`,
      });
    } catch (error) {
      let descriptionMessage = 'Não foi possível registrar sua saída. Tente novamente.';
      if (axios.isAxiosError(error) && error.response?.data?.error === 'Funcionário não encontrado.') {
        descriptionMessage = 'Seu usuário não está vinculado a um funcionário (verificação de employeeId falhou no backend). Por favor, entre em contato com o administrador.';
      } else if (axios.isAxiosError(error) && error.response?.data?.error) {
        descriptionMessage = error.response.data.error;
      }
      toast({
        title: 'Erro ao registrar saída',
        description: descriptionMessage,
        variant: 'destructive',
      });
      console.error('Erro ao registrar saída:', error);
    }
  };

  const handleBreakStart = async () => {
    if (!user || !user.employeeId) { // Adicionar verificação para employeeId
      toast({
        title: 'Erro de autenticação',
        description: 'Usuário não vinculado a um funcionário. Faça login novamente ou contate o administrador.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await addRecord({
        employeeId: user.employeeId, // Alterado de userId para employeeId
        type: 'break-start',
        timestamp: new Date().toISOString(),
      });
      toast({
        title: 'Pausa iniciada!',
        description: 'Aproveite seu descanso.',
      });
    } catch (error) {
      let descriptionMessage = 'Não foi possível iniciar sua pausa. Tente novamente.';
      if (axios.isAxiosError(error) && error.response?.data?.error === 'Funcionário não encontrado.') {
        descriptionMessage = 'Seu usuário não está vinculado a um funcionário (verificação de employeeId falhou no backend). Por favor, entre em contato com o administrador.';
      } else if (axios.isAxiosError(error) && error.response?.data?.error) {
        descriptionMessage = error.response.data.error;
      }
      toast({
        title: 'Erro ao iniciar pausa',
        description: descriptionMessage,
        variant: 'destructive',
      });
      console.error('Erro ao iniciar pausa:', error);
    }
  };

  const handleBreakEnd = async () => {
    if (!user || !user.employeeId) { // Adicionar verificação para employeeId
      toast({
        title: 'Erro de autenticação',
        description: 'Usuário não vinculado a um funcionário. Faça login novamente ou contate o administrador.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await addRecord({
        employeeId: user.employeeId, // Alterado de userId para employeeId
        type: 'break-end',
        timestamp: new Date().toISOString(),
      });
      toast({
        title: 'Pausa encerrada!',
        description: 'Bem-vindo de volta ao trabalho!',
      });
    } catch (error) {
      let descriptionMessage = 'Não foi possível encerrar sua pausa. Tente novamente.';
      if (axios.isAxiosError(error) && error.response?.data?.error === 'Funcionário não encontrado.') {
        descriptionMessage = 'Seu usuário não está vinculado a um funcionário (verificação de employeeId falhou no backend). Por favor, entre em contato com o administrador.';
      } else if (axios.isAxiosError(error) && error.response?.data?.error) {
        descriptionMessage = error.response.data.error;
      }
      toast({
        title: 'Erro ao encerrar pausa',
        description: descriptionMessage,
        variant: 'destructive',
      });
      console.error('Erro ao encerrar pausa:', error);
    }
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
            <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur p-1 flex items-center justify-center">
              <img src="/img/LOGOSISTEMA.png" alt="SerpPonto Logo" className="h-5 w-5" />
            </div>
            <span className="font-medium">Relógio de Ponto</span>
          </div>
          <Badge className={statusConfig[status].color}>
            {statusConfig[status].label}
          </Badge>
        </div>

        <div className="text-center">
          <p className="text-5xl font-display font-bold tracking-tight">
            {currentTime instanceof Date && !isNaN(currentTime.getTime()) ? format(currentTime, 'HH:mm:ss') : '--:--:--'}
          </p>
          <p className="text-primary-foreground/80 mt-1">
            {currentTime instanceof Date && !isNaN(currentTime.getTime()) ? format(currentTime, "EEEE, d 'de' MMMM", { locale: ptBR }) : 'Data Inválida'}
          </p>
        </div>
      </div>

      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Horas hoje</p>
            <p className="text-2xl font-display font-bold">{formatHoursDecimal(todayHours)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Registros</p>
            <p className="text-2xl font-display font-bold">{todayRecords.length}</p>
          </div>
        </div>
        
        {/* Removido o elemento para exibir o Saldo de Horas */}

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

