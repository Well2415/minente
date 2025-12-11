import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Settings, Clock, Bell, Shield, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Configuracoes() {
  const { toast } = useToast();
  const [workHours, setWorkHours] = useState('8');
  const [breakDuration, setBreakDuration] = useState('60');
  const [notifications, setNotifications] = useState(true);
  const [autoClockOut, setAutoClockOut] = useState(false);

  const handleSave = () => {
    toast({
      title: 'Configurações salvas!',
      description: 'As alterações foram aplicadas com sucesso.',
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
          {/* Work Hours Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <CardTitle>Jornada de Trabalho</CardTitle>
              </div>
              <CardDescription>
                Configure os parâmetros padrão de jornada
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="workHours">Carga horária diária (horas)</Label>
                  <Input
                    id="workHours"
                    type="number"
                    value={workHours}
                    onChange={(e) => setWorkHours(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="breakDuration">Duração do intervalo (minutos)</Label>
                  <Input
                    id="breakDuration"
                    type="number"
                    value={breakDuration}
                    onChange={(e) => setBreakDuration(e.target.value)}
                  />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Saída automática</Label>
                  <p className="text-sm text-muted-foreground">
                    Registrar saída automaticamente após a carga horária
                  </p>
                </div>
                <Switch checked={autoClockOut} onCheckedChange={setAutoClockOut} />
              </div>
            </CardContent>
          </Card>

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

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle>Segurança</CardTitle>
              </div>
              <CardDescription>
                Configurações de segurança e acesso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Autenticação em duas etapas</Label>
                  <p className="text-sm text-muted-foreground">
                    Adicione uma camada extra de segurança
                  </p>
                </div>
                <Switch />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Verificação de localização</Label>
                  <p className="text-sm text-muted-foreground">
                    Exigir localização ao bater ponto
                  </p>
                </div>
                <Switch />
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
                <Button variant="outline" className="flex-1 h-20 border-2 border-primary">
                  <div className="text-center">
                    <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-background border-2" />
                    <span className="text-sm">Claro</span>
                  </div>
                </Button>
                <Button variant="outline" className="flex-1 h-20">
                  <div className="text-center">
                    <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-foreground border-2" />
                    <span className="text-sm">Escuro</span>
                  </div>
                </Button>
                <Button variant="outline" className="flex-1 h-20">
                  <div className="text-center">
                    <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-gradient-to-br from-background to-foreground border-2" />
                    <span className="text-sm">Sistema</span>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} className="gradient-bg px-8">
              <Settings className="mr-2 h-4 w-4" />
              Salvar Configurações
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
