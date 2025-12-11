import { useState } from 'react';
import { useTimeRecords } from '@/hooks/useTimeRecords';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileBarChart, Download, Filter, Calendar, Clock, Users } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User } from '@/types';

export default function Relatorios() {
  const { getAllEmployeesSummary, getWorkDays, records } = useTimeRecords();
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [minHours, setMinHours] = useState<string>('');
  const [maxHours, setMaxHours] = useState<string>('');

  const users: User[] = JSON.parse(localStorage.getItem('users') || '[]').filter(
    (u: User) => u.role === 'employee'
  );

  const start = parseISO(startDate);
  const end = parseISO(endDate);

  let reportData = getAllEmployeesSummary(start, end);

  // Filter by employee
  if (selectedEmployee !== 'all') {
    reportData = reportData.filter((d: any) => d.user.id === selectedEmployee);
  }

  // Filter by hours range
  if (minHours) {
    reportData = reportData.filter((d: any) => d.totalHours >= parseFloat(minHours));
  }
  if (maxHours) {
    reportData = reportData.filter((d: any) => d.totalHours <= parseFloat(maxHours));
  }

  const totalHoursAll = reportData.reduce((sum: number, d: any) => sum + d.totalHours, 0);
  const totalDaysAll = reportData.reduce((sum: number, d: any) => sum + d.daysWorked, 0);

  const exportToCSV = () => {
    const headers = ['Funcionário', 'Departamento', 'Horas Totais', 'Dias Trabalhados', 'Média Diária'];
    const rows = reportData.map((d: any) => [
      d.user.name,
      d.user.department,
      d.totalHours.toFixed(2),
      d.daysWorked,
      d.averageHoursPerDay.toFixed(2),
    ]);

    const csv = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-ponto-${startDate}-${endDate}.csv`;
    link.click();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold">Relatórios</h1>
            <p className="text-muted-foreground">
              Analise dados de ponto com filtros avançados
            </p>
          </div>
          <Button onClick={exportToCSV} className="gradient-bg">
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Data Inicial</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Data Final</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Funcionário</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="minHours">Horas Mín.</Label>
                <Input
                  id="minHours"
                  type="number"
                  placeholder="0"
                  value={minHours}
                  onChange={(e) => setMinHours(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxHours">Horas Máx.</Label>
                <Input
                  id="maxHours"
                  type="number"
                  placeholder="999"
                  value={maxHours}
                  onChange={(e) => setMaxHours(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold">{reportData.length}</p>
                  <p className="text-sm text-muted-foreground">Funcionários</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold">{totalHoursAll.toFixed(1)}h</p>
                  <p className="text-sm text-muted-foreground">Horas Totais</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold">{totalDaysAll}</p>
                  <p className="text-sm text-muted-foreground">Dias Trabalhados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <FileBarChart className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-display font-bold">
                    {reportData.length > 0
                      ? (totalHoursAll / reportData.length).toFixed(1)
                      : '0.0'}
                    h
                  </p>
                  <p className="text-sm text-muted-foreground">Média por Pessoa</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileBarChart className="h-5 w-5 text-primary" />
              Dados do Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/50">
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead className="text-right">Horas Totais</TableHead>
                    <TableHead className="text-right">Dias</TableHead>
                    <TableHead className="text-right">Média Diária</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Nenhum dado encontrado para os filtros selecionados
                      </TableCell>
                    </TableRow>
                  ) : (
                    reportData.map((data: any) => (
                      <TableRow key={data.user.id} className="hover:bg-secondary/30">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-primary-foreground text-sm font-semibold">
                              {data.user.name
                                .split(' ')
                                .map((n: string) => n[0])
                                .join('')
                                .slice(0, 2)}
                            </div>
                            {data.user.name}
                          </div>
                        </TableCell>
                        <TableCell>{data.user.department}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {data.totalHours.toFixed(2)}h
                        </TableCell>
                        <TableCell className="text-right">{data.daysWorked}</TableCell>
                        <TableCell className="text-right">
                          {data.averageHoursPerDay.toFixed(2)}h
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              data.totalHours >= 160
                                ? 'default'
                                : data.totalHours >= 120
                                ? 'secondary'
                                : 'destructive'
                            }
                          >
                            {data.totalHours >= 160
                              ? 'Excelente'
                              : data.totalHours >= 120
                              ? 'Regular'
                              : 'Baixo'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
