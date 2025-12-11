import { useAuth } from '@/contexts/AuthContext';
import { useTimeRecords } from '@/hooks/useTimeRecords';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar, TrendingUp, Users, Timer, CheckCircle } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppLayout } from '@/components/layout/AppLayout';
import { ClockWidget } from '@/components/dashboard/ClockWidget';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { WeeklyChart } from '@/components/dashboard/WeeklyChart';

export default function Dashboard() {
  const { user } = useAuth();
  const { getWorkDays, getAllEmployeesSummary } = useTimeRecords(user?.id);
  const isManager = user?.role === 'manager' || user?.role === 'admin';

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  const weeklyWorkDays = getWorkDays(weekStart, weekEnd, user?.id);
  const weeklyHours = weeklyWorkDays.reduce((sum, day) => sum + day.totalHours, 0);

  const monthlyWorkDays = getWorkDays(monthStart, monthEnd, user?.id);
  const monthlyHours = monthlyWorkDays.reduce((sum, day) => sum + day.totalHours, 0);

  const employeesSummary = isManager ? getAllEmployeesSummary(weekStart, weekEnd) : [];

  const stats = [
    {
      title: 'Horas Hoje',
      value: weeklyWorkDays.find(d => d.date === format(today, 'yyyy-MM-dd'))?.totalHours.toFixed(1) || '0.0',
      suffix: 'h',
      icon: Timer,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Horas na Semana',
      value: weeklyHours.toFixed(1),
      suffix: 'h',
      icon: Calendar,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: 'Horas no Mês',
      value: monthlyHours.toFixed(1),
      suffix: 'h',
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Dias Trabalhados',
      value: monthlyWorkDays.filter(d => d.totalHours > 0).length.toString(),
      suffix: '',
      icon: CheckCircle,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-display font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Acompanhe suas horas trabalhadas e produtividade
          </p>
        </div>

        {/* Clock Widget + Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ClockWidget />
          
          <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <Card key={stat.title} className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                <CardContent className="p-4">
                  <div className={`w-10 h-10 rounded-lg ${stat.bgColor} flex items-center justify-center mb-3`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <p className="text-2xl font-display font-bold">
                    {stat.value}
                    <span className="text-base font-normal text-muted-foreground">{stat.suffix}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Charts and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WeeklyChart workDays={weeklyWorkDays} />
          <RecentActivity userId={user?.id} />
        </div>

        {/* Manager View - Team Summary */}
        {isManager && employeesSummary.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>Resumo da Equipe (Semana Atual)</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {employeesSummary.map((summary: any) => (
                  <div
                    key={summary.user.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-semibold">
                        {summary.user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium">{summary.user.name}</p>
                        <p className="text-sm text-muted-foreground">{summary.user.department}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-right">
                      <div>
                        <p className="font-semibold">{summary.totalHours.toFixed(1)}h</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                      </div>
                      <div>
                        <p className="font-semibold">{summary.daysWorked}</p>
                        <p className="text-xs text-muted-foreground">Dias</p>
                      </div>
                      <Badge variant={summary.totalHours >= 40 ? 'default' : 'secondary'}>
                        {summary.totalHours >= 40 ? 'Meta atingida' : 'Em progresso'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
