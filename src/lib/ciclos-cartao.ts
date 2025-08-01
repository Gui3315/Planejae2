// src/lib/ciclos-cartao.ts
// 🔖 Utilitários para cálculo de ciclos de cartão de crédito

/**
 * Calcula o vencimento da fatura para uma compra específica
 * @param melhorDiaCompra Dia em que o ciclo "vira" (ex: 5)
 * @param diaVencimento Dia do vencimento (ex: 10)
 * @param dataCompra Data da compra
 * @returns Data de vencimento da fatura
 */
export function calcularVencimentoCompra(
  melhorDiaCompra: number,
  diaVencimento: number,
  dataCompra: Date
): Date {
  const ano = dataCompra.getFullYear();
  const mes = dataCompra.getMonth();
  const dia = dataCompra.getDate();

  let mesVencimento: number;
  let anoVencimento: number;

  // 🔖 LÓGICA CORRETA:
  // Se a compra foi feita ANTES do melhor dia, vence no mês atual
  // Se a compra foi feita DEPOIS do melhor dia, vence no próximo mês
  if (dia < melhorDiaCompra) {
    // Compra antes do "virar" → vence no mês atual
    mesVencimento = mes;
    anoVencimento = ano;
  } else {
    // Compra depois do "virar" → vence no próximo mês
    mesVencimento = mes + 1;
    anoVencimento = ano;
    
    // Ajustar se passar de dezembro
    if (mesVencimento > 11) {
      mesVencimento = 0;
      anoVencimento += 1;
    }
  }
  
  // 🔖 CORREÇÃO ESPECIAL: Para melhor dia >= 20, sempre vence no próximo mês
  if (melhorDiaCompra >= 20) {
    mesVencimento = mes + 1;
    anoVencimento = ano;
    
    // Ajustar se passar de dezembro
    if (mesVencimento > 11) {
      mesVencimento = 0;
      anoVencimento += 1;
    }
  }

  return new Date(anoVencimento, mesVencimento, diaVencimento);
}

/**
 * Calcula o período do ciclo atual baseado no melhor dia de compra
 * @param melhorDiaCompra Dia em que o ciclo "vira"
 * @param dataReferencia Data de referência (ex: hoje)
 * @returns { inicio: Date, fim: Date }
 */
export function calcularCicloAtual(
  melhorDiaCompra: number,
  dataReferencia: Date = new Date()
): { inicio: Date, fim: Date } {
  const ano = dataReferencia.getFullYear();
  const mes = dataReferencia.getMonth();
  const dia = dataReferencia.getDate();

  let inicio: Date;
  let fim: Date;

  if (dia < melhorDiaCompra) {
    // Estamos no ciclo que começou no mês anterior
    inicio = new Date(ano, mes - 1, melhorDiaCompra);
    fim = new Date(ano, mes, melhorDiaCompra - 1);
  } else {
    // Estamos no ciclo que começou neste mês
    inicio = new Date(ano, mes, melhorDiaCompra);
    fim = new Date(ano, mes + 1, melhorDiaCompra - 1);
  }

  return { inicio, fim };
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
 * @param melhorDiaCompra Dia em que o ciclo "vira"
 * @param diaVencimento Dia do vencimento
 * @param dataReferencia Data de referência (ex: hoje)
 * @returns Data do próximo vencimento
 */
export function calcularProximoVencimento(
  melhorDiaCompra: number,
  diaVencimento: number,
  dataReferencia: Date = new Date()
): Date {
  const ciclo = calcularCicloAtual(melhorDiaCompra, dataReferencia);
  
  // O vencimento é sempre no mês seguinte ao fim do ciclo
  let anoVenc = ciclo.fim.getFullYear();
  let mesVenc = ciclo.fim.getMonth() + 1;
  
  if (mesVenc > 11) {
    mesVenc = 0;
    anoVenc += 1;
  }
  
  return new Date(anoVenc, mesVenc, diaVencimento);
} 