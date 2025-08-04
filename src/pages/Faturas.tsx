"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../integrations/supabase/client"
import { useAuthSession } from '@/hooks/useAuthSession'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getStatusFatura } from "../lib/faturas"
import {
  ArrowLeft,
  CreditCard,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingDown,
  Eye,
  Receipt,
  Banknote,
  X,
} from "lucide-react"

interface Cartao {
  id: string
  nome: string
  limite_credito: number
  dia_vencimento: number
  melhor_dia_compra?: number
  taxa_juros_rotativo: number
  ativo: boolean
  created_at: string
  updated_at: string
}

interface Parcela {
  id: string
  conta_id: string
  numero_parcela: number
  valor_parcela: number
  data_vencimento: string
  status: string
  created_at: string
}

interface Conta {
  id: string
  titulo: string
  valor_total: number
  cartao_id: string | null
  categoria_id: string | null
  tipo_conta: string
  total_parcelas: number
  data_primeira_parcela: string
  user_id: string
  created_at: string
}

interface Fatura {
  id: string
  cartao_id: string
  mes_referencia: string
  mes: number
  ano: number
  valor_total: number
  valor_pago: number
  valor_restante: number
  data_vencimento: string
  status: string
  juros_aplicados: number
  user_id: string
  created_at: string
  updated_at: string
}

interface Pagamento {
  id: string
  fatura_id: string
  valor_pago: number
  data_pagamento: string
  tipo_pagamento: "Total" | "Parcial"
  created_at: string
}

interface CompraRecorrente {
  id: string
  user_id: string
  cartao_id: string
  titulo: string
  valor: number
  categoria_id: string | null
  dia_cobranca: number
  ativa: boolean
  data_inicio: string
  data_fim: string | null
  descricao: string | null
  created_at: string
  updated_at: string
}

const Faturas = () => {
  const { user, loading: authLoading } = useAuthSession()
  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [parcelas, setParcelas] = useState<any[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [faturas, setFaturas] = useState<any[]>([])
  const [comprasRecorrentes, setComprasRecorrentes] = useState<CompraRecorrente[]>([])
  const [loading, setLoading] = useState(true)
  const [modalPagamentoOpen, setModalPagamentoOpen] = useState(false)
  const [faturaSelecionada, setFaturaSelecionada] = useState<any | null>(null)
  const [valorPagamento, setValorPagamento] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const navigate = useNavigate()

  const [modalDetalhesOpen, setModalDetalhesOpen] = useState(false)
  const [faturaDetalhes, setFaturaDetalhes] = useState<any | null>(null)
  const [anoSelecionado, setAnoSelecionado] = useState(2025)
  const [mesSelecionadoDetalhes, setMesSelecionadoDetalhes] = useState(1)

  const [lancamentos, setLancamentos] = useState<any[]>([])
  const [loadingLancamentos, setLoadingLancamentos] = useState(false)

  const mostrarToast = (type: "success" | "error", text: string) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (user) {
      carregarDados(user.id)
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    const cartoesSubscription = supabase
      .channel("cartoes_melhor_dia_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "cartoes",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          if (payload.new?.melhor_dia_compra !== payload.old?.melhor_dia_compra) {
            await carregarDados(user.id)
          }
        },
      )
      .subscribe()

    return () => {
      cartoesSubscription.unsubscribe()
    }
  }, [user])

  useEffect(() => {
    if (modalDetalhesOpen && faturaDetalhes) {
      const carregarLancamentos = async () => {
        setLoadingLancamentos(true)
        try {
          const dados = await getLancamentosDaFatura(faturaDetalhes.cartao_id, anoSelecionado, mesSelecionadoDetalhes)
          setLancamentos(dados)
        } catch (error) {
          console.error("Erro ao carregar lançamentos:", error)
        } finally {
          setLoadingLancamentos(false)
        }
      }

      carregarLancamentos()
    }
  }, [modalDetalhesOpen, faturaDetalhes, anoSelecionado, mesSelecionadoDetalhes])

  const carregarDados = async (userId: string) => {
    try {
      const { data: cartoesData, error: cartoesError } = await supabase
        .from("cartoes")
        .select("*")
        .eq("user_id", userId)
        .eq("ativo", true)
        .order("nome", { ascending: true })

      if (cartoesError) {
        console.error("Erro ao carregar cartões:", cartoesError)
        return
      }
      if (cartoesData) {
        setCartoes(cartoesData)
      }

      const { data: contasData, error: contasError } = await supabase
        .from("contas")
        .select("*")
        .eq("user_id", userId)
        .eq("tipo_conta", "parcelada")
        .not("cartao_id", "is", null)

      if (contasError) {
        console.error("Erro ao carregar contas:", contasError)
        return
      }
      if (contasData) {
        setContas(contasData)
      }

      const { data: parcelasData, error: parcelasError } = await (supabase as any)
        .from("parcelas")
        .select("*")
        .eq("user_id", userId) // ✅ Filtrar por user_id
        .in("conta_id", contasData?.map((c) => c.id) || [])

      if (parcelasError) {
        console.error("Erro ao carregar parcelas:", parcelasError)
        return
      }
      if (parcelasData) {
        setParcelas(parcelasData)
      }

      const { data: faturasData, error: faturasError } = await (supabase as any)
        .from("faturas_cartao")
        .select("*")
        .eq("user_id", userId)
        .order("data_vencimento", { ascending: false })

      if (faturasError) {
        console.error("Erro ao carregar faturas:", faturasError)
        return
      }
      if (faturasData) {
        setFaturas(faturasData as any)
      }

      // Carregar compras recorrentes ativas
      const { data: comprasRecorrentesData, error: comprasRecorrentesError } = await (supabase as any)
        .from("compras_recorrentes_cartao")
        .select("*")
        .eq("user_id", userId)
        .eq("ativa", true)

      if (comprasRecorrentesError) {
        console.error("Erro ao carregar compras recorrentes:", comprasRecorrentesError)
      } else if (comprasRecorrentesData) {
        setComprasRecorrentes(comprasRecorrentesData as CompraRecorrente[])
      }

      if (cartoesData && contasData && parcelasData) {
        try {
          await gerarFaturasAutomaticas(cartoesData, contasData, parcelasData, comprasRecorrentesData || [])
        } catch (error) {
          console.error("🔖 Erro ao gerar faturas:", error)
        }
      }

      await atualizarStatusFaturas(cartoesData)
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    } finally {
      setLoading(false)
    }
  }

  const atualizarStatusFaturas = async (cartoes: any[]) => {
    if (!user) return
    for (const cartao of cartoes) {
      console.log("🔍 Processando cartão:", cartao.nome, "melhor_dia_compra:", cartao.melhor_dia_compra)
      if (!cartao.melhor_dia_compra) continue

      const faturasDoCartao = faturas.filter((f) => f.cartao_id === cartao.id)

      for (const fatura of faturasDoCartao) {
        // ✅ NÃO recalcular status de faturas que já estão como "paga" (faturas históricas)
        if (fatura.status === "paga") {
          continue
        }

        const hoje = new Date()
        const dataVencimentoFatura = new Date(fatura.data_vencimento + "T03:00:00Z")
        
        console.log("🔍 Fatura:", fatura.mes_referencia, "status atual:", fatura.status)
        console.log("🔍 Hoje:", hoje.toISOString().slice(0, 10))
        console.log("🔍 Data vencimento:", dataVencimentoFatura.toISOString().slice(0, 10))

        const novoStatus = getStatusFaturaLocal(
          cartao.melhor_dia_compra,
          cartao.dia_vencimento,
          hoje,
          dataVencimentoFatura,
          fatura.valor_pago,
          fatura.valor_total,
        )

        console.log("🔍 Novo status calculado:", novoStatus)

        if (fatura.status !== novoStatus) {
          const { error } = await (supabase as any)
            .from("faturas_cartao")
            .update({ status: novoStatus })
            .eq("id", fatura.id)
            .eq("user_id", user.id)
          if (error) {
            console.error("🔖 Erro ao atualizar status da fatura:", error)
          } else {
            console.log("✅ Status atualizado de", fatura.status, "para", novoStatus)
          }
        }
      }
    }

    const { data: faturasAtualizadas, error: faturasError } = await (supabase as any)
      .from("faturas_cartao")
      .select("*")
      .eq("user_id", user.id)
      .order("data_vencimento", { ascending: false })

    if (faturasError) {
      console.error("🔖 Erro ao recarregar faturas:", faturasError)
    } else if (faturasAtualizadas) {
      setFaturas(faturasAtualizadas as any)
    }
  }

  const gerarFaturasAutomaticas = async (cartoes: any[], contas: any[], parcelas: any[], comprasRecorrentes: CompraRecorrente[]) => {
    if (!user) return
    for (const cartao of cartoes) {
      const contasDoCartao = contas.filter((c) => c.cartao_id === cartao.id)

      const parcelasDoCartao = parcelas.filter((p) => {
        const conta = contasDoCartao.find((c) => c.id === p.conta_id)
        return conta && p.status === "pendente"
      })

      // ✅ NOVA FUNCIONALIDADE: Buscar compras recorrentes do cartão
      const comprasRecorrentesDoCartao = comprasRecorrentes.filter((cr) => cr.cartao_id === cartao.id && cr.ativa)

      const parcelasPorMes = new Map<string, any[]>()
      const mesesComMovimentacao = new Set<string>()

      parcelasDoCartao.forEach((parcela) => {
        const dataVencimento = new Date(parcela.data_vencimento)
        const mes = dataVencimento.getMonth() + 1
        const ano = dataVencimento.getFullYear()
        const chave = `${ano}-${mes.toString().padStart(2, "0")}`

        if (!parcelasPorMes.has(chave)) {
          parcelasPorMes.set(chave, [])
        }
        parcelasPorMes.get(chave)!.push(parcela)
        mesesComMovimentacao.add(chave)
      })

      // ✅ NOVA FUNCIONALIDADE: Adicionar meses que têm compras recorrentes
      // Gerar faturas para os próximos 6 meses que tenham compras recorrentes
      if (comprasRecorrentesDoCartao.length > 0) {
        const hoje = new Date()
        for (let i = 0; i < 6; i++) {
          const dataFutura = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1)
          const mes = dataFutura.getMonth() + 1
          const ano = dataFutura.getFullYear()
          const chave = `${ano}-${mes.toString().padStart(2, "0")}`
          mesesComMovimentacao.add(chave)
          
          // Inicializar array de parcelas se não existir
          if (!parcelasPorMes.has(chave)) {
            parcelasPorMes.set(chave, [])
          }
        }
      }

      for (const chave of mesesComMovimentacao) {
        const [ano, mes] = chave.split("-")
        const anoNum = Number.parseInt(ano)
        const mesNum = Number.parseInt(mes)
        const parcelasDoMes = parcelasPorMes.get(chave) || []

        // ✅ Calcular valor das parcelas normais
        const valorParcelas = parcelasDoMes.reduce((total, p) => total + p.valor_parcela, 0)

        // ✅ NOVA FUNCIONALIDADE: Calcular valor das compras recorrentes para este mês
        let valorComprasRecorrentes = 0
        comprasRecorrentesDoCartao.forEach((compra) => {
          const dataInicio = new Date(compra.data_inicio)
          const mesInicio = dataInicio.getMonth() + 1
          const anoInicio = dataInicio.getFullYear()
          
          // Verificar se a compra recorrente já deveria estar ativa neste mês
          const dataFim = compra.data_fim ? new Date(compra.data_fim) : null
          const mesFim = dataFim ? dataFim.getMonth() + 1 : null
          const anoFim = dataFim ? dataFim.getFullYear() : null
          
          // A compra é válida se:
          // 1. O mês/ano é igual ou posterior ao início
          // 2. Não há data fim OU o mês/ano é anterior ou igual ao fim
          const isDepoisInicio = (anoNum > anoInicio) || (anoNum === anoInicio && mesNum >= mesInicio)
          const isAntesFim = !dataFim || (anoNum < anoFim!) || (anoNum === anoFim! && mesNum <= mesFim!)
          
          if (isDepoisInicio && isAntesFim) {
            valorComprasRecorrentes += compra.valor
          }
        })

        const valorTotal = valorParcelas + valorComprasRecorrentes

        const mesReferenciaFormatada = `${anoNum}-${mesNum.toString().padStart(2, "0")}-01`
        const faturaExistente = faturas.find((f) => f.cartao_id === cartao.id && f.mes_referencia === mesReferenciaFormatada)

        if (faturaExistente) {
          // ✅ NOVA FUNCIONALIDADE: Atualizar fatura existente com compras recorrentes
          const novoValorTotal = valorParcelas + valorComprasRecorrentes
          if (novoValorTotal !== faturaExistente.valor_total && novoValorTotal > 0) {
            const novoValorRestante = novoValorTotal - faturaExistente.valor_pago
            
            const { error } = await (supabase as any)
              .from("faturas_cartao")
              .update({
                valor_total: novoValorTotal,
                valor_restante: novoValorRestante,
                updated_at: new Date().toISOString(),
              })
              .eq("id", faturaExistente.id)
              .eq("user_id", user.id)

            if (!error) {
              // Atualizar o estado local
              setFaturas((prev) => 
                prev.map((f) => 
                  f.id === faturaExistente.id 
                    ? { ...f, valor_total: novoValorTotal, valor_restante: novoValorRestante }
                    : f
                )
              )
            }
          }
        } else if (valorTotal > 0) {
          const mesVencimento = mesNum + 1
          const anoVencimento = mesVencimento > 12 ? anoNum + 1 : anoNum
          const mesVencimentoAjustado = mesVencimento > 12 ? 1 : mesVencimento
          const dataVencimento = new Date(anoVencimento, mesVencimentoAjustado - 1, cartao.dia_vencimento)

          const hoje = new Date()
          let status = "aberta"

          if (dataVencimento < hoje) {
            status = "fechada"
          }

          if (cartao.melhor_dia_compra) {
            const ultimoDiaAberto = cartao.melhor_dia_compra - 1
            const mesFechamento = mesVencimentoAjustado === 1 ? 12 : mesVencimentoAjustado - 1
            const anoFechamento = mesVencimentoAjustado === 1 ? anoVencimento - 1 : anoVencimento
            const dataFechamento = new Date(anoFechamento, mesFechamento - 1, ultimoDiaAberto)

            if (hoje > dataFechamento) {
              status = "fechada"
            }
          }

          const { data: novaFatura, error } = await (supabase as any)
            .from("faturas_cartao")
            .insert({
              cartao_id: cartao.id,
              user_id: user.id,
              mes_referencia: `${anoNum}-${mesNum.toString().padStart(2, "0")}-01`,
              mes: mesNum,
              ano: anoNum,
              valor_total: valorTotal,
              valor_pago: 0,
              valor_restante: valorTotal,
              data_vencimento: dataVencimento.toISOString().slice(0, 10),
              status: status,
            })
            .select()
            .single()

          if (novaFatura && !error) {
            setFaturas((prev) => [...prev, novaFatura])
          }
        }
      }
    }
  }

  const calcularJuros = (fatura: any, cartao: Cartao) => {
    const hoje = new Date()
    const dataVencimento = new Date(fatura.data_vencimento)

    if (hoje > dataVencimento && fatura.valor_restante > 0) {
      const diasAtraso = Math.floor((hoje.getTime() - dataVencimento.getTime()) / (1000 * 60 * 60 * 24))
      const jurosDiario = cartao.taxa_juros_rotativo / 30
      const jurosTotal = (fatura.valor_restante * jurosDiario * diasAtraso) / 100

      return jurosTotal
    }

    return 0
  }

  const abrirModalPagamento = (fatura: any) => {
    setFaturaSelecionada(fatura)
    const valorRestante = Math.max(0, fatura.valor_total - fatura.valor_pago)
    setValorPagamento(valorRestante.toString())
    setMessage(null)
    setModalPagamentoOpen(true)
  }

  const abrirModalDetalhes = (fatura: any) => {
    setFaturaDetalhes(fatura)
    const dataVencimento = new Date(fatura.data_vencimento)
    setAnoSelecionado(dataVencimento.getFullYear())
    setMesSelecionadoDetalhes(dataVencimento.getMonth() + 1)
    setModalDetalhesOpen(true)
  }

  const getFaturasPorCartao = (cartaoId: string, ano: number, mes: number) => {
    return faturas.filter((fatura) => {
      if (fatura.cartao_id !== cartaoId) return false

      const dataVencimento = new Date(fatura.data_vencimento)
      const mesVencimento = dataVencimento.getMonth() + 1
      const anoVencimento = dataVencimento.getFullYear()

      return mesVencimento === mes && anoVencimento === ano
    })
  }

  const getComprasDaFatura = (cartaoId: string, ano: number, mes: number) => {
    const contasDoCartao = contas.filter((conta) => conta.cartao_id === cartaoId)

    const parcelasDoMes = parcelas.filter((parcela) => {
      const conta = contasDoCartao.find((c) => c.id === parcela.conta_id)
      if (!conta) return false

      const dataVencimento = new Date(parcela.data_vencimento)
      const mesVencimento = dataVencimento.getMonth() + 1
      const anoVencimento = dataVencimento.getFullYear()

      return mesVencimento === mes && anoVencimento === ano
    })

    // ✅ Compras parceladas normais
    const compras = contasDoCartao
      .map((conta) => {
        const parcelasConta = parcelasDoMes.filter((p) => p.conta_id === conta.id)
        if (parcelasConta.length === 0) return null

        const totalParcelas = conta.total_parcelas
        const valorParcela = parcelasConta[0]?.valor_parcela || 0
        const numeroParcela = parcelasConta[0]?.numero_parcela || 1

        return {
          tipo: "parcelada",
          titulo: conta.titulo,
          valor_total: conta.valor_total,
          parcelas: parcelasConta,
          valor_parcelas: parcelasConta.reduce((total, p) => total + p.valor_parcela, 0),
          total_parcelas: totalParcelas,
          valor_parcela: valorParcela,
          numero_parcela_atual: numeroParcela,
          data_criacao: conta.created_at,
          categoria_id: conta.categoria_id,
        }
      })
      .filter(Boolean)

    // ✅ NOVA FUNCIONALIDADE: Adicionar compras recorrentes válidas para este mês
    const comprasRecorrentesDoCartao = comprasRecorrentes.filter((cr) => {
      if (cr.cartao_id !== cartaoId || !cr.ativa) return false
      
      const dataInicio = new Date(cr.data_inicio)
      const mesInicio = dataInicio.getMonth() + 1
      const anoInicio = dataInicio.getFullYear()
      
      const dataFim = cr.data_fim ? new Date(cr.data_fim) : null
      const mesFim = dataFim ? dataFim.getMonth() + 1 : null
      const anoFim = dataFim ? dataFim.getFullYear() : null
      
      const isDepoisInicio = (ano > anoInicio) || (ano === anoInicio && mes >= mesInicio)
      const isAntesFim = !dataFim || (ano < anoFim!) || (ano === anoFim! && mes <= mesFim!)
      
      return isDepoisInicio && isAntesFim
    })

    const comprasRecorrentesFormatadas = comprasRecorrentesDoCartao.map((compra) => ({
      tipo: "recorrente",
      titulo: compra.titulo,
      valor_total: compra.valor,
      parcelas: [],
      valor_parcelas: compra.valor,
      total_parcelas: null,
      valor_parcela: compra.valor,
      numero_parcela_atual: null,
      data_criacao: compra.created_at,
      descricao: compra.descricao,
      categoria_id: compra.categoria_id,
    }))

    return [...compras, ...comprasRecorrentesFormatadas]
  }

  const getLancamentosDaFatura = async (cartaoId: string, ano: number, mes: number) => {
    const lancamentos: any[] = []

    const compras = getComprasDaFatura(cartaoId, ano, mes)

    compras.forEach((compra) => {
      let descricao = ""
      if (compra.tipo === "parcelada") {
        descricao = `${compra.titulo} - Parcela ${compra.numero_parcela_atual} de ${compra.total_parcelas}`
      } else if (compra.tipo === "recorrente") {
        descricao = `${compra.titulo} - Compra Recorrente`
      } else {
        descricao = compra.titulo
      }

      lancamentos.push({
        tipo: "compra",
        descricao: descricao,
        valor: compra.valor_parcelas,
        data: compra.data_criacao || new Date().toISOString(),
        categoria_id: compra.categoria_id || null,
      })
    })

    if (user) {
      const faturaDoPeriodo = faturas.find((fatura) => {
        if (fatura.cartao_id !== cartaoId) return false

        const dataVencimento = new Date(fatura.data_vencimento)
        const mesVencimento = dataVencimento.getMonth() + 1
        const anoVencimento = dataVencimento.getFullYear()

        return mesVencimento === mes && anoVencimento === ano
      })

      if (faturaDoPeriodo) {
        const { data: pagamentos, error } = await (supabase as any)
          .from("pagamentos_fatura")
          .select("*")
          .eq("fatura_id", faturaDoPeriodo.id)
          .order("data_pagamento", { ascending: true })

        if (!error && pagamentos) {
          pagamentos.forEach((pagamento: any) => {
            lancamentos.push({
              tipo: "pagamento",
              descricao: `Pagamento ${pagamento.tipo_pagamento}`,
              valor: -pagamento.valor_pago,
              data: pagamento.data_pagamento,
            })
          })
        }
      }
    }

    return lancamentos.sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
  }

  const processarPagamento = async () => {
    if (!faturaSelecionada || !valorPagamento) {
      setMessage({ type: "error", text: "Selecione uma fatura e informe o valor" })
      return
    }

    const valor = Number.parseFloat(valorPagamento)

    if (Number.isNaN(valor) || valor <= 0) {
      setMessage({ type: "error", text: "Valor deve ser maior que zero" })
      return
    }

    const valorRestante = faturaSelecionada.valor_total - faturaSelecionada.valor_pago

    if (faturaSelecionada.status === "fechada") {
      if (valor !== valorRestante) {
        setMessage({
          type: "error",
          text: `Fatura fechada deve ser paga integralmente. Valor restante: R$ ${valorRestante.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
        })
        setValorPagamento("")
        return
      }
    } else if (valor > valorRestante) {
      setMessage({
        type: "error",
        text: `Valor não pode ser maior que R$ ${valorRestante.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      })
      setValorPagamento("")
      return
    }

    try {
      const novoValorPago = faturaSelecionada.valor_pago + valor
      const novoValorRestante = faturaSelecionada.valor_total - novoValorPago

      let novoStatus = faturaSelecionada.status
      if (novoValorRestante === 0 && faturaSelecionada.status === "fechada") {
        novoStatus = "paga"
      } else {
        novoStatus = faturaSelecionada.status
      }

      let novoValorTotal = faturaSelecionada.valor_total
      if (faturaSelecionada.status === "aberta" || faturaSelecionada.status === "prevista") {
        novoValorTotal = faturaSelecionada.valor_total
      }

      const { error: errorFatura } = await (supabase as any)
        .from("faturas_cartao")
        .update({
          valor_pago: novoValorPago,
          valor_restante: novoValorRestante,
          valor_total: novoValorTotal,
          status: novoStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", faturaSelecionada.id)
        .eq("user_id", user!.id)

      if (errorFatura) {
        console.error("Erro ao atualizar fatura:", errorFatura)
        setMessage({ type: "error", text: "Erro ao processar pagamento da fatura" })
        return
      }

      const tipoPagamento = valor === valorRestante ? "total" : "parcial"
      const { error: errorPagamento } = await (supabase as any).from("pagamentos_fatura").insert({
        fatura_id: faturaSelecionada.id,
        valor_pago: valor,
        data_pagamento: new Date().toISOString(),
        tipo_pagamento: tipoPagamento,
      })

      if (errorPagamento) {
        console.error("Erro ao registrar pagamento:", errorPagamento)
        setMessage({ type: "error", text: "Erro ao registrar pagamento na tabela" })
        return
      }

      // ✅ NOVA FUNCIONALIDADE: Atualizar status das parcelas quando fatura for paga
      if (novoStatus === "paga") {
        // Buscar parcelas desta fatura
        const dataVencimentoFatura = new Date(faturaSelecionada.data_vencimento)
        const mesFatura = dataVencimentoFatura.getMonth() + 1
        const anoFatura = dataVencimentoFatura.getFullYear()
        
        // Buscar contas do cartão
        const contasDoCartao = contas.filter((conta) => conta.cartao_id === faturaSelecionada.cartao_id)
        
        // Buscar parcelas do mês da fatura
        const parcelasParaAtualizar = parcelas.filter((parcela) => {
          const conta = contasDoCartao.find((c) => c.id === parcela.conta_id)
          if (!conta) return false

          const dataVencimentoParcela = new Date(parcela.data_vencimento)
          const mesParcela = dataVencimentoParcela.getMonth() + 1
          const anoParcela = dataVencimentoParcela.getFullYear()

          return mesParcela === mesFatura && anoParcela === anoFatura && parcela.status === "pendente"
        })

        // Atualizar cada parcela para "paga"
        for (const parcela of parcelasParaAtualizar) {
          const { error: errorParcela } = await supabase
            .from("parcelas")
            .update({
              status: "paga",
              data_pagamento: new Date().toISOString(),
              user_id: user!.id // ✅ Adicionar user_id para segurança
            })
            .eq("id", parcela.id)

          if (errorParcela) {
            console.error("🔖 Erro ao atualizar parcela:", errorParcela)
          }
        }

        // Recarregar parcelas atualizadas
        const { data: parcelasAtualizadas, error: parcelasError } = await supabase
          .from("parcelas")
          .select("*")
          .in("conta_id", contas.map((c) => c.id) || [])

        if (!parcelasError && parcelasAtualizadas) {
          setParcelas(parcelasAtualizadas)
        }
      }

      const { data: faturasAtualizadas, error: faturasError } = await (supabase as any)
        .from("faturas_cartao")
        .select("*")
        .eq("user_id", user!.id)
        .order("data_vencimento", { ascending: false })

      if (faturasError) {
        console.error("Erro ao recarregar faturas:", faturasError)
      } else if (faturasAtualizadas) {
        setFaturas(faturasAtualizadas as any)
      }

      const mensagemSucesso =
        novoValorRestante === 0
          ? "Fatura paga com sucesso!"
          : `Pagamento de R$ ${valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} processado com sucesso!`

      mostrarToast("success", mensagemSucesso)
      setModalPagamentoOpen(false)
      setFaturaSelecionada(null)
      setValorPagamento("")
    } catch (error) {
      console.error("Erro ao processar pagamento:", error)
      setMessage({ type: "error", text: "Erro inesperado ao processar pagamento" })
    }
  }

  const getFaturasRelevantes = () => {
    // Agrupa faturas por cartão
    const faturasPorCartao = new Map<string, any[]>()
    
    faturas.forEach((fatura) => {
      if (!faturasPorCartao.has(fatura.cartao_id)) {
        faturasPorCartao.set(fatura.cartao_id, [])
      }
      faturasPorCartao.get(fatura.cartao_id)!.push(fatura)
    })

    // Para cada cartão, seleciona apenas uma fatura seguindo a prioridade:
    // 1. Fatura "fechada" (prioridade máxima)
    // 2. Fatura "aberta" (se não houver fechada)
    // 3. Fatura "prevista" (se não houver fechada nem aberta)
    // 4. Não mostra "paga" (faturas já pagas ficam no histórico)
    const faturasExibir: any[] = []

    faturasPorCartao.forEach((faturasDoCartao) => {
      // Busca primeiro por fatura fechada
      const faturaFechada = faturasDoCartao.find((f) => f.status === "fechada")
      
      if (faturaFechada) {
        faturasExibir.push(faturaFechada)
      } else {
        // Se não houver fechada, busca por aberta
        const faturaAberta = faturasDoCartao.find((f) => f.status === "aberta")
        if (faturaAberta) {
          faturasExibir.push(faturaAberta)
        } else {
          // Se não houver fechada nem aberta, busca por prevista
          const faturaPrevista = faturasDoCartao.find((f) => f.status === "prevista")
          if (faturaPrevista) {
            faturasExibir.push(faturaPrevista)
          }
        }
        // Não adiciona faturas com status "paga"
      }
    })

    return faturasExibir
  }

  const getStatusFaturaLocal = (
    melhorDiaCompra: number | undefined,
    diaVencimento: number,
    hoje: Date,
    dataVencimentoFatura: Date,
    valorPago: number,
    valorTotal: number,
  ): "aberta" | "fechada" | "paga" | "prevista" => {
    if (!melhorDiaCompra) {
      return "aberta"
    }

    return getStatusFatura(melhorDiaCompra, diaVencimento, hoje, dataVencimentoFatura, valorPago, valorTotal)
  }

  const getCorStatusFatura = (status: "aberta" | "fechada" | "paga" | "prevista") => {
    switch (status) {
      case "aberta":
        return "bg-blue-500/20 text-blue-300 border-blue-500/30"
      case "fechada":
        return "bg-red-500/20 text-red-300 border-red-500/30"
      case "paga":
        return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
      case "prevista":
        return "bg-orange-500/20 text-orange-300 border-orange-500/30"
      default:
        return "bg-gray-500/20 text-gray-300 border-gray-500/30"
    }
  }

  const getTextoStatusFatura = (status: "aberta" | "fechada" | "paga" | "prevista") => {
    switch (status) {
      case "aberta":
        return "Aberta"
      case "fechada":
        return "Fechada"
      case "paga":
        return "Paga"
      case "prevista":
        return "Prevista"
      default:
        return "Desconhecido"
    }
  }

  const getIconeStatusFatura = (status: "aberta" | "fechada" | "paga" | "prevista") => {
    switch (status) {
      case "aberta":
        return <Calendar className="w-4 h-4" />
      case "fechada":
        return <TrendingDown className="w-4 h-4" />
      case "paga":
        return <CheckCircle className="w-4 h-4" />
      case "prevista":
        return <Clock className="w-4 h-4" />
      default:
        return <AlertTriangle className="w-4 h-4" />
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Carregando faturas...</p>
        </div>
      </div>
    )
  }

  const faturasRelevantes = getFaturasRelevantes()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2">
          <div
            className={`px-6 py-4 rounded-lg shadow-lg backdrop-blur-sm border ${
              toast.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                : "bg-red-500/10 border-red-500/20 text-red-300"
            }`}
          >
            {toast.text}
          </div>
        </div>
      )}

      {/* Header Principal */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm"></div>
        <div className="relative px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-6">
                <Button
                  variant="outline"
                  size="icon"
                  className="border-white/20 text-white hover:bg-white/10 transition-all duration-200 bg-transparent"
                  onClick={() => navigate("/")}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                  <h1 className="text-4xl font-bold text-white tracking-tight drop-shadow-lg">Controle de Faturas</h1>
                  <p className="text-xl text-blue-100 drop-shadow-md">Gerencie pagamentos e juros dos cartões</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 pb-8 mt-8">
        {/* Lista de Faturas */}
        {faturasRelevantes.length === 0 ? (
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CreditCard className="w-12 h-12 text-blue-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-2">Nenhuma fatura encontrada</h3>
              <p className="text-gray-400 mb-6">
                Não há faturas fechadas ou abertas para exibir no momento.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {faturasRelevantes.map((fatura) => {
              const cartao = cartoes.find((c) => c.id === fatura.cartao_id)
              const juros = cartao ? calcularJuros(fatura, cartao) : 0
              const valorRestante = fatura.valor_total - fatura.valor_pago

              return (
                <Card
                  key={fatura.id}
                  className="bg-white/10 border-white/10 backdrop-blur-sm hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer hover:border-blue-400/30"
                  onClick={() => abrirModalDetalhes(fatura)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold text-white">
                            {cartao?.nome || "Cartão não encontrado"}
                          </CardTitle>
                          <p className="text-sm text-gray-400">
                            Vencimento: {new Date(fatura.data_vencimento + "T03:00:00Z").toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className={getCorStatusFatura(fatura.status)}>
                          {getIconeStatusFatura(fatura.status)}
                          <span className="ml-1">{getTextoStatusFatura(fatura.status)}</span>
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Valor Total</p>
                        <p className="font-semibold text-white">
                          {fatura.valor_total.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Valor Pago</p>
                        <p className="font-semibold text-emerald-400">
                          {fatura.valor_pago.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">Valor Restante</p>
                        <p className="font-semibold text-orange-400">
                          {valorRestante.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">{juros > 0 ? "Juros (Atraso)" : "Total a Pagar"}</p>
                        <p className={`font-semibold ${juros > 0 ? "text-red-400" : "text-white"}`}>
                          {juros > 0
                            ? juros.toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })
                            : (valorRestante + juros).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                        </p>
                      </div>
                    </div>

                    {fatura.status !== "paga" && (
                      <Button
                        onClick={(e) => {
                          e.stopPropagation()
                          abrirModalPagamento(fatura)
                        }}
                        className={`w-full mt-4 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 ${
                          fatura.status === "fechada"
                            ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                            : fatura.status === "aberta"
                              ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                              : "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                        }`}
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        {fatura.status === "fechada"
                          ? "Pagar Fatura"
                          : fatura.status === "aberta"
                            ? "Fazer Pagamento"
                            : "Pagamento Antecipado"}
                      </Button>
                    )}

                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        abrirModalDetalhes(fatura)
                      }}
                      variant="outline"
                      className="w-full border-white/20 text-white hover:bg-white/10 bg-transparent"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalhes
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de Pagamento */}
      <Dialog open={modalPagamentoOpen} onOpenChange={setModalPagamentoOpen}>
        <DialogContent className="bg-slate-900/95 border-slate-700 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="text-white text-xl flex items-center">
              <Banknote className="w-5 h-5 mr-2 text-green-400" />
              Pagar Fatura
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {faturaSelecionada && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cartão:</span>
                    <span className="text-white font-medium">
                      {cartoes.find((c) => c.id === faturaSelecionada.cartao_id)?.nome}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Fatura:</span>
                    <span className="text-white font-medium">
                      {new Date(faturaSelecionada.data_vencimento + "T03:00:00Z").getMonth() + 1}/
                      {new Date(faturaSelecionada.data_vencimento + "T03:00:00Z").getFullYear()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Valor restante:</span>
                    <span className="text-orange-400 font-semibold">
                      {Math.max(0, faturaSelecionada.valor_total - faturaSelecionada.valor_pago).toLocaleString(
                        "pt-BR",
                        {
                          style: "currency",
                          currency: "BRL",
                        },
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {message && (
              <div
                className={`p-3 rounded-lg border ${
                  message.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                    : "bg-red-500/10 border-red-500/20 text-red-300"
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="valor" className="text-white font-medium">
                Valor do Pagamento (R$)
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  value={valorPagamento}
                  onChange={(e) => setValorPagamento(e.target.value)}
                  placeholder="0,00"
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pl-10"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={processarPagamento}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Confirmar Pagamento
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setModalPagamentoOpen(false)
                  setMessage(null)
                  setValorPagamento("")
                }}
                className="flex-1 border-white/20 text-white hover:bg-white/10 bg-transparent"
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes da Fatura */}
      <Dialog open={modalDetalhesOpen} onOpenChange={setModalDetalhesOpen}>
        <DialogContent className="bg-slate-900/95 border-slate-700 backdrop-blur-sm max-w-4xl max-h-[90vh] overflow-y-auto">
          {faturaDetalhes && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <DialogTitle className="text-2xl font-bold text-white flex items-center">
                      <Receipt className="w-6 h-6 mr-3 text-blue-400" />
                      {cartoes.find((c) => c.id === faturaDetalhes.cartao_id)?.nome}
                    </DialogTitle>
                    <div className="text-sm text-gray-400 mt-2 space-y-1">
                      <p>
                        Limite:{" "}
                        {cartoes
                          .find((c) => c.id === faturaDetalhes.cartao_id)
                          ?.limite_credito.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                      </p>
                      <p>
                        Melhor dia de compra: Dia{" "}
                        {cartoes.find((c) => c.id === faturaDetalhes.cartao_id)?.melhor_dia_compra ||
                          cartoes.find((c) => c.id === faturaDetalhes.cartao_id)?.dia_vencimento}
                      </p>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Seletor de Ano */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Selecionar Ano</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[2024, 2025, 2026].map((ano) => (
                      <Button
                        key={ano}
                        variant={anoSelecionado === ano ? "default" : "outline"}
                        size="sm"
                        onClick={() => setAnoSelecionado(ano)}
                        className={`${
                          anoSelecionado === ano
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "border-white/20 text-white hover:bg-white/10 bg-transparent"
                        }`}
                      >
                        {ano}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Seletor de Mês */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Selecionar Mês</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 12 }, (_, i) => {
                      const mes = i + 1
                      const nomesMeses = [
                        "Jan",
                        "Fev",
                        "Mar",
                        "Abr",
                        "Mai",
                        "Jun",
                        "Jul",
                        "Ago",
                        "Set",
                        "Out",
                        "Nov",
                        "Dez",
                      ]
                      return (
                        <Button
                          key={mes}
                          variant={mesSelecionadoDetalhes === mes ? "default" : "outline"}
                          size="sm"
                          onClick={() => setMesSelecionadoDetalhes(mes)}
                          className={`${
                            mesSelecionadoDetalhes === mes
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : "border-white/20 text-white hover:bg-white/10 bg-transparent"
                          }`}
                        >
                          {nomesMeses[mes - 1]}
                        </Button>
                      )
                    })}
                  </div>
                </div>

                {/* Detalhes da Fatura */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  {(() => {
                    const faturaAtual = getFaturasPorCartao(
                      faturaDetalhes.cartao_id,
                      anoSelecionado,
                      mesSelecionadoDetalhes,
                    )[0]
                    const compras = getComprasDaFatura(faturaDetalhes.cartao_id, anoSelecionado, mesSelecionadoDetalhes)

                    return (
                      <>
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-white">
                              {new Date(anoSelecionado, mesSelecionadoDetalhes - 1)
                                .toLocaleDateString("pt-BR", {
                                  month: "long",
                                  year: "numeric",
                                })
                                .replace(/^\w/, (c) => c.toUpperCase())}
                            </h3>
                            {faturaAtual &&
                              (() => {
                                const status = faturaAtual.status as "aberta" | "fechada" | "paga" | "prevista"
                                return (
                                  <Badge variant="secondary" className={getCorStatusFatura(status)}>
                                    {getIconeStatusFatura(status)}
                                    <span className="ml-1">{getTextoStatusFatura(status)}</span>
                                  </Badge>
                                )
                              })()}
                          </div>
                          {faturaAtual && faturaAtual.status !== "paga" && (
                            <Button
                              onClick={(e) => {
                                e.stopPropagation()
                                abrirModalPagamento(faturaAtual)
                                setModalDetalhesOpen(false)
                              }}
                              className={`text-white shadow-lg hover:shadow-xl transition-all duration-200 ${
                                faturaAtual.status === "fechada"
                                  ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"
                                  : faturaAtual.status === "aberta"
                                    ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                                    : "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                              }`}
                            >
                              <DollarSign className="w-4 h-4 mr-2" />
                              {faturaAtual.status === "fechada"
                                ? "Pagar Fatura"
                                : faturaAtual.status === "aberta"
                                  ? "Fazer Pagamento"
                                  : "Pagamento Antecipado"}
                            </Button>
                          )}
                        </div>

                        {faturaAtual ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-gray-400">Valor Total da Fatura</p>
                              <p className="font-semibold text-white">
                                {faturaAtual.valor_total.toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400">Valor Atual da Fatura</p>
                              <p className="font-semibold text-orange-400">
                                {Math.max(0, faturaAtual.valor_total - faturaAtual.valor_pago).toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-400">Vencimento</p>
                              <p className="font-semibold text-white">
                                {new Date(faturaAtual.data_vencimento + "T03:00:00Z").toLocaleDateString("pt-BR")}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400">Nenhuma fatura encontrada para este período.</p>
                        )}
                      </>
                    )
                  })()}
                </div>

                {/* Lançamentos da Fatura */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                    <Receipt className="w-5 h-5 mr-2 text-purple-400" />
                    Lançamentos da Fatura
                  </h3>
                  {loadingLancamentos ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-sm text-gray-400">Carregando lançamentos...</p>
                    </div>
                  ) : lancamentos.length === 0 ? (
                    <div className="text-center py-8">
                      <Receipt className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">Nenhum lançamento encontrado para este mês.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {lancamentos.map((lancamento, index) => (
                        <div key={index} className="bg-white/5 border border-white/10 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-3">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  lancamento.tipo === "compra" ? "bg-blue-500/20" : "bg-emerald-500/20"
                                }`}
                              >
                                {lancamento.tipo === "compra" ? (
                                  <CreditCard className="w-4 h-4 text-blue-400" />
                                ) : (
                                  <DollarSign className="w-4 h-4 text-emerald-400" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-white">{lancamento.descricao}</p>
                                <p className="text-sm text-gray-400">
                                  {new Date(lancamento.data).toLocaleDateString("pt-BR")}
                                </p>
                              </div>
                            </div>
                            <p
                              className={`font-semibold ${
                                lancamento.tipo === "compra" ? "text-white" : "text-emerald-400"
                              }`}
                            >
                              {lancamento.tipo === "compra" ? "+" : ""}
                              {Math.abs(lancamento.valor).toLocaleString("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Faturas
