import * as XLSX from 'xlsx';
import { format, addMonths, startOfMonth } from 'date-fns';

export function downloadImportTemplate() {
  // Generate example data
  const startDate = startOfMonth(new Date());
  const endDate = addMonths(startDate, 2);
  
  const months: string[] = [];
  let current = startDate;
  while (current <= endDate) {
    months.push(format(current, 'MMM_yyyy').toLowerCase());
    current = addMonths(current, 1);
  }
  
  // Example rows
  const exampleData = [
    {
      linha_codigo: 'L001',
      veiculo: 'Google Ads',
      canal: 'Search',
      meio: 'Digital',
      fase_funil: 'Awareness',
      subdivisao: 'Curitiba',
      momento: 'Lançamento',
      segmentacao: 'Público Jovem',
      formato: 'Anúncio Texto',
      orcamento_total: 10000,
      data_inicio: format(startDate, 'dd/MM/yyyy'),
      data_fim: format(endDate, 'dd/MM/yyyy'),
      [months[0]]: 3333.33,
      [months[1]]: 3333.33,
      [months[2]]: 3333.34,
      objetivo: 'Tráfego',
      notas: 'Campanha principal',
      url_destino: 'https://exemplo.com/landing',
    },
    {
      linha_codigo: 'L002',
      veiculo: 'Google Ads',
      canal: 'Display',
      meio: 'Digital',
      fase_funil: 'Consideration',
      subdivisao: 'Curitiba',
      momento: 'Lançamento',
      segmentacao: 'Público Geral',
      formato: 'Banner 300x250',
      orcamento_total: 5000,
      data_inicio: format(startDate, 'dd/MM/yyyy'),
      data_fim: format(endDate, 'dd/MM/yyyy'),
      [months[0]]: 1666.66,
      [months[1]]: 1666.66,
      [months[2]]: 1666.68,
      objetivo: 'Engajamento',
      notas: '',
      url_destino: 'https://exemplo.com/produto',
    },
    {
      linha_codigo: 'L003',
      veiculo: 'Meta Ads',
      canal: 'Feed',
      meio: 'Digital',
      fase_funil: 'Conversion',
      subdivisao: 'Londrina',
      momento: 'Sustentação',
      segmentacao: 'Público Adulto',
      formato: 'Imagem Feed',
      orcamento_total: 8000,
      data_inicio: format(addMonths(startDate, 1), 'dd/MM/yyyy'),
      data_fim: format(endDate, 'dd/MM/yyyy'),
      [months[0]]: 0,
      [months[1]]: 4000,
      [months[2]]: 4000,
      objetivo: 'Conversões',
      notas: 'Foco em vendas',
      url_destino: 'https://exemplo.com/checkout',
    },
  ];
  
  // Create workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exampleData);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 12 }, // linha_codigo
    { wch: 15 }, // veiculo
    { wch: 12 }, // canal
    { wch: 10 }, // meio
    { wch: 15 }, // fase_funil
    { wch: 15 }, // subdivisao
    { wch: 15 }, // momento
    { wch: 18 }, // segmentacao
    { wch: 18 }, // formato
    { wch: 15 }, // orcamento_total
    { wch: 12 }, // data_inicio
    { wch: 12 }, // data_fim
    { wch: 12 }, // month 1
    { wch: 12 }, // month 2
    { wch: 12 }, // month 3
    { wch: 15 }, // objetivo
    { wch: 25 }, // notas
    { wch: 30 }, // url_destino
  ];
  
  XLSX.utils.book_append_sheet(wb, ws, 'Modelo');
  
  // Create instructions sheet
  const instructions = [
    { Campo: 'linha_codigo', Obrigatorio: 'Sim', Descricao: 'Código único para identificar a linha (ex: L001)' },
    { Campo: 'veiculo', Obrigatorio: 'Sim', Descricao: 'Nome do veículo/plataforma (ex: Google Ads, Meta Ads)' },
    { Campo: 'canal', Obrigatorio: 'Sim', Descricao: 'Canal/tipo de anúncio do veículo (ex: Search, Display, Feed)' },
    { Campo: 'orcamento_total', Obrigatorio: 'Sim', Descricao: 'Valor total do orçamento da linha' },
    { Campo: 'meio', Obrigatorio: 'Não', Descricao: 'Categoria do meio (ex: Digital, TV, OOH)' },
    { Campo: 'fase_funil', Obrigatorio: 'Não', Descricao: 'Fase do funil de marketing (ex: Awareness, Consideration, Conversion)' },
    { Campo: 'subdivisao', Obrigatorio: 'Não', Descricao: 'Subdivisão/praça/região (ex: Curitiba, Londrina)' },
    { Campo: 'momento', Obrigatorio: 'Não', Descricao: 'Momento/campanha/wave (ex: Lançamento, Sustentação)' },
    { Campo: 'segmentacao', Obrigatorio: 'Não', Descricao: 'Segmentação/público-alvo (ex: Público Jovem, Público Adulto)' },
    { Campo: 'formato', Obrigatorio: 'Não', Descricao: 'Formato do criativo (ex: Banner 300x250, Vídeo 15s)' },
    { Campo: 'data_inicio', Obrigatorio: 'Não', Descricao: 'Data de início da linha (formato: DD/MM/YYYY)' },
    { Campo: 'data_fim', Obrigatorio: 'Não', Descricao: 'Data de fim da linha (formato: DD/MM/YYYY)' },
    { Campo: 'jan_2026, fev_2026, ...', Obrigatorio: 'Não', Descricao: 'Colunas de distribuição mensal (valor por mês)' },
    { Campo: 'objetivo', Obrigatorio: 'Não', Descricao: 'Objetivo da campanha (ex: Tráfego, Conversões)' },
    { Campo: 'notas', Obrigatorio: 'Não', Descricao: 'Observações adicionais' },
    { Campo: 'url_destino', Obrigatorio: 'Não', Descricao: 'URL de destino dos anúncios' },
  ];
  
  const wsInstructions = XLSX.utils.json_to_sheet(instructions);
  wsInstructions['!cols'] = [
    { wch: 25 },
    { wch: 12 },
    { wch: 70 },
  ];
  
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instruções');
  
  // Download
  XLSX.writeFile(wb, 'modelo_importacao_plano_de_midia.xlsx');
}
