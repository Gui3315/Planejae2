// src/lib/ciclos-cartao.ts
// 🔖 Utilitários para cálculo de ciclos de cartão de crédito

/**
 * Calcula o vencimento da fatura para uma compra específica
 * @param diaFechamento Dia do fechamento da fatura (ex: 26, 4, 14)
 * @param diaVencimento Dia do vencimento (ex: 2, 10, 20)
 * @param dataCompra Data da compra
 * @returns Data de vencimento da fatura
 */
export function calcularVencimentoCompra(
  diaFechamento: number,
  diaVencimento: number,
  dataCompra: Date
): Date {
  const ano = dataCompra.getFullYear();
  const mes = dataCompra.getMonth();
  const diaCompra = dataCompra.getDate();

  let mesFechamento: number;
  let anoFechamento: number;
  let mesVencimento: number;
  let anoVencimento: number;

  // Determina em qual ciclo a compra se enquadra
  if (diaCompra <= diaFechamento) {
    // Compra feita até o dia de fechamento → entra na fatura atual
    mesFechamento = mes;
    anoFechamento = ano;
  } else {
    // Compra feita após o fechamento → entra na próxima fatura
    mesFechamento = mes + 1;
    anoFechamento = ano;
    
    // Ajustar se passar de dezembro
    if (mesFechamento > 11) {
      mesFechamento = 0;
      anoFechamento += 1;
    }
  }

  // Calcular o vencimento baseado no fechamento
  if (diaVencimento > diaFechamento) {
    // Vencimento no mesmo mês do fechamento
    mesVencimento = mesFechamento;
    anoVencimento = anoFechamento;
  } else {
    // Vencimento no mês seguinte ao fechamento
    mesVencimento = mesFechamento + 1;
    anoVencimento = anoFechamento;
    
    if (mesVencimento > 11) {
      mesVencimento = 0;
      anoVencimento += 1;
    }
  }

  return new Date(anoVencimento, mesVencimento, diaVencimento);
}

/**
 * Calcula o período da fatura atual baseado na data de fechamento
 * @param diaFechamento Dia do fechamento da fatura
 * @param dataReferencia Data de referência (ex: hoje)
 * @returns { inicio: Date, fim: Date, fechamento: Date }
 */
export function calcularCicloAtual(
  diaFechamento: number,
  dataReferencia: Date = new Date()
): { inicio: Date, fim: Date, fechamento: Date } {
  const ano = dataReferencia.getFullYear();
  const mes = dataReferencia.getMonth();
  const dia = dataReferencia.getDate();

  let inicioMes: number;
  let inicioAno: number;
  let fechamentoMes: number;
  let fechamentoAno: number;

  if (dia <= diaFechamento) {
    // Estamos no período que fecha neste mês
    inicioMes = mes - 1;
    inicioAno = ano;
    fechamentoMes = mes;
    fechamentoAno = ano;
    
    // Ajustar se for janeiro
    if (inicioMes < 0) {
      inicioMes = 11;
      inicioAno -= 1;
    }
  } else {
    // Estamos no período que fecha no próximo mês
    inicioMes = mes;
    inicioAno = ano;
    fechamentoMes = mes + 1;
    fechamentoAno = ano;
    
    // Ajustar se passar de dezembro
    if (fechamentoMes > 11) {
      fechamentoMes = 0;
      fechamentoAno += 1;
    }
  }

  const inicio = new Date(inicioAno, inicioMes, diaFechamento + 1);
  const fechamento = new Date(fechamentoAno, fechamentoMes, diaFechamento);
  const fim = fechamento; // O fim é o próprio fechamento

  return { inicio, fim, fechamento };
}

/**
 * Verifica se uma data está dentro de um ciclo específico
 * @param data Data a verificar
 * @param ciclo { inicio: Date, fim: Date }
 * @returns boolean
 */
export function estaNoCiclo(data: Date, ciclo: { inicio: Date, fim: Date }): boolean {
  return data >= ciclo.inicio && data <= ciclo.fim;
}

/**
 * Calcula o próximo vencimento de um cartão
 * @param diaFechamento Dia do fechamento da fatura
 * @param diaVencimento Dia do vencimento
 * @param dataReferencia Data de referência (ex: hoje)
 * @returns Data do próximo vencimento
 */
export function calcularProximoVencimento(
  diaFechamento: number,
  diaVencimento: number,
  dataReferencia: Date = new Date()
): Date {
  const ano = dataReferencia.getFullYear();
  const mes = dataReferencia.getMonth();
  const dia = dataReferencia.getDate();

  let proximoFechamentoMes: number;
  let proximoFechamentoAno: number;

  if (dia <= diaFechamento) {
    // Próximo fechamento é neste mês
    proximoFechamentoMes = mes;
    proximoFechamentoAno = ano;
  } else {
    // Próximo fechamento é no próximo mês
    proximoFechamentoMes = mes + 1;
    proximoFechamentoAno = ano;
    
    if (proximoFechamentoMes > 11) {
      proximoFechamentoMes = 0;
      proximoFechamentoAno += 1;
    }
  }

  // Calcular vencimento baseado no fechamento
  let vencimentoMes: number;
  let vencimentoAno: number;

  if (diaVencimento > diaFechamento) {
    // Vencimento no mesmo mês do fechamento
    vencimentoMes = proximoFechamentoMes;
    vencimentoAno = proximoFechamentoAno;
  } else {
    // Vencimento no mês seguinte ao fechamento
    vencimentoMes = proximoFechamentoMes + 1;
    vencimentoAno = proximoFechamentoAno;
    
    if (vencimentoMes > 11) {
      vencimentoMes = 0;
      vencimentoAno += 1;
    }
  }

  return new Date(vencimentoAno, vencimentoMes, diaVencimento);
}