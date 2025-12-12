import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTimeRecords } from '@/hooks/useTimeRecords';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Users, Search, Eye, Clock, Calendar, TrendingUp, PlusCircle, Edit } from 'lucide-react';
import { format, startOfWeek, endOfWeek, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, WorkScheduleTemplate } from '@/types'; // Adicionado WorkScheduleTemplate
import { formatHoursDecimal, translateRecordType } from '@/lib/utils';
import EmployeeForm from '@/components/forms/EmployeeForm';
import { useToast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';

export default function Funcionarios() {
  const { user } = useAuth();
  const { records } = useTimeRecords();
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEmployeeDetails, setSelectedEmployeeDetails] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
  const [workScheduleTemplates, setWorkScheduleTemplates] = useState<WorkScheduleTemplate[]>([]); // Novo estado para templates
  const { toast } = useToast();

  useEffect(() => {
    const storedUsers = JSON.parse(localStorage.getItem('users') || '[]') as User[];
    setAllUsers(storedUsers);
    const storedTemplates = JSON.parse(localStorage.getItem('workScheduleTemplates') || '[]');
    setWorkScheduleTemplates(storedTemplates);
  }, []);

  const { getAllEmployeesSummary } = useTimeRecords(allUsers);


  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  const employeesSummary = getAllEmployeesSummary(weekStart, weekEnd);

  const filteredEmployees = employeesSummary.filter((summary: any) =>
    summary.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    summary.user.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getEmployeeTodayRecords = (userId: string) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    return records
      .filter((r) => r.userId === userId && r.timestamp.startsWith(todayStr))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  };

  const getEmployeeStatus = (userId: string) => {
    const todayRecords = getEmployeeTodayRecords(userId);
    if (todayRecords.length === 0) return 'absent';
    
    const lastRecord = todayRecords[todayRecords.length - 1];
    switch (lastRecord.type) {
      case 'clock-in':
      case 'break-end':
        return 'working';
      case 'break-start':
        return 'on-break';
      case 'clock-out':
        return 'finished';
      default:
        return 'absent';
    }
  };

  const statusConfig = {
    absent: { label: 'Ausente', color: 'bg-muted text-muted-foreground' },
    working: { label: 'Trabalhando', color: 'bg-success text-success-foreground' },
    'on-break': { label: 'Em pausa', color: 'bg-warning text-warning-foreground' },
    finished: { label: 'Finalizado', color: 'bg-primary text-primary-foreground' },
  };
  const handleSaveEmployee = (employeeToSave: User) => {
    const storedUsers = JSON.parse(localStorage.getItem('users') || '[]') as User[];
    
    const existingUserIndex = storedUsers.findIndex(u => u.id === employeeToSave.id);
    
    if (existingUserIndex > -1) {
      storedUsers[existingUserIndex] = employeeToSave;
    } else {
      storedUsers.push(employeeToSave);
    }
    
    localStorage.setItem('users', JSON.stringify(storedUsers));
    setAllUsers(storedUsers);
    
    toast({
      title: 'Sucesso!',
      description: `Funcionário ${employeeToSave.name} salvo com sucesso.`,
    });

    setIsFormOpen(false);
    setEditingEmployee(null);
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Funcionários</h1>
            <p className="text-muted-foreground">
              Acompanhe e gerencie sua equipe
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar funcionário..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => { setEditingEmployee(null); setIsFormOpen(true); }} className="gradient-bg">
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar
            </Button>
          </div>
        </div>
        
        {/* Modal de Adicionar/Editar Funcionário */}
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="max-w-3xl">
            <EmployeeForm 
              employee={editingEmployee}
              onSave={handleSaveEmployee}
              onClose={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
        
        {/* Stats Cards ... (código dos cards permanece o mesmo) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold">
                    {employeesSummary.length}
                  </p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold">
                    {employeesSummary.filter((s: any) => getEmployeeStatus(s.user.id) === 'working').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Trabalhando</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold">
                    {employeesSummary.filter((s: any) => getEmployeeStatus(s.user.id) === 'on-break').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Em pausa</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold">
                    {employeesSummary.filter((s: any) => getEmployeeStatus(s.user.id) === 'absent').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Ausentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>


        {/* Employees Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Lista de Funcionários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredEmployees.map((summary: any) => {
                  const status = getEmployeeStatus(summary.user.id);
                  const todayRecords = getEmployeeTodayRecords(summary.user.id);

                  return (
                    <div
                      key={summary.user.id}
                      className="p-4 rounded-lg border hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-12 w-12 border-2 border-primary/20">
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {summary.user.name
                                .split(' ')
                                .map((n: string) => n[0])
                                .join('')
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{summary.user.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {summary.user.department}
                            </p>
                          </div>
                        </div>
                        <Badge className={statusConfig[status].color}>
                          {statusConfig[status].label}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center mb-4">
                        <div className="p-2 bg-secondary/50 rounded">
                          <p className="text-lg font-semibold">{formatHoursDecimal(summary.totalHours)}</p>
                          <p className="text-xs text-muted-foreground">Semana</p>
                        </div>
                        <div className="p-2 bg-secondary/50 rounded">
                          <p className="text-lg font-semibold">{summary.daysWorked}</p>
                          <p className="text-xs text-muted-foreground">Dias</p>
                        </div>
                        <div className="p-2 bg-secondary/50 rounded">
                          <p className="text-lg font-semibold">{formatHoursDecimal(summary.averageHoursPerDay)}</p>
                          <p className="text-xs text-muted-foreground">Média</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              className="w-full"
                              onClick={() => setSelectedEmployeeDetails(summary.user)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Ver detalhes
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback className="bg-primary/10 text-primary">
                                    {summary.user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                {summary.user.name}
                              </DialogTitle>
                            </DialogHeader>
                            {selectedEmployeeDetails && (
                              <div className="space-y-4 py-4">
                                <div className="p-4 bg-secondary/50 rounded-lg">
                                  <p className="text-sm text-muted-foreground mb-1">Departamento</p>
                                  <p className="font-medium">{selectedEmployeeDetails.department}</p>
                                </div>
                                {/* Informações da Jornada de Trabalho */}
                                <div className="p-4 bg-secondary/50 rounded-lg">
                                  <p className="text-sm text-muted-foreground mb-1">Jornada de Trabalho</p>
                                  {selectedEmployeeDetails.workScheduleTemplateId ? (
                                    (() => {
                                      const template = workScheduleTemplates.find(
                                        (t) => t.id === selectedEmployeeDetails.workScheduleTemplateId
                                      );
                                      if (template) {
                                        return (
                                          <>
                                            <p className="font-medium">Modelo: {template.name}</p>
                                            <p className="text-sm text-muted-foreground">Seg-Sex: {template.workSchedule}</p>
                                            {template.saturdayWorkSchedule && <p className="text-sm text-muted-foreground">Sábados: {template.saturdayWorkSchedule}</p>}
                                            {template.weeklyRestDay && <p className="text-sm text-muted-foreground">Descanso: {template.weeklyRestDay}</p>}
                                          </>
                                        );
                                      } else {
                                        return <p className="text-sm text-muted-foreground">Modelo de jornada não encontrado.</p>;
                                      }
                                    })()
                                  ) : (
                                    <p className="text-sm text-muted-foreground">Jornada de trabalho não definida.</p>
                                  )}
                                </div>
                                {/* Registros de hoje */}
                                <div>
                                  <p className="font-medium mb-2">Registros de hoje</p>
                                  <ScrollArea className="h-48 rounded-md border p-4">
                                    {todayRecords.length > 0 ? (
                                      <div className="space-y-2">
                                        {todayRecords.map((record) => (
                                          <div key={record.id} className="flex items-center justify-between p-2 bg-secondary/30 rounded">
                                            <span className="text-sm">{translateRecordType(record.type)}</span>
                                            <span className="text-sm font-medium">{format(parseISO(record.timestamp), 'HH:mm')}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-sm text-muted-foreground">Nenhum registro hoje</p>
                                    )}
                                  </ScrollArea>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                        <Button
                            variant="secondary"
                            className="w-full"
                            onClick={() => { setEditingEmployee(summary.user); setIsFormOpen(true); }}
                        >
                            <Edit className="mr-2 h-4 w-4" />
                            Editar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
