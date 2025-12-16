import { useState, useEffect } from 'react';
import { User, WorkScheduleTemplate } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { v4 as uuidv4 } from 'uuid';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EmployeeFormProps {
  employee: User | null;
  onSave?: (employee: User) => void;
  onClose: () => void;
}

export default function EmployeeForm({ employee, onSave, onClose }: EmployeeFormProps) {
  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    email: '',
    department: '',
    ctps: '',
    admissionDate: '',
    role: 'employee',
    workScheduleTemplateId: '', // Novo campo para o ID do template
  });
  const [workScheduleTemplates, setWorkScheduleTemplates] = useState<WorkScheduleTemplate[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Carrega os modelos de jornada do localStorage
    const storedTemplates = JSON.parse(localStorage.getItem('workScheduleTemplates') || '[]');
    setWorkScheduleTemplates(storedTemplates);

    if (employee) {
      setFormData({
        ...employee,
        workScheduleTemplateId: employee.workScheduleTemplateId || '', // Define o ID do template se existir
      });
    }
  }, [employee]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };
  
  const handleSelectChange = (value: string, id: string) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      toast({
        title: 'Erro',
        description: 'Nome e Email são campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }
    if (!formData.workScheduleTemplateId) {
      toast({
        title: 'Erro',
        description: 'Selecione um modelo de jornada de trabalho.',
        variant: 'destructive',
      });
      return;
    }

    const userToSave: User = {
      ...formData,
      id: employee?.id || uuidv4(),
      role: 'employee',
      name: formData.name || '',
      email: formData.email || '',
      department: formData.department || '',
      workScheduleTemplateId: formData.workScheduleTemplateId || '', // Garantir que o template ID seja salvo
    };
    
    onSave?.(userToSave);
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle>{employee ? 'Editar Funcionário' : 'Adicionar Novo Funcionário'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input id="name" value={formData.name} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email} onChange={handleChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Departamento</Label>
              <Input id="department" value={formData.department} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ctps">CTPS (Nº e Série)</Label>
              <Input id="ctps" value={formData.ctps} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admissionDate">Data de Admissão</Label>
              <Input id="admissionDate" type="date" value={formData.admissionDate} onChange={handleChange} />
            </div>
            {/* Novo Select para Modelos de Jornada */}
            <div className="space-y-2">
              <Label htmlFor="workScheduleTemplateId">Jornada de Trabalho</Label>
              <Select
                value={formData.workScheduleTemplateId}
                onValueChange={(value) => handleSelectChange(value, 'workScheduleTemplateId')}
              >
                <SelectTrigger id="workScheduleTemplateId">
                  <SelectValue placeholder="Selecione uma jornada" />
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
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="gradient-bg">
              Salvar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
