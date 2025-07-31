// src/lib/faturas.ts

/**
 * Retorna o período de compras de uma fatura baseado no melhor dia de compra.
 * @param melhorDia Número do melhor dia de compra (ex: 25)
 * @param referencia Data de referência (ex: hoje)
 * @returns { inicio: Date, fim: Date }
 */
export function getPeriodoFatura(melhorDia: number, referencia: Date): { inicio: Date, fim: Date } {
    // Descobre o início do ciclo (melhor dia do mês anterior)
    const ano = referencia.getFullYear();
    const mes = referencia.getMonth();
  
    // Se a data de referência for antes do melhor dia, o ciclo começou no mês anterior
    let inicio: Date;
    let fim: Date;
  
    if (referencia.getDate() < melhorDia) {
      // Ciclo começou no mês anterior
      inicio = new Date(ano, mes - 1, melhorDia);
      fim = new Date(ano, mes, melhorDia - 1);
    } else {
      // Ciclo começou neste mês
      inicio = new Date(ano, mes, melhorDia);
      fim = new Date(ano, mes + 1, melhorDia - 1);
    }
  
    return { inicio, fim };
  }

/**
 * Retorna a data de vencimento da fatura para uma compra, baseado no melhor dia e vencimento do cartão.
 * @param melhorDia Número do melhor dia de compra (ex: 25)
 * @param vencimento Dia do vencimento do cartão (ex: 2)
 * @param dataCompra Data da compra
 * @returns Date de vencimento da fatura
 */
export function getVencimentoFatura(melhorDia: number, vencimento: number, dataCompra: Date): Date {
  // Descobre o ciclo da fatura da compra
  const { fim } = getPeriodoFatura(melhorDia, dataCompra);

  // O vencimento é sempre no mês seguinte ao fim do ciclo
  let anoVenc = fim.getFullYear();
  let mesVenc = fim.getMonth() + 1; // mês seguinte

  if (mesVenc > 11) {
    mesVenc = 0;
    anoVenc += 1;
  }

  // Retorna a data de vencimento
  return new Date(anoVenc, mesVenc, vencimento);
}

/**
 * Retorna o status da fatura: aberta, fechada, prevista ou paga.
 * @param melhorDia Melhor dia de compra do cartão
 * @param vencimento Dia do vencimento do cartão
 * @param dataReferencia Data para checar o status (ex: hoje)
 * @param dataVencimento Data de vencimento da fatura
 * @param valorPago Valor já pago da fatura
 * @param valorTotal Valor total da fatura
 */
export function getStatusFatura(
  melhorDia: number,
  vencimento: number,
  dataReferencia: Date,
  dataVencimento: Date,
  valorPago: number,
  valorTotal: number
): 'aberta' | 'fechada' | 'prevista' | 'paga' {
  if (valorPago >= valorTotal) return 'paga';

  // O ciclo da fatura é sempre o mês anterior ao vencimento
  const ciclo = getPeriodoFatura(
    melhorDia,
    new Date(dataVencimento.getFullYear(), dataVencimento.getMonth() - 1, melhorDia)
  );

  if (dataReferencia < ciclo.inicio) {
    return 'prevista';
  } else if (dataReferencia >= ciclo.inicio && dataReferencia <= ciclo.fim) {
    return 'aberta';
  } else {
    return 'fechada';
  }
}

/**
 * Calcula o ciclo de uma fatura baseado no melhor dia de compra, mês/ano de vencimento da fatura.
 * Exemplo: melhorDia=25, mesVencimento=8, anoVencimento=2025
 * Retorna: { inicio: 25/06/2025, fim: 24/07/2025 }
 */
export function calcularCicloFatura(melhorDia: number, mesVencimento: number, anoVencimento: number) {
  // O ciclo começa no melhor dia do mês -2 e termina no melhor dia -1 do mês -1
  // Exemplo: vencimento em 02/08/2025, melhor dia 25
  // ciclo: 25/06/2025 até 24/07/2025
  const inicio = new Date(anoVencimento, mesVencimento - 2, melhorDia);
  const fim = new Date(anoVencimento, mesVencimento - 1, melhorDia - 1);
  return { inicio, fim };
}

/**
 * Retorna o status da fatura baseado no ciclo e na data de referência.
 * @param ciclo { inicio: Date, fim: Date }
 * @param dataReferencia Date
 */
export function statusFatura(
  ciclo: { inicio: Date, fim: Date },
  dataReferencia: Date
): 'prevista' | 'aberta' | 'fechada' {
  if (dataReferencia < ciclo.inicio) return 'prevista';
  if (dataReferencia > ciclo.fim) return 'fechada';
  return 'aberta';
}

/**
 * Compara dois ciclos de fatura.
 * Retorna -1 se cicloA é anterior, 1 se posterior, 0 se igual (sobrepõem).
 */
export function compararCiclos(cicloA: {inicio: Date, fim: Date}, cicloB: {inicio: Date, fim: Date}) {
  if (cicloA.fim < cicloB.inicio) return -1;
  if (cicloA.inicio > cicloB.fim) return 1;
  return 0;
}

// Função auxiliar para comparar datas apenas pelo dia
function mesmaData(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate();
}

/**
 * Retorna o status correto da fatura baseado no ciclo dela e no ciclo atual.
 */
export function statusFaturaCiclica(
  melhorDia: number,
  mesVencimento: number,
  anoVencimento: number,
  valorPago: number,
  valorTotal: number
): 'paga' | 'aberta' | 'fechada' | 'prevista' {
  if (valorPago >= valorTotal) return 'paga';
  const hoje = new Date();
  const cicloAnterior = calcularCicloFatura(melhorDia, mesVencimento - 1, anoVencimento);
  
  // Se hoje está dentro do ciclo anterior, a fatura do mês de vencimento está aberta
  if (
    (hoje > cicloAnterior.inicio && hoje < cicloAnterior.fim) ||
    mesmaData(hoje, cicloAnterior.inicio) ||
    mesmaData(hoje, cicloAnterior.fim)
  ) return 'aberta';
  
  // Se hoje está depois do ciclo anterior, está fechada
  if (hoje > cicloAnterior.fim) return 'fechada';
  // Se hoje está antes do ciclo anterior, está prevista
  return 'prevista';
}