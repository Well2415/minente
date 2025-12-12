import { useState, useEffect } from 'react';
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
import { formatHoursDecimal } from '@/lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getTimesheetHtmlTemplate } from '@/components/pdf/template';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

// Função para converter imagem em Data URI
const imageToUri = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Erro ao converter imagem para URI:', error);
    return ''; // Retorna string vazia em caso de erro
  }
};





export default function Relatorios() {
  const { getAllEmployeesSummary, getWorkDays, records } = useTimeRecords();
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [minHours, setMinHours] = useState<string>('');
  const [maxHours, setMaxHours] = useState<string>('');
  const [showPdfPreview, setShowPdfPreview] = useState(false); // Novo estado para controlar o modal de PDF
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null); // Novo estado para a URL do PDF

  // Efeito para limpar o Blob URL quando o componente desmonta ou o PDF é atualizado
  useEffect(() => {
    return () => {
      if (pdfDataUrl) {
        URL.revokeObjectURL(pdfDataUrl);
      }
    };
  }, [pdfDataUrl]);



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
  const averageHoursAll = reportData.length > 0 ? totalHoursAll / reportData.length : 0;

    const escapeCSV = (value: string | number | boolean): string => {
      const stringValue = String(value);
      // Agora escapamos ';' também
      if (stringValue.includes(';') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };
  
    const exportToCSV = () => {
      const DELIMITER = ';'; // Usar ponto e vírgula como delimitador
      const BOM = '\uFEFF'; 
      let csvData = '';
  
      if (selectedEmployee !== 'all') { // Relatório individual detalhado
        const currentEmployee = users.find(u => u.id === selectedEmployee);
        if (!currentEmployee) {
          alert('Funcionário não encontrado para gerar o relatório individual.');
          return;
        }
  
        // ** Cabeçalho Individual **
        const individualHeader = [
          ['sep=' + DELIMITER],
          [],
          ['FOLHA DE PONTO INDIVIDUAL DE TRABALHO'],
          [],
          ['EMPREGADOR: NOME / EMPRESA', 'CEI / CNPJ Nº'],
          ['ECOMAIS PRESTADORA DE SERVIÇO LTDA', '54.600.137/0001-06'],
          ['ENDEREÇO:'],
          ['RUA 10 N°31 ST FERROVIARIO. BONFINOPOLIS'],
          [],
          ['EMPREGADO(A):', 'CTPS Nº E SÉRIE:', 'DATA DE ADMISSÃO:'],
          [currentEmployee.name, 'N/A', 'N/A'], // CTPS e Admissão não disponíveis
          [],
          ['FUNÇÃO:', 'HORÁRIO DE TRABALHO DE SEG. A SEXTA FEIRA:'],
          [currentEmployee.department, 'N/A'], // Horário não disponível
          ['HORÁRIO AOS SÁBADOS:', 'DESCANSO SEMANAL:', 'MÊS:', 'ANO:'],
          ['N/A', 'N/A', format(parseISO(startDate), 'MMMM', { locale: ptBR }), format(parseISO(startDate), 'yyyy')],
          [],
          ['----- REGISTROS DIÁRIOS -----'],
        ].map(row => row.map(escapeCSV).join(DELIMITER)).join('\n');
  
        // ** Tabela Diária de Registros **
        const detailHeaders = ['DIAS', 'ENTRADA', 'INTERVALO SAÍDA', 'INTERVALO RETORNO', 'SAÍDA', 'HORAS EXTRAS'];
        const detailRows = [];
  
        // Loop pelos dias do mês no período
        const daysInPeriod = Array.from({length: parseInt(format(end, 'dd'))}, (_, i) => i + 1);
  
        daysInPeriod.forEach(day => {
          const date = new Date(start.getFullYear(), start.getMonth(), day);
          if (date >= start && date <= end) {
            const dayRecords = getWorkDays(date, date, currentEmployee.id);
            let entry = '';
            let breakStart = '';
            let breakEnd = '';
            let exit = '';
            // Horas extras não calculadas, ficam como N/A ou em branco
            const extras = ''; 
  
            if (dayRecords.length > 0 && dayRecords[0].records.length > 0) {
              const recordsOfDay = dayRecords[0].records.sort((a,b) => parseISO(a.timestamp).getTime() - parseISO(b.timestamp).getTime());
              
              entry = recordsOfDay.find(r => r.type === 'clock-in')?.timestamp ? format(parseISO(recordsOfDay.find(r => r.type === 'clock-in')?.timestamp || ''), 'HH:mm') : '';
              breakStart = recordsOfDay.find(r => r.type === 'break-start')?.timestamp ? format(parseISO(recordsOfDay.find(r => r.type === 'break-start')?.timestamp || ''), 'HH:mm') : '';
              breakEnd = recordsOfDay.find(r => r.type === 'break-end')?.timestamp ? format(parseISO(recordsOfDay.find(r => r.type === 'break-end')?.timestamp || ''), 'HH:mm') : '';
              exit = recordsOfDay.find(r => r.type === 'clock-out')?.timestamp ? format(parseISO(recordsOfDay.find(r => r.type === 'clock-out')?.timestamp || ''), 'HH:mm') : '';
              // Lógica para extras aqui, se for implementada
            }
            detailRows.push([
              escapeCSV(format(date, 'dd')),
              escapeCSV(entry),
              escapeCSV(breakStart),
              escapeCSV(breakEnd),
              escapeCSV(exit),
              escapeCSV(extras),
            ]);
          }
        });
        const detailTable = [detailHeaders.map(escapeCSV).join(DELIMITER), ...detailRows.map((r: string[]) => r.join(DELIMITER))].join('\n');
  
        // ** Rodapé Individual **
        const individualFooter = [
          [], // Linha em branco
          [], // Linha em branco
          ['-------------------------------------------'], 
          ['Assinatura: ___________________________________________'],
        ].map(row => row.map(escapeCSV).join(DELIMITER)).join('\n');
  
        csvData = individualHeader + '\n' + detailTable + '\n\n' + individualFooter;
  
      } else { // Relatório geral (como estava antes)
        const headers = ['Funcionário', 'Departamento', 'Horas Totais', 'Dias Trabalhados', 'Média Diária'];
        
        // Metadados no topo
        const metadata = [
          ['sep=' + DELIMITER], // Informa ao Excel o delimitador
          [], // Linha em branco
          ['Empresa: Serp Soluções'],
          [`Relatório de Ponto - Período: ${format(parseISO(startDate), 'dd/MM/yyyy')} a ${format(parseISO(endDate), 'dd/MM/yyyy')}`],
          [], // Linha em branco
          [], // Linha em branco
          ['----- Dados por Funcionário -----'], // Novo cabeçalho de seção com "bordas"
        ].map(row => row.map(escapeCSV).join(DELIMITER)).join('\n');
  
        const rows = reportData.map((d: any) => [
          escapeCSV(d.user.name),
          escapeCSV(d.user.department),
        escapeCSV(d.totalHours.toFixed(2)),
          escapeCSV(d.daysWorked),
          escapeCSV(d.averageHoursPerDay.toFixed(2)),
        ]);
  
        const csvContent = [headers.map(escapeCSV).join(DELIMITER), ...rows.map((r: string[]) => r.join(DELIMITER))].join('\n');
        
        const footer = [
          [], // Linha em branco
          [], // Linha em branco
          ['-------------------------------------'], // Linha de separação
          ['Assinatura do Gerente:'],
          ['Nome: ____________________________'],
          ['Data: ____________________________'],
          [], // Linha em branco
          ['-------------------------------------'], // Linha de separação
        ].map(row => row.map(escapeCSV).join(DELIMITER)).join('\n');
  
        csvData = metadata + '\n' + csvContent + '\n' + footer; // Não adiciona BOM aqui
      }
      
      const csvBlob = new Blob([BOM + csvData], { type: 'text/csv;charset=utf-8;' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(csvBlob);
      link.download = `relatorio-ponto-${startDate}-${endDate}.csv`;
      link.click();
    };

    const handleExportPdf = async () => {
      if (selectedEmployee === 'all') {
        alert('Por favor, selecione um funcionário para gerar o relatório individual.');
        return;
      }
      setShowPdfPreview(true);
      setPdfDataUrl(null);
  
      const currentEmployee = users.find(u => u.id === selectedEmployee);
      if (!currentEmployee) {
        alert('Funcionário não encontrado.');
        setShowPdfPreview(false);
        return;
      }
  
      const logoUri = await imageToUri('/img/LOGOSISTEMA.png');
      
      let html = getTimesheetHtmlTemplate();
  
      // 1. Preencher dados do cabeçalho e funcionário
      html = html.replace('{{logo_src}}', logoUri)
                 .replace(/{{data_inicio}}/g, format(start, 'dd/MM/yyyy'))
                 .replace(/{{data_fim}}/g, format(end, 'dd/MM/yyyy'))
                 .replace(/{{nome_funcionario}}/g, currentEmployee.name)
                 .replace(/{{cargo}}/g, currentEmployee.department || 'N/A')
                 .replace(/{{ctps}}/g, 'N/A');
  
      // 2. Preencher a tabela de dias
      const employeeWorkDays = getWorkDays(start, end, currentEmployee.id);
      
      for (let i = 1; i <= 31; i++) {
        const day = i.toString().padStart(2, '0');
        const dayDate = new Date(start.getFullYear(), start.getMonth(), i);
  
        let data = `--/--`, semana = `---`, entrada1 = `--:--`, saida1 = `--:--`, entrada2 = `--:--`, saida2 = `--:--`, horas_trab = `--:--`, horas_ext = `--:--`, atrasos = `--:--`, obs = `-`;
  
        // Só processa dias que pertencem ao mês selecionado
        if (dayDate.getMonth() === start.getMonth()) {
          data = format(dayDate, 'dd/MM');
          semana = format(dayDate, 'EEE', { locale: ptBR });
          
          const workDay = employeeWorkDays.find(d => d.date === format(dayDate, 'yyyy-MM-dd'));
          
          if (workDay && workDay.records.length > 0) {
            const dayRecords = workDay.records.sort((a,b) => parseISO(a.timestamp).getTime() - parseISO(b.timestamp).getTime());
            
            const clockIn = dayRecords.find(r => r.type === 'clock-in');
            const breakStart = dayRecords.find(r => r.type === 'break-start');
            const breakEnd = dayRecords.find(r => r.type === 'break-end');
            const clockOut = dayRecords.find(r => r.type === 'clock-out');

            entrada1 = clockIn ? format(parseISO(clockIn.timestamp), 'HH:mm') : '--:--';
            saida1 = breakStart ? format(parseISO(breakStart.timestamp), 'HH:mm') : '--:--';
            entrada2 = breakEnd ? format(parseISO(breakEnd.timestamp), 'HH:mm') : '--:--';
            saida2 = clockOut ? format(parseISO(clockOut.timestamp), 'HH:mm') : '--:--';
            
            if (workDay.totalHours > 0) {
              horas_trab = formatHoursDecimal(workDay.totalHours);
            }
          }
        }
  
        html = html.replace(`{{dia_${day}_data}}`, data)
                   .replace(`{{dia_${day}_semana}}`, semana)
                   .replace(`{{dia_${day}_entrada1}}`, entrada1)
                   .replace(`{{dia_${day}_saida1}}`, saida1)
                   .replace(`{{dia_${day}_entrada2}}`, entrada2)
                   .replace(`{{dia_${day}_saida2}}`, saida2)
                   .replace(`{{dia_${day}_horas_trab}}`, horas_trab)
                   .replace(`{{dia_${day}_horas_ext}}`, horas_ext)
                   .replace(`{{dia_${day}_atrasos}}`, atrasos)
                   .replace(`{{dia_${day}_obs}}`, obs);
      }
      
      const reportElement = document.createElement('div');
      reportElement.style.position = 'absolute';
      reportElement.style.left = '-3999px';
      reportElement.innerHTML = html;
      document.body.appendChild(reportElement);
  
      try {
        const canvas = await html2canvas(reportElement.firstElementChild as HTMLElement, {
          scale: 3,
          useCORS: true,
          width: reportElement.firstElementChild.clientWidth,
          height: reportElement.firstElementChild.clientHeight,
        });
  
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
        
        const pdfBlob = pdf.output('blob');
        const blobUrl = URL.createObjectURL(pdfBlob);
        setPdfDataUrl(blobUrl);
  
      } catch (error) {
        console.error("Erro ao gerar PDF:", error);
        alert("Ocorreu um erro ao gerar o PDF.");
        setShowPdfPreview(false);
      } finally {
        document.body.removeChild(reportElement);
      }
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
          <div className="flex gap-2"> {/* Agrupar botões */}
            <Button onClick={exportToCSV} className="gradient-bg">
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
            <Button onClick={handleExportPdf} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>


          </div>
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
                  <p className="text-2xl font-display font-bold">{formatHoursDecimal(totalHoursAll)}</p>
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
                    {formatHoursDecimal(averageHoursAll)}
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
                          {formatHoursDecimal(data.totalHours)}
                        </TableCell>
                        <TableCell className="text-right">{data.daysWorked}</TableCell>
                        <TableCell className="text-right">
                          {formatHoursDecimal(data.averageHoursPerDay)}
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
      </div> {/* Fecha o div do space-y-6 */}

      {/* Modal de Pré-visualização de PDF */}
      <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Pré-visualização do Relatório PDF</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden rounded-md border">
            {pdfDataUrl ? (
              <iframe src={pdfDataUrl} className="w-full h-full" title="PDF Preview" key={pdfDataUrl || 'loading'} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Carregando PDF...
              </div>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button onClick={() => { 
              if (pdfDataUrl) {
                const link = document.createElement('a');
                link.href = pdfDataUrl;
                link.download = `relatorio-ponto-${selectedEmployee === 'all' ? 'geral' : selectedEmployee}-${startDate}-${endDate}.pdf`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }
             }} className="gradient-bg">
              Salvar PDF
            </Button>
            <Button onClick={() => { console.log('Lógica para enviar por WhatsApp será implementada aqui.'); }} variant="outline">
              Enviar Resumo WhatsApp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}

