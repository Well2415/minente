import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, Clock, Bell, Palette, PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { User, WorkScheduleTemplate } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

const initialScheduleTemplate: WorkScheduleTemplate = {
  id: '',
  name: '',
  workSchedule: '08:00-12:00, 13:00-18:00',
  saturdayWorkSchedule: '',
  weeklyRestDay: 'Domingo',
};


export default function Configuracoes() {
  const { toast } = useToast();
  const { user } = useAuth();
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  // --- Estados para Modelos de Jornada ---
  const [workSchedules, setWorkSchedules] = useState<WorkScheduleTemplate[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<WorkScheduleTemplate | null>(null);

  // --- Outros estados de configuração ---
  const [notifications, setNotifications] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    return savedTheme || 'light';
  });

  // Carrega os modelos de jornada do localStorage
  useEffect(() => {
    if (isManager) {
      const storedSchedules = JSON.parse(localStorage.getItem('workScheduleTemplates') || '[]');
      setWorkSchedules(storedSchedules);
    }
  }, [isManager]);
  
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);


  const handleAddNew = () => {
    setEditingSchedule(initialScheduleTemplate);
    setIsDialogOpen(true);
  };

  const handleEdit = (schedule: WorkScheduleTemplate) => {
    setEditingSchedule(schedule);
    setIsDialogOpen(true);
  };

  const handleDelete = (scheduleId: string) => {
    const updatedSchedules = workSchedules.filter(s => s.id !== scheduleId);
    setWorkSchedules(updatedSchedules);
    localStorage.setItem('workScheduleTemplates', JSON.stringify(updatedSchedules));
    toast({
      title: 'Modelo de jornada excluído!',
      description: 'O modelo de jornada foi removido com sucesso.',
    });
  };

  const handleSaveWorkSchedule = (scheduleToSave: WorkScheduleTemplate) => {
    let updatedSchedules;
    if (scheduleToSave.id) {
      updatedSchedules = workSchedules.map(s => s.id === scheduleToSave.id ? scheduleToSave : s);
    } else {
      updatedSchedules = [...workSchedules, { ...scheduleToSave, id: uuidv4() }];
    }
    setWorkSchedules(updatedSchedules);
    localStorage.setItem('workScheduleTemplates', JSON.stringify(updatedSchedules));
    toast({
      title: 'Sucesso!',
      description: `O modelo de jornada '${scheduleToSave.name}' foi salvo.`,
    });
    setIsDialogOpen(false);
    setEditingSchedule(null);
  };

  const handleSaveGeneralSettings = () => {
    // Lógica para salvar outras configurações gerais (tema, notificações) pode ser adicionada aqui
    toast({
      title: 'Configurações salvas!',
      description: 'As alterações gerais foram aplicadas com sucesso.',
    });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Configurações</h1>
          <p className="text-muted-foreground">
            Personalize o sistema de acordo com suas necessidades
          </p>
        </div>

        <div className="grid gap-6">
          {/* Work Schedule Templates (visible only for manager) */}
          {isManager && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <CardTitle>Modelos de Jornada de Trabalho</CardTitle>
                  </div>
                  <Button onClick={handleAddNew}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Modelo
                  </Button>
                </div>
                <CardDescription>
                  Crie e gerencie os modelos de jornada de trabalho para aplicar aos funcionários.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome do Modelo</TableHead>
                      <TableHead>Horário Padrão</TableHead>
                      <TableHead>Horário Sábados</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workSchedules.length > 0 ? workSchedules.map((schedule) => (
                      <TableRow key={schedule.id}>
                        <TableCell className="font-medium">{schedule.name}</TableCell>
                        <TableCell>{schedule.workSchedule}</TableCell>
                        <TableCell>{schedule.saturdayWorkSchedule || '--'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(schedule)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(schedule.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center h-24">
                          Nenhum modelo de jornada encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Dialog para Adicionar/Editar Modelo de Jornada */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSchedule?.id ? 'Editar Modelo' : 'Adicionar Novo Modelo'}</DialogTitle>
              </DialogHeader>
              {editingSchedule && (
                <div className="py-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Modelo</Label>
                    <Input 
                      id="name" 
                      value={editingSchedule.name} 
                      onChange={(e) => setEditingSchedule({...editingSchedule, name: e.target.value})} 
                      placeholder="Ex: Horário Comercial"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workSchedule">Horário (Seg-Sex)</Label>
                    <Input 
                      id="workSchedule" 
                      value={editingSchedule.workSchedule} 
                      onChange={(e) => setEditingSchedule({...editingSchedule, workSchedule: e.target.value})}
                      placeholder="Ex: 08:00-12:00, 13:00-18:00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="saturdayWorkSchedule">Horário (Sábados)</Label>
                    <Input 
                      id="saturdayWorkSchedule" 
                      value={editingSchedule.saturdayWorkSchedule} 
                      onChange={(e) => setEditingSchedule({...editingSchedule, saturdayWorkSchedule: e.target.value})}
                      placeholder="Ex: 08:00-12:00 (opcional)"
                    />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="weeklyRestDay">Descanso Semanal</Label>
                    <Input 
                      id="weeklyRestDay" 
                      value={editingSchedule.weeklyRestDay} 
                      onChange={(e) => setEditingSchedule({...editingSchedule, weeklyRestDay: e.target.value})}
                      placeholder="Ex: Domingo"
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={() => handleSaveWorkSchedule(editingSchedule!)}>Salvar Modelo</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          {/* Personal Work Hours Settings (visible for non-manager users) - SIMPLIFIED */}
          {!isManager && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <CardTitle>Minhas Configurações</CardTitle>
                </div>
                <CardDescription>
                  Suas configurações pessoais de jornada são definidas pelo seu gerente.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <CardTitle>Notificações</CardTitle>
              </div>
              <CardDescription>
                Gerencie suas preferências de notificação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Lembretes de ponto</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber lembretes para registrar entrada e saída
                  </p>
                </div>
                <Switch checked={notifications} onCheckedChange={setNotifications} />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Relatórios semanais</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber resumo semanal por e-mail
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>



          {/* Theme Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                <CardTitle>Aparência</CardTitle>
              </div>
              <CardDescription>
                Personalize a aparência do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Button 
                  variant="outline" 
                  className={cn("flex-1 h-20", theme === 'light' && "border-2 border-primary")}
                  onClick={() => setTheme('light')}
                >
                  <div className="text-center">
                    <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-white border-2" />
                    <span className="text-sm">Claro</span>
                  </div>
                </Button>
                <Button 
                  variant="outline" 
                  className={cn("flex-1 h-20", theme === 'dark' && "border-2 border-primary")}
                  onClick={() => setTheme('dark')}
                >
                  <div className="text-center">
                    <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-black border-2" />
                    <span className="text-sm">Escuro</span>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSaveGeneralSettings} className="gradient-bg px-8">
              <Settings className="mr-2 h-4 w-4" />
              Salvar Configurações Gerais
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}