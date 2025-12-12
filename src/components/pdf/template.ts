// src/components/pdf/template.ts

function getTableRows() {
  let rows = '';
  for (let i = 1; i <= 31; i++) {
    const day = i.toString().padStart(2, '0');
    rows += `
      <tr>
        <td style="border: 1px solid #dcdcdc; padding: 1.5mm; text-align: center; font-size: 7pt; height: 5.6mm;">{{dia_${day}_data}}</td>
        <td style="border: 1px solid #dcdcdc; padding: 1.5mm; text-align: center; font-size: 7pt; height: 5.6mm;">{{dia_${day}_semana}}</td>
        <td style="border: 1px solid #dcdcdc; padding: 1.5mm; text-align: center; font-size: 7pt; height: 5.6mm;">{{dia_${day}_entrada1}}</td>
        <td style="border: 1px solid #dcdcdc; padding: 1.5mm; text-align: center; font-size: 7pt; height: 5.6mm;">{{dia_${day}_saida1}}</td>
        <td style="border: 1px solid #dcdcdc; padding: 1.5mm; text-align: center; font-size: 7pt; height: 5.6mm;">{{dia_${day}_entrada2}}</td>
        <td style="border: 1px solid #dcdcdc  padding: 1.5mm; text-align: center; font-size: 7pt; height: 5.6mm;">{{dia_${day}_saida2}}</td>
        <td style="border: 1px solid #dcdcdc; padding: 1.5mm; text-align: center; font-size: 7pt; height: 5.6mm;">{{dia_${day}_horas_trab}}</td>
        <td style="border: 1px solid #dcdcdc; padding: 1.5mm; text-align: center; font-size: 7pt; height: 5.6mm;">{{dia_${day}_horas_ext}}</td>
        <td style="border: 1px solid #dcdcdc; padding: 1.5mm; text-align: center; font-size: 7pt; height: 5.6mm;">{{dia_${day}_atrasos}}</td>
        <td style="border: 1px solid #dcdcdc; padding: 1.5mm; text-align: center; font-size: 7pt; height: 5.6mm;">{{dia_${day}_obs}}</td>
      </tr>
    `;
  }
  return rows;
}

export function getTimesheetHtmlTemplate(): string {
  return `
    <div style="width: 210mm; height: 297mm; box-sizing: border-box; padding: 5mm; font-family: Arial, sans-serif; font-size: 8pt; color: #333; background-color: white; display: flex; flex-direction: column;">
      
      <!-- 1. Cabeçalho -->
      <header style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 5mm; border-bottom: 1px solid #ccc; margin-bottom: 5mm;">
        <div style="flex: 1;">
          <img src="{{logo_src}}" alt="Logo" style="max-width: 150px; max-height: 50px;" />
        </div>
        <div style="flex: 2; text-align: right;">
          <h1 style="font-size: 16pt; font-weight: bold; margin: 0;">Espelho de Ponto</h1>
          <p style="font-size: 9pt; margin: 2mm 0 0 0;">Período: {{data_inicio}} a {{data_fim}}</p>
        </div>
      </header>

      <main style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
        <!-- 2 & 3. Blocos de Informações -->
        <div style="display: flex; justify-content: space-between; gap: 5mm; margin-bottom: 5mm;">
          <div style="flex: 1; border: 1px solid #dcdcdc; border-radius: 4px; padding: 3mm;">
            <div style="font-weight: bold; font-size: 10pt; border-bottom: 1px solid #eee; padding-bottom: 2mm; margin-bottom: 2mm;">Dados do Empregador</div>
            <div style="margin-bottom: 1mm;"><span style="font-weight: bold;">Nome:</span> ECOMAIS PRESTADORA DE SERVIÇO LTDA</div>
            <div style="margin-bottom: 1mm;"><span style="font-weight: bold;">CNPJ:</span> 54.600.137/0001-06</div>
            <div style="margin-bottom: 1mm;"><span style="font-weight: bold;">Endereço:</span> RUA 10 N°31 ST FERROVIARIO, BONFINÓPOLIS</div>
          </div>
          <div style="flex: 1; border: 1px solid #dcdcdc; border-radius: 4px; padding: 3mm;">
            <div style="font-weight: bold; font-size: 10pt; border-bottom: 1px solid #eee; padding-bottom: 2mm; margin-bottom: 2mm;">Dados do Funcionário</div>
            <div style="margin-bottom: 1mm;"><span style="font-weight: bold;">Nome:</span> {{nome_funcionario}}</div>
            <div style="margin-bottom: 1mm;"><span style="font-weight: bold;">Cargo:</span> {{cargo}}</div>
            <div style="margin-bottom: 1mm;"><span style="font-weight: bold;">CTPS:</span> {{ctps}}</div>
          </div>
        </div>

        <!-- 4. Tabela de Registros -->
        <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr>
                <th style="border: 1px solid #dcdcdc; padding: 1.5mm; text-align: center; font-weight: bold; background-color: #f5f5f5; font-size: 7pt;">Data</th>
                <th style="border: 1px solid #dcdcdc; padding: 1.5mm; text-align: center; font-weight: bold; background-color: #f5f5f5; font-size: 7pt;">Dia</th>
                <th style="border: 1px solid #dcdcdc; padding: 1.5mm; text-align: center; font-weight: bold; background-color: #f5f5f5; font-size: 7pt;">Entrada</th>
                <th style="border: 1px solid #dcdcdc; padding: 1.5mm; text-align: center; font-weight: bold; background-color: #f5f5f5; font-size: 7pt;">Início Intervalo</th>
                <th style="border: 1px solid #dcdcdc; padding: 1.5mm; text-align: center; font-weight: bold; background-color: #f5f5f5; font-size: 7pt;">Fim Intervalo</th>
                <th style="border: 1px solid #dcdcdc; padding: 1.5mm; text-align: center; font-weight: bold; background-color: #f5f5f5; font-size: 7pt;">Saída</th>
                <th style="border: 1px solid #dcdcdc; padding: 1.5mm; text-align: center; font-weight: bold; background-color: #f5f5f5; font-size: 7pt;">Horas Trab.</th>
                <th style="border: 1px solid #dcdcdc; padding: 1.5mm; text-align: center; font-weight: bold; background-color: #f5f5f5; font-size: 7pt;">Horas Ext.</th>
                <th style="border: 1px solid #dcdcdc; padding: 1.5mm; text-align: center; font-weight: bold; background-color: #f5f5f5; font-size: 7pt;">Atrasos</th>
                <th style="border: 1px solid #dcdcdc; padding: 1.5mm; text-align: center; font-weight: bold; background-color: #f5f5f5; font-size: 7pt;">Obs.</th>
              </tr>
            </thead>
            <tbody>
              ${getTableRows()}
            </tbody>
          </table>
        </div>
      </main>

      <!-- 5. Rodapé -->
      <footer style="margin-top: auto; padding-top: 5mm; font-size: 8pt; text-align: center;">
        <div style="display: flex; justify-content: center; gap: 20mm; margin-bottom: 5mm;">
          <div style="border-top: 1px solid #333; width: 60mm; padding-top: 1.5mm;">Assinatura do Funcionário</div>
          <div style="border-top: 1px solid #333; width: 60mm; padding-top: 1.5mm;">Assinatura do Empregador</div>
        </div>
        <p style="font-size: 7pt; font-style: italic; color: #666;">
          Declaro que as informações contidas neste documento são um reflexo fiel dos meus registros de jornada de trabalho para o período especificado.
        </p>
      </footer>
    </div>
  `;
}
