// src/lib/faturas.ts

/**
 * Retorna o período de compras (ciclo) de uma fatura baseado no dia de fechamento.
 * @param diaFechamento Dia do fechamento da fatura (ex: 25)
 * @param referencia Data de referência (ex: hoje)
 * @returns { inicio: Date, fim: Date }
 */
export function getPeriodoFatura(diaFechamento: number, referencia: Date): { inicio: Date, fim: Date } {
  const ano = referencia.getFullYear();
  const mes = referencia.getMonth();
  
  let inicio: Date;
  let fim: Date;
  
  if (referencia.getDate() < diaFechamento) {
    // Estamos no ciclo atual (que começou no mês anterior)
    inicio = new Date(ano, mes - 1, diaFechamento + 1);
    fim = new Date(ano, mes, diaFechamento);
  } else {
    // Estamos no próximo ciclo (que começou neste mês)
    inicio = new Date(ano, mes, diaFechamento + 1);
    fim = new Date(ano, mes + 1, diaFechamento);
  }
  
  return { inicio, fim };
}

/**
 * Retorna a data de vencimento da fatura para uma compra.
 * REGRA: Se dia_vencimento > dia_fechamento, vencimento é no mesmo mês do fechamento.
 *        Se dia_vencimento <= dia_fechamento, vencimento é no mês seguinte ao fechamento.
 * @param diaFechamento Dia do fechamento da fatura (ex: 25)
 * @param diaVencimento Dia do vencimento do cartão (ex: 15)
 * @param dataCompra Data da compra
 * @returns Date de vencimento da fatura
 */
export function getVencimentoFatura(diaFechamento: number, diaVencimento: number, dataCompra: Date): Date {
  const { fim: dataFechamento } = getPeriodoFatura(diaFechamento, dataCompra);
  
  let mesVencimento = dataFechamento.getMonth();
  let anoVencimento = dataFechamento.getFullYear();
  
  // Aplicar a regra correta
  if (diaVencimento <= diaFechamento) {
    // Vencimento é no mês seguinte ao fechamento
    mesVencimento += 1;
    if (mesVencimento > 11) {
      mesVencimento = 0;
      anoVencimento += 1;
    }
  }
  // Se diaVencimento > diaFechamento, vencimento é no mesmo mês do fechamento
  
  return new Date(anoVencimento, mesVencimento, diaVencimento);
}

/**
 * Retorna o status da fatura baseado no ciclo e data atual.
 * @param diaFechamento Dia do fechamento da fatura
 * @param diaVencimento Dia do vencimento do cartão
 * @param dataReferencia Data para verificar o status (geralmente hoje)
 * @param dataVencimento Data específica de vencimento da fatura
 * @param valorPago Valor já pago da fatura
 * @param valorTotal Valor total da fatura
 */
export function getStatusFatura(
  diaFechamento: number,
  diaVencimento: number,
  dataReferencia: Date,
  dataVencimento: Date,
  valorPago: number,
  valorTotal: number
): 'aberta' | 'fechada' | 'prevista' | 'paga' {
  if (valorPago >= valorTotal && valorTotal > 0) return 'paga';
  
  // Calcular o ciclo desta fatura específica
  // Para isso, precisamos encontrar quando foi o fechamento desta fatura
  const ciclo = calcularCicloParaVencimento(diaFechamento, diaVencimento, dataVencimento);
  
  if (dataReferencia < ciclo.inicio) {
    return 'prevista';
  } else if (dataReferencia >= ciclo.inicio && dataReferencia <= ciclo.fim) {
    return 'aberta';
  } else {
    return 'fechada';
  }
}

/**
 * Calcula o ciclo de uma fatura baseado na sua data de vencimento.
 * @param diaFechamento Dia do fechamento
 * @param diaVencimento Dia do vencimento
 * @param dataVencimento Data específica de vencimento da fatura
 * @returns { inicio: Date, fim: Date }
 */
export function calcularCicloParaVencimento(
  diaFechamento: number, 
  diaVencimento: number, 
  dataVencimento: Date
): { inicio: Date, fim: Date } {
  const mesVenc = dataVencimento.getMonth();
  const anoVenc = dataVencimento.getFullYear();
  
  let mesFechamento = mesVenc;
  let anoFechamento = anoVenc;
  
  // Se diaVencimento <= diaFechamento, o fechamento foi no mês anterior
  if (diaVencimento <= diaFechamento) {
    mesFechamento -= 1;
    if (mesFechamento < 0) {
      mesFechamento = 11;
      anoFechamento -= 1;
    }
  }
  
  const dataFechamento = new Date(anoFechamento, mesFechamento, diaFechamento);
  
  // O ciclo vai do dia seguinte ao fechamento anterior até este fechamento
  const mesInicioAnterior = mesFechamento - 1;
  const anoInicioAnterior = mesInicioAnterior < 0 ? anoFechamento - 1 : anoFechamento;
  const mesInicioFinal = mesInicioAnterior < 0 ? 11 : mesInicioAnterior;
  
  const inicio = new Date(anoInicioAnterior, mesInicioFinal, diaFechamento);
  let fim: Date;
    if (diaFechamento === 1) {
      // Último dia do mês anterior
      fim = new Date(anoFechamento, mesFechamento, 0);
    } else {
      fim = new Date(anoFechamento, mesFechamento, diaFechamento - 1);
  }
  
  return { inicio, fim };
}

/**
 * Calcula o próximo vencimento de um cartão baseado na data atual.
 * @param diaFechamento Dia do fechamento da fatura
 * @param diaVencimento Dia do vencimento do cartão
 * @param dataReferencia Data de referência (opcional, padrão é hoje)
 * @returns Date do próximo vencimento
 */
export function calcularProximoVencimento(
  diaFechamento: number, 
  diaVencimento: number, 
  dataReferencia: Date = new Date()
): Date {
  const hoje = new Date(dataReferencia.getFullYear(), dataReferencia.getMonth(), dataReferencia.getDate());
  
  // Vamos calcular os próximos possíveis vencimentos
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth();
  
  // Tentar vencimento neste mês
  const vencimentoEsteMs = new Date(anoAtual, mesAtual, diaVencimento);
  
  // Tentar vencimento no próximo mês
  let proximoMes = mesAtual + 1;
  let proximoAno = anoAtual;
  if (proximoMes > 11) {
    proximoMes = 0;
    proximoAno += 1;
  }
  const vencimentoProximoMes = new Date(proximoAno, proximoMes, diaVencimento);
  
  // Para cada vencimento possível, verificar se ainda não passou
  const vencimentos = [vencimentoEsteMs, vencimentoProximoMes];
  
  for (const vencimento of vencimentos) {
    if (vencimento > hoje) {
      // Verificar se este vencimento faz sentido com a regra do cartão
      const ciclo = calcularCicloParaVencimento(diaFechamento, diaVencimento, vencimento);
      
      // Se hoje está dentro do ciclo ou o ciclo já fechou, este é o próximo vencimento
      if (hoje >= ciclo.inicio) {
        return vencimento;
      }
    }
  }
  
  // Se não encontrou nenhum, tentar o mês seguinte
  let mesDepois = proximoMes + 1;
  let anoDepois = proximoAno;
  if (mesDepois > 11) {
    mesDepois = 0;
    anoDepois += 1;
  }
  
  return new Date(anoDepois, mesDepois, diaVencimento);
}

/**
 * Calcula o ciclo atual de um cartão baseado na data de referência.
 * @param diaFechamento Dia do fechamento da fatura
 * @param dataReferencia Data de referência (opcional, padrão é hoje)
 * @returns { inicio: Date, fim: Date }
 */
export function calcularCicloAtual(diaFechamento: number, dataReferencia: Date = new Date()): { inicio: Date, fim: Date } {
  return getPeriodoFatura(diaFechamento, dataReferencia);
}

/**
 * Calcula quando uma compra será cobrada (em qual vencimento).
 * @param diaFechamento Dia do fechamento da fatura
 * @param diaVencimento Dia do vencimento do cartão
 * @param dataCompra Data da compra
 * @returns Date do vencimento em que a compra será cobrada
 */
export function calcularVencimentoCompra(
  diaFechamento: number, 
  diaVencimento: number, 
  dataCompra: Date
): Date {
  return getVencimentoFatura(diaFechamento, diaVencimento, dataCompra);
}

// ========== FUNÇÕES AUXILIARES E LEGADAS (manter compatibilidade) ==========

/**
 * @deprecated Use calcularCicloParaVencimento instead
 */
export function calcularCicloFatura(melhorDia: number, mesVencimento: number, anoVencimento: number) {
  console.warn('calcularCicloFatura está deprecated. Use calcularCicloParaVencimento.');
  const dataVencimento = new Date(anoVencimento, mesVencimento, 15); // dia arbitrário
  return calcularCicloParaVencimento(melhorDia, 15, dataVencimento);
}

/**
 * @deprecated Use getStatusFatura instead
 */
export function statusFatura(
  ciclo: { inicio: Date, fim: Date },
  dataReferencia: Date
): 'prevista' | 'aberta' | 'fechada' {
  console.warn('statusFatura está deprecated. Use getStatusFatura.');
  if (dataReferencia < ciclo.inicio) return 'prevista';
  if (dataReferencia > ciclo.fim) return 'fechada';
  return 'aberta';
}

/**
 * Utilitário para comparar dois ciclos de fatura.
 */
export function compararCiclos(cicloA: {inicio: Date, fim: Date}, cicloB: {inicio: Date, fim: Date}) {
  if (cicloA.fim < cicloB.inicio) return -1;
  if (cicloA.inicio > cicloB.fim) return 1;
  return 0;
}

/**
 * @deprecated Use getStatusFatura instead
 */
export function statusFaturaCiclica(
  melhorDia: number,
  mesVencimento: number,
  anoVencimento: number,
  valorPago: number,
  valorTotal: number
): 'paga' | 'aberta' | 'fechada' | 'prevista' {
  console.warn('statusFaturaCiclica está deprecated. Use getStatusFatura.');
  const dataVencimento = new Date(anoVencimento, mesVencimento, 15);
  return getStatusFatura(melhorDia, 15, new Date(), dataVencimento, valorPago, valorTotal);
}