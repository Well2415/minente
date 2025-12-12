import { useState, useEffect, useCallback } from 'react';
import { format, parseISO, isAfter, isBefore, setHours, setMinutes, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useTimeRecords } from '@/hooks/useTimeRecords';
import { User, TimeRecordType } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Clock as ClockIcon, ArrowLeft } from 'lucide-react'; // Renomear para evitar conflito e adicionar ArrowLeft
import { Badge } from '@/components/ui/badge'; // Importar Badge
import { useNavigate } from 'react-router-dom'; // Importar useNavigate
import { useNotifications } from '@/hooks/useNotifications'; // Importar useNotifications
import { toast as sonnerToast } from 'sonner'; // Importar toast do Sonner

export default function PontoRapido() {
  const { addNotification } = useNotifications(); // Inicializar useNotifications
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const { addRecord, records, getEffectiveWorkSchedule, parseWorkSchedule, getTodayRecords, getLastRecord } = useTimeRecords(selectedEmployeeId || undefined);
  const [employeeCurrentStatus, setEmployeeCurrentStatus] = useState<'clock-in' | 'break-start' | 'clock-out' | null>(null);
  const navigate = useNavigate(); // Hook para navegação
  const [currentTime, setCurrentTime] = useState(new Date()); // Declaração do estado currentTime
  const [employees, setEmployees] = useState<User[]>([]); // Declaração do estado employees

  // Effect para o relógio
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Carrega a lista de funcionários
  useEffect(() => {
    const storedUsers = JSON.parse(localStorage.getItem('users') || '[]');
    setEmployees(storedUsers.filter((u: User) => u.role === 'employee'));
  }, []);

  // Atualiza o status do funcionário selecionado
  useEffect(() => {
    if (selectedEmployeeId) {
      // records já está filtrado para selectedEmployeeId devido ao useTimeRecords(selectedEmployeeId)
      const employeeRecords = records.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      const lastRecord = employeeRecords.length > 0 ? employeeRecords[employeeRecords.length - 1] : null;

      if (!lastRecord || lastRecord.type === 'clock-out') {
        setEmployeeCurrentStatus('clocked-out');
      } else if (lastRecord.type === 'clock-in' || lastRecord.type === 'break-end') {
        setEmployeeCurrentStatus('clocked-in');
      } else if (lastRecord.type === 'break-start') {
        setEmployeeCurrentStatus('on-break');
      }
    } else {
      setEmployeeCurrentStatus(null);
    }
  }, [selectedEmployeeId, records]);

  const handleRecord = useCallback((type: TimeRecordType) => {
    if (!selectedEmployeeId) {
      sonnerToast.error(
        'Selecione um funcionário',
        { description: 'Por favor, escolha um funcionário para registrar o ponto.' }
      );
      return;
    }

    // --- Lógica de Aviso de Inconsistência de Horário ---
    const employee = employees.find(e => e.id === selectedEmployeeId);
    if (employee) {
        const effectiveSchedule = getEffectiveWorkSchedule(employee.id, currentTime);
        let scheduleToParse: string | undefined = undefined;

        // Determinar qual workSchedule usar (sábado ou dia de semana)
        const dayOfWeek = format(currentTime, 'EEEE', { locale: ptBR }).toLowerCase();
        if (dayOfWeek === 'sábado' && effectiveSchedule?.saturdayWorkSchedule) {
          scheduleToParse = effectiveSchedule.saturdayWorkSchedule;
        } else if (effectiveSchedule?.workSchedule) {
          scheduleToParse = effectiveSchedule.workSchedule;
        }

        if (scheduleToParse) {
            const periods = scheduleToParse.split(',').map(p => p.trim());
            let expectedStart: Date | null = null;
            let expectedEnd: Date | null = null;

            // Determinar a data de referência para o início do turno
            // Se currentTime já está na "madrugada" do dia seguinte (antes do fim do turno, mas depois da meia-noite),
            // então o turno começou no dia anterior.
            let referenceDateForShift = new Date(currentTime);
            const firstPeriodStartH = Number(periods[0].split('-')[0].split(':')[0]);
            const firstPeriodEndH = Number(periods[0].split('-')[1].split(':')[0]);

            // Se o turno vira o dia (ex: 18:00-03:00) E o currentTime está na janela do 'dia seguinte' do turno
            if ((firstPeriodEndH < firstPeriodStartH) && isBefore(currentTime, setHours(setMinutes(new Date(currentTime), 0), firstPeriodEndH + 1))) { // +1h para dar uma margem
                referenceDateForShift = subDays(referenceDateForShift, 1);
            }
            

            for (const period of periods) {
                const [startStr, endStr] = period.split('-');
                if (startStr && endStr) {
                    const [startH, startM] = startStr.split(':').map(Number);
                    const [endH, endM] = endStr.split(':').map(Number);

                    let periodStartCandidate = setMinutes(setHours(new Date(referenceDateForShift), startH), startM);
                    let periodEndCandidate = setMinutes(setHours(new Date(referenceDateForShift), endH), endM);
                    
                    // Se o turno vira o dia (endH < startH), o periodEndCandidate sempre deve ser no dia seguinte
                    if (endH < startH || (endH === startH && endM < startM)) {
                        periodEndCandidate = addDays(periodEndCandidate, 1); 
                    }

                    if (!expectedStart || isBefore(periodStartCandidate, expectedStart)) {
                        expectedStart = periodStartCandidate;
                    }
                    if (!expectedEnd || isAfter(periodEndCandidate, expectedEnd)) {
                        expectedEnd = periodEndCandidate;
                    }
                }
            }

            const gracePeriodMinutes = 30; // Minutos de tolerância
            let showAlert = false;
            let alertMessage = '';

            // Nova lógica: verificar se o currentTime está dentro de algum período de trabalho esperado
            let isWithinAnyWorkPeriod = false;
            const periodToleranceMinutes = 15; // Margem de tolerância para o início/fim dos períodos

            for (const period of periods) {
                const [startStr, endStr] = period.split('-');
                if (startStr && endStr) {
                    const [startH, startM] = startStr.split(':').map(Number);
                    const [endH, endM] = endStr.split(':').map(Number);

                    let periodStart = setMinutes(setHours(new Date(referenceDateForShift), startH), startM);
                    let periodEnd = setMinutes(setHours(new Date(referenceDateForShift), endH), endM);
                    
                    if (endH < startH || (endH === startH && endM < startM)) {
                        periodEnd = addDays(periodEnd, 1);
                    }

                    const bufferedPeriodStart = setMinutes(periodStart, periodStart.getMinutes() - periodToleranceMinutes);
                    const bufferedPeriodEnd = setMinutes(periodEnd, periodEnd.getMinutes() + periodToleranceMinutes);

                    if (isAfter(currentTime, bufferedPeriodStart) && isBefore(currentTime, bufferedPeriodEnd)) {
                        isWithinAnyWorkPeriod = true;
                        break;
                    }
                }
            }

            // Se o ponto não é um 'clock-out' e não está dentro de nenhum período de trabalho esperado
            if (!isWithinAnyWorkPeriod && type !== 'clock-out') {
                showAlert = true;
                alertMessage = `Você está registrando um ${type === 'clock-in' ? 'entrada' : type === 'break-start' ? 'início de intervalo' : 'fim de intervalo'} fora de qualquer período de trabalho esperado para hoje.`;
            }
            // Para 'clock-out', podemos ser mais flexíveis ou ter uma mensagem diferente
            else if (!isWithinAnyWorkPeriod && type === 'clock-out') {
                 showAlert = true;
                 alertMessage = `Você está registrando a saída fora de qualquer período de trabalho esperado para hoje.`;
            }

            if (type === 'clock-in' && expectedStart) {
                const bufferStart = setMinutes(expectedStart, expectedStart.getMinutes() - gracePeriodMinutes);
                if (isBefore(currentTime, bufferStart)) {
                    showAlert = true;
                    alertMessage = `Você está registrando a entrada muito antes do esperado. Sua jornada começa às ${format(expectedStart, 'HH:mm')}.`;
                }
            } else if (type === 'clock-out' && expectedEnd) {
                const bufferEnd = setMinutes(expectedEnd, expectedEnd.getMinutes() + gracePeriodMinutes);
                 if (isAfter(currentTime, bufferEnd)) { // Se a saída é muito depois
                    showAlert = true;
                    alertMessage = `Você está registrando a saída muito depois do esperado. Sua jornada termina às ${format(expectedEnd, 'HH:mm')}.`;
                } else if (isBefore(currentTime, setMinutes(expectedEnd, expectedEnd.getMinutes() - gracePeriodMinutes)) ) {
                    // Aviso para saída muito antes
                     showAlert = true;
                     alertMessage = `Você está registrando a saída muito antes do esperado. Sua jornada termina às ${format(expectedEnd, 'HH:mm')}.`;
                }
            } else if ((type === 'break-start' || type === 'break-end') && expectedStart && expectedEnd) {
                // Para intervalo, verificar se está dentro da jornada esperada
                const isCurrentTimeWithinWorkPeriod = isAfter(currentTime, expectedStart) && isBefore(currentTime, expectedEnd);
                if (!isCurrentTimeWithinWorkPeriod) {
                    showAlert = true;
                    alertMessage = `Você está registrando um ${type === 'break-start' ? 'início' : 'fim'} de intervalo fora do horário de trabalho esperado (${format(expectedStart, 'HH:mm')} - ${format(expectedEnd, 'HH:mm')}).`;
                }
            }


            if (showAlert) {
                sonnerToast.error(
                    'Atenção: Inconsistência de Ponto',
                    { description: `${alertMessage} Por favor, verifique sua escala ou informe seu gerente.` }
                );
                if (employee) { // Garantir que o funcionário existe antes de notificar o gerente
                  addNotification(
                    `Inconsistência de ponto para ${employee.name}: ${alertMessage}`,
                    'warning', // Ou 'error' dependendo da severidade que queremos para o gerente
                    `/funcionarios?id=${employee.id}` // Link para detalhes do funcionário
                  );
                }
            }
        } else {
            console.log('Nenhum scheduleToParse encontrado para o funcionário ou dia atual.');
        }
    } else {
        console.log('Funcionário não encontrado com o ID:', selectedEmployeeId);
    }
    // --- Fim da Lógica de Aviso ---

    // Lógica para verificar se a ação é permitida
    // records já está filtrado para selectedEmployeeId
    const todayRecords = getTodayRecords();
    const lastTodayRecord = getLastRecord();

    let isValidAction = true;
    let message = '';



    switch (type) {
        case 'clock-in':
            if (lastTodayRecord && (lastTodayRecord.type === 'clock-in' || lastTodayRecord.type === 'break-end')) {
                isValidAction = false;
                message = 'Você já possui um registro de entrada ou fim de intervalo ativo para hoje.';
            }
            break;
        case 'clock-out':
            // Pode sair se o último registro for clock-in ou break-end (ou seja, está trabalhando)
            if (!lastTodayRecord || (lastTodayRecord.type !== 'clock-in' && lastTodayRecord.type !== 'break-end')) {
                isValidAction = false;
                message = 'Não há registro de entrada ativo para registrar a saída ou você está em intervalo.';
            }
            break;
        case 'break-start':
            // Pode iniciar intervalo se o último registro for clock-in ou break-end (ou seja, está trabalhando)
            if (!lastTodayRecord || (lastTodayRecord.type !== 'clock-in' && lastTodayRecord.type !== 'break-end')) {
                isValidAction = false;
                message = 'Você precisa estar com um registro de entrada ativo para iniciar um intervalo.';
            }
            break;
        case 'break-end':
            if (!lastTodayRecord || lastTodayRecord.type !== 'break-start') {
                isValidAction = false;
                message = 'Você precisa estar em intervalo para registrar o fim do intervalo.';
            }
            break;
        default:
            break;
    }


    if (!isValidAction) {
        sonnerToast.error(
            'Ação inválida',
            { description: message }
        );
        return;
    }


    addRecord({
      userId: selectedEmployeeId,
      type: type,
      timestamp: currentTime.toISOString(),
    });

    sonnerToast.success(
      'Ponto registrado!',
      { description: `Registro de ${type} para ${employees.find(e => e.id === selectedEmployeeId)?.name} às ${format(currentTime, 'HH:mm:ss')}.` }
    );
  }, [selectedEmployeeId, currentTime, records, employees, addRecord, getEffectiveWorkSchedule, parseWorkSchedule]);


  const getStatusText = useCallback(() => {
    if (!selectedEmployeeId) return 'Selecione um funcionário';

    const employee = employees.find(e => e.id === selectedEmployeeId);
    if (!employee) return 'Funcionário não encontrado';

    // getTodayRecords agora já filtra pelo currentUserId (selectedEmployeeId) do hook
    const todayRecords = getTodayRecords();
    const lastRecord = getLastRecord(); // getLastRecord também já usa o currentUserId do hook

    if (!lastRecord) {
        return `${employee.name}: Pronto para Entrada`;
    }

    switch (lastRecord.type) {
        case 'clock-in':
            return `${employee.name}: Entrada registrada. Aguardando saída ou intervalo.`;
        case 'clock-out':
            return `${employee.name}: Saída registrada. Dia concluído.`;
        case 'break-start':
            return `${employee.name}: Em intervalo.`;
        case 'break-end':
            return `${employee.name}: Intervalo encerrado. Aguardando saída.`;
        default:
            return `${employee.name}: Status desconhecido.`;
    }
  }, [selectedEmployeeId, employees, getTodayRecords, getLastRecord]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 select-none">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 left-4 text-muted-foreground hover:text-foreground"
        onClick={() => navigate('/login')}
        aria-label="Voltar para a página de login"
      >
        <ArrowLeft className="h-6 w-6" />
      </Button>
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardContent className="p-8 space-y-8"> {/* Padding e espaçamento aumentados */}
          <div className="text-center">
            <img src="/img/LOGOSISTEMA.png" alt="Logo da Empresa" className="max-h-24 mx-auto mb-6" /> {/* Logo da empresa */}
            <h1 className="text-4xl font-display font-bold mb-4">Terminal de Ponto</h1> {/* Novo Título */}
            <div className="text-7xl font-bold font-mono text-primary mb-2"> {/* Relógio maior */}
              {format(currentTime, 'HH:mm:ss')}
            </div>
            <div className="text-2xl text-muted-foreground"> {/* Data maior */}
              {format(currentTime, 'EEEE, dd \'de\' MMMM \'de\' yyyy', { locale: ptBR })}
            </div>
          </div>

          <div className="space-y-4 w-full">
            <Label htmlFor="employeeSelect" className="text-xl">Selecionar Funcionário</Label> {/* Label maior */}
            <Select onValueChange={setSelectedEmployeeId} value={selectedEmployeeId || ''}>
              <SelectTrigger className="w-full h-14 text-lg"> {/* Trigger maior */}
                <SelectValue placeholder="Escolha um funcionário" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedEmployeeId && (
            <div className="flex items-center justify-center gap-2 text-xl font-semibold"> {/* Nome do funcionário destacado */}
              {employees.find(e => e.id === selectedEmployeeId)?.name}
              <Badge variant="secondary" className="text-lg py-1 px-3"> {/* Status com Badge */}
                {getStatusText().split(': ')[1] || getStatusText()}
              </Badge>
            </div>
          )}
          {!selectedEmployeeId && (
            <p className="text-xl text-muted-foreground h-10 flex items-center justify-center">Selecione um funcionário para começar</p>
          )}

          <div className="grid grid-cols-2 gap-4 w-full">
            <Button 
              className="h-20 text-2xl bg-green-600 hover:bg-green-700 text-white" /* Botão de Entrada verde */
              onClick={() => handleRecord('clock-in')}
              disabled={employeeCurrentStatus !== 'clocked-out' || !selectedEmployeeId} // Habilita Entrada se estiver 'clocked-out'
            >
              Entrada
            </Button>
            <Button 
              className="h-20 text-2xl bg-red-600 hover:bg-red-700 text-white" /* Botão de Saída vermelho */
              onClick={() => handleRecord('clock-out')}
              disabled={employeeCurrentStatus !== 'clocked-in' || !selectedEmployeeId} // Habilita Saída se estiver 'clocked-in'
            >
              Saída
            </Button>
            <Button 
              className="h-20 text-2xl" /* Botão de Início Intervalo */
              variant="outline" 
              onClick={() => handleRecord('break-start')}
              disabled={employeeCurrentStatus !== 'clocked-in' || !selectedEmployeeId} // Habilita Início Intervalo se estiver 'clocked-in'
            >
              Início Intervalo
            </Button>
            <Button 
              className="h-20 text-2xl" /* Botão de Fim Intervalo */
              variant="outline" 
              onClick={() => handleRecord('break-end')}
              disabled={employeeCurrentStatus !== 'on-break' || !selectedEmployeeId} // Habilita Fim Intervalo se estiver 'on-break'
            >
              Fim Intervalo
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-muted-foreground text-sm">
        <p>&copy; 2026 Serp Soluções. Todos os direitos reservados.</p>
        <p>Suporte: (62) 98560-2410</p>
      </div>
    </div>
  );
}