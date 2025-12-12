import React, { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar'; // Assumindo que você tem um componente Calendar
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, WorkScheduleTemplate, ShiftSchedule } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '@/contexts/AuthContext';

export default function Escalas() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  const [employees, setEmployees] = useState<User[]>([]);
  const [workScheduleTemplates, setWorkScheduleTemplates] = useState<WorkScheduleTemplate[]>([]);
  const [shiftSchedules, setShiftSchedules] = useState<ShiftSchedule[]>([]);

  const [isShiftDialogOpen, setIsShiftDialogOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftSchedule | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Load data from localStorage
  useEffect(() => {
    if (isManager) {
      const storedUsers = JSON.parse(localStorage.getItem('users') || '[]');
      setEmployees(storedUsers.filter((u: User) => u.role === 'employee'));

      const storedTemplates = JSON.parse(localStorage.getItem('workScheduleTemplates') || '[]');
      setWorkScheduleTemplates(storedTemplates);

      const storedSchedules = JSON.parse(localStorage.getItem('shiftSchedules') || '[]');
      setShiftSchedules(storedSchedules);
    }
  }, [isManager]);

  const getTemplateName = (templateId: string) => {
    return workScheduleTemplates.find(t => t.id === templateId)?.name || 'N/A';
  };

  const getEmployeeName = (userId: string) => {
    return employees.find(e => e.id === userId)?.name || 'N/A';
  };

  const handleAddShift = (userId: string) => {
    setEditingShift({
      id: '',
      userId: userId,
      date: format(new Date(), 'yyyy-MM-dd'),
      workScheduleTemplateId: workScheduleTemplates[0]?.id || '', // Pre-select first template
    });
    setSelectedDate(new Date());
    setIsShiftDialogOpen(true);
  };

  const handleEditShift = (shift: ShiftSchedule) => {
    setEditingShift(shift);
    setSelectedDate(parseISO(shift.date));
    setIsShiftDialogOpen(true);
  };

  const handleDeleteShift = (shiftId: string) => {
    const updatedSchedules = shiftSchedules.filter(s => s.id !== shiftId);
    setShiftSchedules(updatedSchedules);
    localStorage.setItem('shiftSchedules', JSON.stringify(updatedSchedules));
    toast({
      title: 'Agendamento excluído!',
      description: 'O turno foi removido com sucesso.',
    });
  };

  const handleSaveShift = () => {
    if (!editingShift || !editingShift.userId || !editingShift.workScheduleTemplateId || !selectedDate) {
      toast({
        title: 'Erro',
        description: 'Por favor, preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    const shiftToSave: ShiftSchedule = {
      ...editingShift,
      id: editingShift.id || uuidv4(),
      date: format(selectedDate, 'yyyy-MM-dd'),
    };

    let updatedSchedules;
    if (shiftToSave.id && shiftSchedules.some(s => s.id === shiftToSave.id)) {
      updatedSchedules = shiftSchedules.map(s => s.id === shiftToSave.id ? shiftToSave : s);
    } else {
      updatedSchedules = [...shiftSchedules, shiftToSave];
    }

    setShiftSchedules(updatedSchedules);
    localStorage.setItem('shiftSchedules', JSON.stringify(updatedSchedules));
    toast({
      title: 'Sucesso!',
      description: 'Agendamento salvo com sucesso.',
    });
    setIsShiftDialogOpen(false);
    setEditingShift(null);
  };

  if (!isManager) {
    return (
      <AppLayout>
        <div className="space-y-6 p-4">
          <h1 className="text-3xl font-display font-bold">Acesso Negado</h1>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Gestão de Escalas</h1>
          <p className="text-muted-foreground">
            Atribua modelos de jornada de trabalho a funcionários em datas específicas.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Agendamentos por Funcionário</CardTitle>
            <CardDescription>
              Visualize e gerencie os turnos agendados para cada membro da equipe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Modelo de Jornada</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length > 0 ? (
                  employees.map((employee) => (
                    <React.Fragment key={employee.id}>
                      <TableRow className="bg-muted/50">
                        <TableCell className="font-medium" colSpan={3}>
                          {employee.name} ({employee.department})
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" onClick={() => handleAddShift(employee.id)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Agendar Turno
                          </Button>
                        </TableCell>
                      </TableRow>
                      {shiftSchedules
                        .filter(s => s.userId === employee.id)
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .map((shift) => (
                          <TableRow key={shift.id}>
                            <TableCell></TableCell> {/* Empty cell for alignment */}
                            <TableCell>{format(parseISO(shift.date), 'dd/MM/yyyy')}</TableCell>
                            <TableCell>{getTemplateName(shift.workScheduleTemplateId)}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => handleEditShift(shift)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteShift(shift.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      {shiftSchedules.filter(s => s.userId === employee.id).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            Nenhum turno agendado para este funcionário.
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center h-24">
                      Nenhum funcionário cadastrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialog para Adicionar/Editar Agendamento */}
        <Dialog open={isShiftDialogOpen} onOpenChange={setIsShiftDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingShift?.id ? 'Editar Agendamento' : 'Adicionar Novo Agendamento'}</DialogTitle>
            </DialogHeader>
            {editingShift && (
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label>Funcionário</Label>
                  <Input value={getEmployeeName(editingShift.userId)} readOnly />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shiftDate">Data</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={`w-full justify-start text-left font-normal ${!selectedDate && "text-muted-foreground"}`}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? format(selectedDate, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workScheduleTemplateId">Modelo de Jornada</Label>
                  <Select
                    value={editingShift.workScheduleTemplateId}
                    onValueChange={(value) => setEditingShift({...editingShift, workScheduleTemplateId: value})}
                  >
                    <SelectTrigger id="workScheduleTemplateId">
                      <SelectValue placeholder="Selecione um modelo de jornada" />
                    </SelectTrigger>
                    <SelectContent>
                      {workScheduleTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsShiftDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveShift}>Salvar Agendamento</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
