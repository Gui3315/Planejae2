"use client"

import { useState, useEffect, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../integrations/supabase/client"
import { useAuthSession } from '@/hooks/useAuthSession'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getStatusFatura } from "../lib/faturas"
import { calcularVencimentoCompra, calcularCicloAtual, estaNoCiclo } from "../lib/ciclos-cartao"
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
  Edit2,
  Trash2,
  RefreshCw,
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

// ✅ Função exportável para atualizar status das faturas 
export const atualizarStatusFaturas = async (cartoes: any[], userId: string) => {
  // Importar as dependências necessárias
  const { getStatusFatura } = await import("../lib/faturas")
  const { supabase } = await import("../integrations/supabase/client")
  
  console.time('⚡ BATCH-UPDATE-STATUS')
  console.log('📊 Iniciando atualização de status para', cartoes.length, 'cartões')
  
  // Buscar faturas atuais do banco
  const { data: faturasAtuais, error: errorFaturas } = await (supabase as any)
    .from("faturas_cartao")
    .select("*")
    .eq("user_id", userId)
    .order("data_vencimento", { ascending: false })

  if (errorFaturas) {
    console.error("❌ Erro ao buscar faturas:", errorFaturas)
    return
  }

  console.log('📋 Total de faturas encontradas:', faturasAtuais?.length || 0)
  console.log('📋 Cartões a processar:', cartoes.map(c => ({ 
    id: c.id, 
    nome: c.nome, 
    melhor_dia: c.melhor_dia_compra, 
    dia_venc: c.dia_vencimento 
  })))

  const faturasParaAtualizar = []
  
  // Coleta todas as atualizações primeiro
  for (const cartao of cartoes) {
    if (!cartao.melhor_dia_compra) {
      console.log(`⚠️ Cartão ${cartao.nome} sem melhor_dia_compra configurado`)
      continue
    }

    const faturasDoCartao = faturasAtuais?.filter((f: any) => f.cartao_id === cartao.id) || []
    console.log(`📋 Cartão ${cartao.nome}: ${faturasDoCartao.length} faturas encontradas`)

    for (const fatura of faturasDoCartao) {
      if (fatura.status === "paga") continue

      const hoje = new Date()
      const dataVencimentoFatura = new Date(fatura.data_vencimento + "T03:00:00Z")
      
      // Usar a mesma lógica de cálculo de status que está no componente
      const novoStatus = getStatusFatura(
        cartao.melhor_dia_compra,
        cartao.dia_vencimento,
        hoje,
        dataVencimentoFatura,
        fatura.valor_pago,
        fatura.valor_total,
      )

      console.log(`🔍 Fatura ${fatura.id} (${cartao.nome}):`, {
        statusAtual: fatura.status,
        novoStatus,
        dataVencimento: dataVencimentoFatura.toLocaleDateString(),
        melhorDia: cartao.melhor_dia_compra,
        diaVencimento: cartao.dia_vencimento,
        hoje: hoje.toLocaleDateString()
      })

      if (fatura.status !== novoStatus) {
        console.log(`🔄 Fatura ${fatura.id}: ${fatura.status} → ${novoStatus}`)
        faturasParaAtualizar.push({
          id: fatura.id,
          status: novoStatus,
          updated_at: new Date().toISOString()
        })
      }
    }
  }

  // Batch update - fazendo update individual para cada fatura
  if (faturasParaAtualizar.length > 0) {
    console.log(`🔄 Atualizando ${faturasParaAtualizar.length} faturas:`, faturasParaAtualizar)
    
    // Fazer update individual para cada fatura para evitar problemas de RLS
    for (const fatura of faturasParaAtualizar) {
      const { error } = await (supabase as any)
        .from("faturas_cartao")
        .update({ 
          status: fatura.status, 
          updated_at: fatura.updated_at 
        })
        .eq("id", fatura.id)
        .eq("user_id", userId) // Adicionar user_id para respeitar RLS
      
      if (error) {
        console.error(`❌ Erro ao atualizar fatura ${fatura.id}:`, error)
      } else {
        console.log(`✅ Fatura ${fatura.id} atualizada: ${fatura.status}`)
      }
    }
    
    console.log('✅ Todas as faturas foram processadas')
  } else {
    console.log('ℹ️ Nenhuma fatura precisou ser atualizada')
  }
  
  console.timeEnd('⚡ BATCH-UPDATE-STATUS')
}

const Faturas = () => {
  const { user, loading: authLoading } = useAuthSession()
  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [parcelas, setParcelas] = useState<any[]>([])
  const [contas, setContas] = useState<Conta[]>([])
  const [faturas, setFaturas] = useState<any[]>([])
  const [comprasRecorrentes, setComprasRecorrentes] = useState<CompraRecorrente[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingStates, setLoadingStates] = useState({
    cartoes: true,
    faturas: true,
    contas: true,
    processamento: true
  })
  const [modalPagamentoOpen, setModalPagamentoOpen] = useState(false)
  const [faturaSelecionada, setFaturaSelecionada] = useState<any | null>(null)
  const [valorPagamento, setValorPagamento] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [lastUpdate, setLastUpdate] = useState(Date.now())
  const navigate = useNavigate()

  // ========================================
  // 🚀 PERFORMANCE + REATIVIDADE
  // ========================================

  // 🔄 REATIVIDADE COM REALTIME - Atualizações automáticas
  useEffect(() => {
    if (!user) return

    console.log('🔄 Configurando subscriptions para reatividade...')
    
    const subscriptions = [
      // ✅ 1. Cartões - mudanças no melhor_dia_compra ou configurações
      supabase
        .channel("cartoes-realtime-changes")
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "cartoes",
          filter: `user_id=eq.${user.id}`,
        }, async (payload) => {
          console.log('🔄 Cartão atualizado:', payload)
          
          // Se mudou melhor_dia_compra, recarregar tudo
          if (payload.eventType === 'UPDATE' && 
              payload.new?.melhor_dia_compra !== payload.old?.melhor_dia_compra) {
            console.log('📅 Melhor dia alterado, recarregando dados...')
            await carregarDados(user.id)
          } else {
            // Apenas atualizar cartão específico
            setCartoes(prev => prev.map(cartao =>
              cartao.id === (payload.new as any)?.id ? payload.new as any : cartao
            ))
          }
          setLastUpdate(Date.now())
        }),

      // ✅ 2. Faturas - atualizações de status, pagamentos, valores
      supabase
        .channel("faturas-realtime-changes")
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "faturas_cartao",
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          console.log('💳 Fatura atualizada:', payload)
          
          if (payload.eventType === 'INSERT') {
            setFaturas(prev => [...prev, payload.new])
          } else if (payload.eventType === 'UPDATE') {
            setFaturas(prev => prev.map(fatura =>
              fatura.id === payload.new.id ? payload.new : fatura
            ))
          } else if (payload.eventType === 'DELETE') {
            setFaturas(prev => prev.filter(fatura => fatura.id !== payload.old.id))
          }
          setLastUpdate(Date.now())
        }),

      // ✅ 3. Contas parceladas - novas compras parceladas
      supabase
        .channel("contas-realtime-changes")
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "contas",
          filter: `user_id=eq.${user.id}`,
        }, async (payload) => {
          console.log('🛒 Conta atualizada:', payload)
          
          if (payload.eventType === 'INSERT') {
            setContas(prev => [...prev, payload.new as any])
            // Nova conta pode gerar novas faturas
            await carregarDados(user.id)
          } else if (payload.eventType === 'UPDATE') {
            setContas(prev => prev.map(conta =>
              conta.id === (payload.new as any)?.id ? payload.new as any : conta
            ))
          } else if (payload.eventType === 'DELETE') {
            setContas(prev => prev.filter(conta => conta.id !== (payload.old as any)?.id))
            // Conta removida pode afetar faturas
            await carregarDados(user.id)
          }
          setLastUpdate(Date.now())
        }),

      // ✅ 4. Parcelas - status de pagamento das parcelas
      supabase
        .channel("parcelas-realtime-changes")
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "parcelas",
          filter: `user_id=eq.${user.id}`,
        }, (payload) => {
          console.log('📊 Parcela atualizada:', payload)
          
          if (payload.eventType === 'INSERT') {
            setParcelas(prev => [...prev, payload.new as any])
          } else if (payload.eventType === 'UPDATE') {
            setParcelas(prev => prev.map(parcela =>
              parcela.id === (payload.new as any)?.id ? payload.new as any : parcela
            ))
          } else if (payload.eventType === 'DELETE') {
            setParcelas(prev => prev.filter(parcela => parcela.id !== (payload.old as any)?.id))
          }
          setLastUpdate(Date.now())
        }),

      // ✅ 5. Compras recorrentes - ativação/desativação
      supabase
        .channel("compras-recorrentes-realtime-changes")
        .on("postgres_changes", {
          event: "*",
          schema: "public",
          table: "compras_recorrentes_cartao",
          filter: `user_id=eq.${user.id}`,
        }, async (payload) => {
          console.log('🔄 Compra recorrente atualizada:', payload)
          
          if (payload.eventType === 'INSERT') {
            setComprasRecorrentes(prev => [...prev, payload.new as any])
          } else if (payload.eventType === 'UPDATE') {
            setComprasRecorrentes(prev => prev.map(compra =>
              compra.id === (payload.new as any)?.id ? payload.new as any : compra
            ))
          } else if (payload.eventType === 'DELETE') {
            setComprasRecorrentes(prev => prev.filter(compra => compra.id !== (payload.old as any)?.id))
          }
          
          // Compras recorrentes podem afetar faturas futuras
          await carregarDados(user.id)
          setLastUpdate(Date.now())
        })
    ]

    // Subscrever a todos os canais
    subscriptions.forEach(subscription => subscription.subscribe())

    console.log('✅ Subscriptions ativas:', subscriptions.length)

    // Cleanup
    return () => {
      console.log('🧹 Removendo subscriptions...')
      subscriptions.forEach(subscription => supabase.removeChannel(subscription))
    }
  }, [user])

  // ⏰ ATUALIZAÇÃO AUTOMÁTICA PERIÓDICA - Para garantir que status das faturas sejam atualizados
  useEffect(() => {
    if (!user || !cartoes.length) return

    
    
    // Atualizar status a cada 5 minutos
    const intervalId = setInterval(async () => {
      
      try {
        await atualizarStatusFaturas(cartoes)
        setLastUpdate(Date.now())
        
      } catch (error) {
        
      }
    }, 5 * 60 * 1000) // 5 minutos

    return () => {
      console.log('🧹 Removendo timer de atualização automática...')
      clearInterval(intervalId)
    }
  }, [user, cartoes])

  // Cache para cálculos de status
  const statusCache = useMemo(() => new Map(), [])

  const [modalDetalhesOpen, setModalDetalhesOpen] = useState(false)
  const [faturaDetalhes, setFaturaDetalhes] = useState<any | null>(null)
  const [anoSelecionado, setAnoSelecionado] = useState(2025)
  const [mesSelecionadoDetalhes, setMesSelecionadoDetalhes] = useState(1)

  const [lancamentos, setLancamentos] = useState<any[]>([])
  const [loadingLancamentos, setLoadingLancamentos] = useState(false)

  // Estados para edição e remoção de lançamentos
  const [modalEditarOpen, setModalEditarOpen] = useState(false)
  const [modalRemoverOpen, setModalRemoverOpen] = useState(false)
  const [lancamentoSelecionado, setLancamentoSelecionado] = useState<any>(null)
  const [novoNome, setNovoNome] = useState("")
  const [novaCategoria, setNovaCategoria] = useState("")

  const mostrarToast = (type: "success" | "error", text: string) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3000)
  }

  // 🔄 REFRESH MANUAL - Para forçar atualização completa
  const refreshDados = async () => {
    if (!user) return
    
    console.log('🔄 Refresh manual iniciado...')
    setLoading(true)
    
    try {
      await carregarDados(user.id)
      setLastUpdate(Date.now())
      mostrarToast("success", "Dados atualizados com sucesso!")
    } catch (error) {
      console.error('❌ Erro no refresh manual:', error)
      mostrarToast("error", "Erro ao atualizar dados")
    } finally {
      setLoading(false)
    }
  }

  const faturasPorCartaoMemo = useMemo(() => {
    const faturasMap = new Map()
    
    faturas.forEach(fatura => {
      const dataVencimento = new Date(fatura.data_vencimento)
      const mesVencimento = dataVencimento.getMonth() + 1
      const anoVencimento = dataVencimento.getFullYear()
      const key = `${fatura.cartao_id}_${anoVencimento}-${mesVencimento.toString().padStart(2, '0')}`
      
      if (!faturasMap.has(key)) {
        faturasMap.set(key, [])
      }
      faturasMap.get(key).push(fatura)
    })
    
    return faturasMap
  }, [faturas])

  const faturasRelevantes = useMemo(() => {
    const faturasPorCartao = new Map()
    
    faturas.forEach(fatura => {
      if (!faturasPorCartao.has(fatura.cartao_id)) {
        faturasPorCartao.set(fatura.cartao_id, [])
      }
      faturasPorCartao.get(fatura.cartao_id).push(fatura)
    })

    const statusPriority = { 'fechada': 3, 'aberta': 2, 'prevista': 1, 'paga': 0 }
    const faturasExibir = []
    
    faturasPorCartao.forEach(faturasDoCartao => {
      const melhorFatura = faturasDoCartao
        .filter(f => f.status !== 'paga')
        .sort((a, b) => statusPriority[b.status] - statusPriority[a.status])[0]
      
      if (melhorFatura) {
        faturasExibir.push(melhorFatura)
      }
    })

    return faturasExibir
  }, [faturas])

  const comprasPorCartaoMemo = useMemo(() => {
    const comprasMap = new Map()
    
    const contasPorCartao = new Map()
    contas.forEach(conta => {
      if (!contasPorCartao.has(conta.cartao_id)) {
        contasPorCartao.set(conta.cartao_id, [])
      }
      contasPorCartao.get(conta.cartao_id).push(conta)
    })
    
    parcelas.forEach(parcela => {
      const conta = contas.find(c => c.id === parcela.conta_id)
      if (!conta) return
      
      const dataVencimento = new Date(parcela.data_vencimento)
      const mesVencimento = dataVencimento.getMonth() + 1
      const anoVencimento = dataVencimento.getFullYear()
      
      const key = `${conta.cartao_id}_${anoVencimento}-${mesVencimento.toString().padStart(2, '0')}`
      
      if (!comprasMap.has(key)) {
        comprasMap.set(key, [])
      }
      comprasMap.get(key).push(parcela)
    })
    
    return { comprasMap, contasPorCartao }
  }, [contas, parcelas])

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
    console.time('🚀 CARREGAMENTO-TOTAL')
    
    try {
      // ✅ FASE 1: Dados essenciais para mostrar interface (paralelo)
      console.time('📊 FASE-1-ESSENCIAL')
      const [cartoesResult, faturasResult] = await Promise.all([
        supabase
          .from("cartoes")
          .select("*")
          .eq("user_id", userId)
          .eq("ativo", true)
          .order("nome", { ascending: true }),
        (supabase as any)
          .from("faturas_cartao")
          .select("*")
          .eq("user_id", userId)
          .order("data_vencimento", { ascending: false })
      ])

      if (cartoesResult.error) {
        console.error("Erro ao carregar cartões:", cartoesResult.error)
        return
      }
      if (faturasResult.error) {
        console.error("Erro ao carregar faturas:", faturasResult.error)
        return
      }

      // Setar dados essenciais imediatamente
      if (cartoesResult.data) setCartoes(cartoesResult.data)
      if (faturasResult.data) setFaturas(faturasResult.data as any)
      
      setLoadingStates(prev => ({ ...prev, cartoes: false, faturas: false }))
      console.timeEnd('📊 FASE-1-ESSENCIAL')

      // ✅ FASE 2: Dados complementares (paralelo)
      console.time('📊 FASE-2-COMPLEMENTAR')
      const [categoriasResult, contasResult, comprasRecorrentesResult] = await Promise.all([
        supabase
          .from("categorias")
          .select("*")
          .eq("user_id", userId)
          .order("nome", { ascending: true }),
        supabase
          .from("contas")
          .select("*")
          .eq("user_id", userId)
          .eq("tipo_conta", "parcelada")
          .not("cartao_id", "is", null),
        (supabase as any)
          .from("compras_recorrentes_cartao")
          .select("*")
          .eq("user_id", userId)
          .eq("ativa", true)
      ])

      // Setar dados complementares
      if (categoriasResult.data) setCategorias(categoriasResult.data)
      if (contasResult.data) setContas(contasResult.data)
      if (comprasRecorrentesResult.data) setComprasRecorrentes(comprasRecorrentesResult.data as CompraRecorrente[])
      
      setLoadingStates(prev => ({ ...prev, contas: false }))
      console.timeEnd('📊 FASE-2-COMPLEMENTAR')

      // ✅ FASE 3: Parcelas (depende de contas)
      console.time('📊 FASE-3-PARCELAS')
      let parcelasData: any[] = []
      if (contasResult.data && contasResult.data.length > 0) {
        const { data: parcelasResult, error: parcelasError } = await (supabase as any)
          .from("parcelas")
          .select("*")
          .eq("user_id", userId)
          .in("conta_id", contasResult.data.map((c) => c.id))

        if (parcelasError) {
          console.error("Erro ao carregar parcelas:", parcelasError)
        } else if (parcelasResult) {
          parcelasData = parcelasResult
          setParcelas(parcelasResult)
        }
      }
      console.timeEnd('📊 FASE-3-PARCELAS')

      // ✅ FASE 4: Processamento pesado em background
      console.time('📊 FASE-4-PROCESSAMENTO')
      if (cartoesResult.data && contasResult.data && parcelasData) {
        await Promise.all([
          gerarFaturasAutomaticas(cartoesResult.data, contasResult.data, parcelasData, comprasRecorrentesResult.data || [])
        ])

        // Atualizar status precisa ser depois das faturas geradas
        await atualizarStatusFaturas(cartoesResult.data)
      }
      
      setLoadingStates(prev => ({ ...prev, processamento: false }))
      console.timeEnd('📊 FASE-4-PROCESSAMENTO')

    } catch (error) {
      console.error("❌ Erro ao carregar dados:", error)
    } finally {
      setLoading(false)
      console.timeEnd('🚀 CARREGAMENTO-TOTAL')
    }
  }

  const atualizarStatusFaturas = async (cartoes: any[]) => {
    if (!user) return
    
    console.time('⚡ BATCH-UPDATE-STATUS')
    console.log('📊 Iniciando atualização de status para', cartoes.length, 'cartões')
    
    const faturasParaAtualizar = []
    
    // Coleta todas as atualizações primeiro
    for (const cartao of cartoes) {
      if (!cartao.melhor_dia_compra) {
        console.log(`⚠️ Cartão ${cartao.nome} sem melhor_dia_compra configurado`)
        continue
      }

      const faturasDoCartao = faturas.filter(f => f.cartao_id === cartao.id)
      console.log(`📋 Cartão ${cartao.nome}: ${faturasDoCartao.length} faturas encontradas`)

      for (const fatura of faturasDoCartao) {
        if (fatura.status === "paga") continue

        const hoje = new Date()
        const dataVencimentoFatura = new Date(fatura.data_vencimento + "T03:00:00Z")
        
        const novoStatus = getStatusFaturaLocalCached(
          cartao.melhor_dia_compra,
          cartao.dia_vencimento,
          hoje,
          dataVencimentoFatura,
          fatura.valor_pago,
          fatura.valor_total,
        )

        console.log(`🔍 Fatura ${fatura.id} (${cartao.nome}):`, {
          statusAtual: fatura.status,
          novoStatus,
          dataVencimento: dataVencimentoFatura.toLocaleDateString(),
          melhorDia: cartao.melhor_dia_compra,
          diaVencimento: cartao.dia_vencimento,
          hoje: hoje.toLocaleDateString()
        })

        if (fatura.status !== novoStatus) {
          console.log(`🔄 Fatura ${fatura.id}: ${fatura.status} → ${novoStatus}`)
          faturasParaAtualizar.push({
            id: fatura.id,
            status: novoStatus,
            updated_at: new Date().toISOString()
          })
        }
      }
    }

    // Batch update - uma única operação
    if (faturasParaAtualizar.length > 0) {
      console.log(`🔄 Atualizando ${faturasParaAtualizar.length} faturas em batch:`, faturasParaAtualizar)
      const { error } = await (supabase as any)
        .from("faturas_cartao")
        .upsert(faturasParaAtualizar, { onConflict: 'id' })
      
      if (error) {
        console.error("❌ Erro no batch update:", error)
        console.timeEnd('⚡ BATCH-UPDATE-STATUS')
        return
      }
      
      console.log('✅ Batch update realizado com sucesso')
    } else {
      console.log('ℹ️ Nenhuma fatura precisou ser atualizada')
    }

    // Recarrega faturas apenas uma vez
    const { data: faturasAtualizadas, error: faturasError } = await (supabase as any)
      .from("faturas_cartao")
      .select("*")
      .eq("user_id", user.id)
      .order("data_vencimento", { ascending: false })

    if (faturasError) {
      console.error("❌ Erro ao recarregar faturas:", faturasError)
    } else if (faturasAtualizadas) {
      setFaturas(faturasAtualizadas)
      console.log(`✅ ${faturasAtualizadas.length} faturas recarregadas`)
    }
    
    console.timeEnd('⚡ BATCH-UPDATE-STATUS')
  }

  // Cache para otimizar cálculos de status
  const getStatusFaturaLocalCached = (
    melhorDiaCompra: number | undefined,
    diaVencimento: number,
    hoje: Date,
    dataVencimentoFatura: Date,
    valorPago: number,
    valorTotal: number,
  ): "aberta" | "fechada" | "paga" | "prevista" => {
    // Criar chave única para cache
    const cacheKey = `${melhorDiaCompra}_${diaVencimento}_${hoje.toDateString()}_${dataVencimentoFatura.toDateString()}_${valorPago}_${valorTotal}`
    
    // Verificar cache primeiro
    if (statusCache.has(cacheKey)) {
      return statusCache.get(cacheKey)
    }
    
    // Calcular apenas se não estiver em cache
    const status = getStatusFaturaLocal(melhorDiaCompra, diaVencimento, hoje, dataVencimentoFatura, valorPago, valorTotal)
    
    // Salvar no cache
    statusCache.set(cacheKey, status)
    
    return status
  }

  const gerarFaturasAutomaticas = async (cartoes: any[], contas: any[], parcelas: any[], comprasRecorrentes: CompraRecorrente[]) => {
    if (!user) return
    
    console.time('🚀 GERAR-FATURAS-BATCH')
    
    // 1. Buscar TODAS as faturas existentes de uma vez
    const { data: faturasExistentes, error: errorFaturas } = await (supabase as any)
      .from("faturas_cartao")
      .select("cartao_id, mes_referencia, id, valor_total, valor_pago")
      .eq("user_id", user.id)
    
    if (errorFaturas) {
      console.error("Erro ao buscar faturas existentes:", errorFaturas)
      console.timeEnd('🚀 GERAR-FATURAS-BATCH')
      return
    }

    // 2. Criar Set para busca O(1)
    const faturasExistentesSet = new Set(
      faturasExistentes?.map(f => `${f.cartao_id}_${f.mes_referencia}`) || []
    )
    
    const faturasExistentesMap = new Map(
      faturasExistentes?.map(f => [`${f.cartao_id}_${f.mes_referencia}`, f]) || []
    )

    // 3. Calcular TODAS as faturas que precisam ser criadas ou atualizadas
    const faturasParaCriar = []
    const faturasParaAtualizar = []
    
    for (const cartao of cartoes) {
      const contasDoCartao = contas.filter((c) => c.cartao_id === cartao.id)
      
      const parcelasDoCartao = parcelas.filter((p) => {
        const conta = contasDoCartao.find((c) => c.id === p.conta_id)
        return conta && p.status === "pendente"
      })

      const comprasRecorrentesDoCartao = comprasRecorrentes.filter((cr) => cr.cartao_id === cartao.id && cr.ativa)

      const parcelasPorMes = new Map<string, any[]>()
      const mesesComMovimentacao = new Set<string>()

      // Mapear parcelas por mês
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

      // Adicionar meses com compras recorrentes
      if (comprasRecorrentesDoCartao.length > 0) {
        const hoje = new Date()
        for (let i = 0; i < 6; i++) {
          const dataFutura = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1)
          const mes = dataFutura.getMonth() + 1
          const ano = dataFutura.getFullYear()
          const chave = `${ano}-${mes.toString().padStart(2, "0")}`
          mesesComMovimentacao.add(chave)
          
          if (!parcelasPorMes.has(chave)) {
            parcelasPorMes.set(chave, [])
          }
        }
      }

      // Processar cada mês
      for (const chave of mesesComMovimentacao) {
        const [ano, mes] = chave.split("-")
        const anoNum = Number.parseInt(ano)
        const mesNum = Number.parseInt(mes)
        const parcelasDoMes = parcelasPorMes.get(chave) || []

        // Calcular valores
        const valorParcelas = parcelasDoMes.reduce((total, p) => total + p.valor_parcela, 0)

        let valorComprasRecorrentes = 0
        comprasRecorrentesDoCartao.forEach((compra) => {
          const dataInicio = new Date(compra.data_inicio)
          const mesInicio = dataInicio.getMonth() + 1
          const anoInicio = dataInicio.getFullYear()
          
          const dataFim = compra.data_fim ? new Date(compra.data_fim) : null
          const mesFim = dataFim ? dataFim.getMonth() + 1 : null
          const anoFim = dataFim ? dataFim.getFullYear() : null
          
          const isDepoisInicio = (anoNum > anoInicio) || (anoNum === anoInicio && mesNum >= mesInicio)
          const isAntesFim = !dataFim || (anoNum < anoFim!) || (anoNum === anoFim! && mesNum <= mesFim!)
          
          if (isDepoisInicio && isAntesFim) {
            valorComprasRecorrentes += compra.valor
          }
        })

        const valorTotal = valorParcelas + valorComprasRecorrentes

        if (valorTotal > 0) {
          const mesReferenciaFormatada = `${anoNum}-${mesNum.toString().padStart(2, "0")}-01`
          const chaveFatura = `${cartao.id}_${mesReferenciaFormatada}`
          
          // Verificação O(1) em vez de query
          if (faturasExistentesSet.has(chaveFatura)) {
            // Fatura existe, verificar se precisa atualizar
            const faturaExistente = faturasExistentesMap.get(chaveFatura) as any
            if (faturaExistente && valorTotal !== faturaExistente.valor_total) {
              const novoValorRestante = valorTotal - faturaExistente.valor_pago
              faturasParaAtualizar.push({
                id: faturaExistente.id,
                valor_total: valorTotal,
                valor_restante: novoValorRestante,
                updated_at: new Date().toISOString()
              })
            }
          } else {
            // Fatura não existe, criar nova
            const dataReferenciaFatura = new Date(anoNum, mesNum - 1, 15)
            
            let dataVencimento: Date
            if (cartao.melhor_dia_compra) {
              dataVencimento = calcularVencimentoCompra(cartao.melhor_dia_compra, cartao.dia_vencimento, dataReferenciaFatura)
            } else {
              const mesVencimento = mesNum + 1
              const anoVencimento = mesVencimento > 12 ? anoNum + 1 : anoNum
              const mesVencimentoAjustado = mesVencimento > 12 ? 1 : mesVencimento
              dataVencimento = new Date(anoVencimento, mesVencimentoAjustado - 1, cartao.dia_vencimento)
            }

            const hoje = new Date()
            const statusInicial = getStatusFaturaLocalCached(
              cartao.melhor_dia_compra,
              cartao.dia_vencimento,
              hoje,
              dataVencimento,
              0,
              valorTotal
            )

            faturasParaCriar.push({
              cartao_id: cartao.id,
              user_id: user.id,
              mes_referencia: mesReferenciaFormatada,
              mes: mesNum,
              ano: anoNum,
              valor_total: valorTotal,
              valor_pago: 0,
              valor_restante: valorTotal,
              data_vencimento: dataVencimento.toISOString().slice(0, 10),
              status: statusInicial,
              created_at: new Date().toISOString()
            })
          }
        }
      }
    }

    // 4. Executar operações em batch
    const promises = []
    
    if (faturasParaCriar.length > 0) {
      console.log(`✅ Criando ${faturasParaCriar.length} faturas em batch`)
      promises.push(
        (supabase as any)
          .from("faturas_cartao")
          .insert(faturasParaCriar)
      )
    }
    
    if (faturasParaAtualizar.length > 0) {
      console.log(`🔄 Atualizando ${faturasParaAtualizar.length} faturas em batch`)
      promises.push(
        (supabase as any)
          .from("faturas_cartao")
          .upsert(faturasParaAtualizar, { onConflict: 'id' })
      )
    }
    
    if (promises.length > 0) {
      const results = await Promise.allSettled(promises)
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`Erro na operação batch ${index}:`, result.reason)
        }
      })
      
      // Recarregar faturas após criação/atualização
      const { data: novasFaturas } = await (supabase as any)
        .from("faturas_cartao")
        .select("*")
        .eq("user_id", user.id)
        .order("data_vencimento", { ascending: false })
      
      if (novasFaturas) {
        setFaturas(novasFaturas)
      }
    }
    
    console.timeEnd('🚀 GERAR-FATURAS-BATCH')
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

  const abrirModalEditar = (lancamento: any) => {
    console.log("Abrindo modal editar com lançamento:", lancamento)
    setLancamentoSelecionado(lancamento)
    setNovoNome(lancamento.titulo || lancamento.descricao || "")
    setNovaCategoria(lancamento.categoria_id || "")
    setModalEditarOpen(true)
  }

  const abrirModalRemover = (lancamento: any) => {
    setLancamentoSelecionado(lancamento)
    setModalRemoverOpen(true)
  }

  // ✅ Função para buscar dados frescos do banco após operações
  const getLancamentosDaFaturaFresh = async (cartaoId: string, ano: number, mes: number) => {
    if (!user) return []

    // Buscar dados frescos do banco
    const { data: contasFrescas, error: contasError } = await supabase
      .from("contas")
      .select("*")
      .eq("user_id", user.id)
      .eq("tipo_conta", "parcelada")
      .eq("cartao_id", cartaoId)

    if (contasError) {
      console.error("Erro ao buscar contas frescas:", contasError)
      return []
    }

    const { data: parcelasFrescas, error: parcelasError } = await (supabase as any)
      .from("parcelas")
      .select("*")
      .eq("user_id", user.id)
      .in("conta_id", contasFrescas?.map((c) => c.id) || [])

    if (parcelasError) {
      console.error("Erro ao buscar parcelas frescas:", parcelasError)
      return []
    }

    const { data: comprasRecorrentesFrescas, error: comprasError } = await (supabase as any)
      .from("compras_recorrentes_cartao")
      .select("*")
      .eq("user_id", user.id)
      .eq("cartao_id", cartaoId)
      .eq("ativa", true)

    if (comprasError) {
      console.error("Erro ao buscar compras recorrentes frescas:", comprasError)
      return []
    }

    // Processar lançamentos com dados frescos
    const lancamentos: any[] = []

    // Processar contas parceladas
    const parcelasDoMes = parcelasFrescas?.filter((parcela) => {
      const dataVencimento = new Date(parcela.data_vencimento)
      const mesVencimento = dataVencimento.getMonth() + 1
      const anoVencimento = dataVencimento.getFullYear()
      return mesVencimento === mes && anoVencimento === ano
    }) || []

    contasFrescas?.forEach((conta) => {
      const parcelasConta = parcelasDoMes.filter((p) => p.conta_id === conta.id)
      if (parcelasConta.length === 0) return

      const valorParcela = parcelasConta[0]?.valor_parcela || 0
      const numeroParcela = parcelasConta[0]?.numero_parcela || 1

      lancamentos.push({
        tipo: "compra",
        tipoCompra: "parcelada",
        descricao: `${conta.titulo} - Parcela ${numeroParcela} de ${conta.total_parcelas}`,
        titulo: conta.titulo,
        valor: parcelasConta.reduce((total, p) => total + p.valor_parcela, 0),
        data: conta.created_at || new Date().toISOString(),
        categoria_id: conta.categoria_id || null,
        conta_id: conta.id,
        parcela_id: parcelasConta[0]?.id,
        compra_recorrente_id: null,
      })
    })

    // Processar compras recorrentes
    comprasRecorrentesFrescas?.forEach((compra) => {
      const dataInicio = new Date(compra.data_inicio)
      const mesInicio = dataInicio.getMonth() + 1
      const anoInicio = dataInicio.getFullYear()
      
      const dataFim = compra.data_fim ? new Date(compra.data_fim) : null
      const mesFim = dataFim ? dataFim.getMonth() + 1 : null
      const anoFim = dataFim ? dataFim.getFullYear() : null
      
      const isDepoisInicio = (ano > anoInicio) || (ano === anoInicio && mes >= mesInicio)
      const isAntesFim = !dataFim || (ano < anoFim!) || (ano === anoFim! && mes <= mesFim!)
      
      if (isDepoisInicio && isAntesFim) {
        lancamentos.push({
          tipo: "compra",
          tipoCompra: "recorrente",
          descricao: `${compra.titulo} - Compra Recorrente`,
          titulo: compra.titulo,
          valor: compra.valor,
          data: compra.created_at || new Date().toISOString(),
          categoria_id: compra.categoria_id || null,
          conta_id: null,
          parcela_id: null,
          compra_recorrente_id: compra.id,
        })
      }
    })

    // Buscar pagamentos da fatura se existir
    const { data: faturasData, error: faturaError } = await (supabase as any)
      .from("faturas_cartao")
      .select("*")
      .eq("user_id", user.id)
      .eq("cartao_id", cartaoId)

    if (!faturaError && faturasData) {
      const faturaDoPeriodo = faturasData.find((fatura: any) => {
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

  const processarEdicao = async () => {
    if (!lancamentoSelecionado || !novoNome.trim()) {
      mostrarToast("error", "Nome é obrigatório")
      return
    }

    try {
      if (lancamentoSelecionado.tipoCompra === "parcelada" && lancamentoSelecionado.conta_id) {
        // Editar conta parcelada
        const { error } = await supabase
          .from("contas")
          .update({
            titulo: novoNome.trim(),
            categoria_id: novaCategoria || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", lancamentoSelecionado.conta_id)
          .eq("user_id", user!.id)

        if (error) {
          console.error("Erro ao editar conta:", error)
          mostrarToast("error", "Erro ao editar conta parcelada")
          return
        }
      } else if (lancamentoSelecionado.tipoCompra === "recorrente" && lancamentoSelecionado.compra_recorrente_id) {
        // Editar compra recorrente
        const { error } = await (supabase as any)
          .from("compras_recorrentes_cartao")
          .update({
            titulo: novoNome.trim(),
            categoria_id: novaCategoria || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", lancamentoSelecionado.compra_recorrente_id)
          .eq("user_id", user!.id)

        if (error) {
          console.error("Erro ao editar compra recorrente:", error)
          mostrarToast("error", "Erro ao editar compra recorrente")
          return
        }
      }

      // Recarregar dados
      await carregarDados(user!.id)
      
      // ✅ NOVO: Recarregar lançamentos do modal de detalhes se estiver aberto
      if (modalDetalhesOpen && faturaDetalhes) {
        // Aguardar um pequeno delay para garantir que os dados foram atualizados
        await new Promise(resolve => setTimeout(resolve, 100))
        const dadosAtualizados = await getLancamentosDaFaturaFresh(faturaDetalhes.cartao_id, anoSelecionado, mesSelecionadoDetalhes)
        setLancamentos(dadosAtualizados)
      }
      
      mostrarToast("success", "Lançamento editado com sucesso!")
      setModalEditarOpen(false)
      setLancamentoSelecionado(null)
      setNovoNome("")
      setNovaCategoria("")
    } catch (error) {
      console.error("Erro ao processar edição:", error)
      mostrarToast("error", "Erro inesperado ao editar lançamento")
    }
  }

  const processarRemocao = async () => {
    if (!lancamentoSelecionado) return

    try {
      if (lancamentoSelecionado.tipoCompra === "parcelada" && lancamentoSelecionado.conta_id) {
        // Buscar parcelas futuras e atual da conta
        const hoje = new Date()
        const { data: parcelasFuturas, error: errorParcelas } = await (supabase as any)
          .from("parcelas")
          .select("*")
          .eq("conta_id", lancamentoSelecionado.conta_id)
          .gte("data_vencimento", hoje.toISOString().split('T')[0])
          .eq("user_id", user!.id)

        if (errorParcelas) {
          console.error("Erro ao buscar parcelas:", errorParcelas)
          mostrarToast("error", "Erro ao buscar parcelas da conta")
          return
        }

        // Remover parcelas futuras
        if (parcelasFuturas && parcelasFuturas.length > 0) {
          const { error: errorRemoverParcelas } = await supabase
            .from("parcelas")
            .delete()
            .in("id", parcelasFuturas.map(p => p.id))

          if (errorRemoverParcelas) {
            console.error("Erro ao remover parcelas:", errorRemoverParcelas)
            mostrarToast("error", "Erro ao remover parcelas futuras")
            return
          }
        }

        // Remover a conta
        const { error: errorConta } = await supabase
          .from("contas")
          .delete()
          .eq("id", lancamentoSelecionado.conta_id)
          .eq("user_id", user!.id)

        if (errorConta) {
          console.error("Erro ao remover conta:", errorConta)
          mostrarToast("error", "Erro ao remover conta parcelada")
          return
        }

        mostrarToast("success", "Conta parcelada e parcelas futuras removidas com sucesso!")
      } else if (lancamentoSelecionado.tipoCompra === "recorrente" && lancamentoSelecionado.compra_recorrente_id) {
        // Remover compra recorrente
        const { error } = await (supabase as any)
          .from("compras_recorrentes_cartao")
          .delete()
          .eq("id", lancamentoSelecionado.compra_recorrente_id)
          .eq("user_id", user!.id)

        if (error) {
          console.error("Erro ao remover compra recorrente:", error)
          mostrarToast("error", "Erro ao remover compra recorrente")
          return
        }

        mostrarToast("success", "Compra recorrente removida com sucesso!")
      }

      // Recarregar dados
      await carregarDados(user!.id)
      
      // ✅ NOVO: Recarregar lançamentos do modal de detalhes se estiver aberto
      if (modalDetalhesOpen && faturaDetalhes) {
        // Aguardar um pequeno delay para garantir que os dados foram atualizados
        await new Promise(resolve => setTimeout(resolve, 100))
        const dadosAtualizados = await getLancamentosDaFaturaFresh(faturaDetalhes.cartao_id, anoSelecionado, mesSelecionadoDetalhes)
        setLancamentos(dadosAtualizados)
      }
      
      setModalRemoverOpen(false)
      setLancamentoSelecionado(null)
    } catch (error) {
      console.error("Erro ao processar remoção:", error)
      mostrarToast("error", "Erro inesperado ao remover lançamento")
    }
  }

  const getFaturasPorCartao = (cartaoId: string, ano: number, mes: number) => {
    const key = `${cartaoId}_${ano}-${mes.toString().padStart(2, '0')}`
    return faturasPorCartaoMemo.get(key) || []
  }

  const getComprasDaFatura = (cartaoId: string, ano: number, mes: number) => {
    const key = `${cartaoId}_${ano}-${mes.toString().padStart(2, '0')}`
    const parcelasDoMes = comprasPorCartaoMemo.comprasMap.get(key) || []
    const contasDoCartao = comprasPorCartaoMemo.contasPorCartao.get(cartaoId) || []
    
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
      id: compra.id, // Adicionar ID aqui
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
        tipoCompra: compra.tipo, // Adicionar tipo específico da compra
        descricao: descricao,
        titulo: compra.titulo, // Adicionar título original
        valor: compra.valor_parcelas,
        data: compra.data_criacao || new Date().toISOString(),
        categoria_id: compra.categoria_id || null,
        conta_id: compra.tipo === "parcelada" ? compra.parcelas[0]?.conta_id : null, // Para contas parceladas
        parcela_id: compra.tipo === "parcelada" ? compra.parcelas[0]?.id : null, // Para parcelas específicas
        compra_recorrente_id: compra.tipo === "recorrente" && 'id' in compra ? compra.id : null, // Para compras recorrentes
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
            console.error(" Erro ao atualizar parcela:", errorParcela)
          }
        }

        // Recarrega parcelas atualizadas
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
    // Se já foi totalmente paga
    if (valorPago >= valorTotal && valorTotal > 0) {
      return "paga"
    }

    // Se não tem melhor dia configurado, usar lógica simples baseada no vencimento
    if (!melhorDiaCompra) {
      if (hoje > dataVencimentoFatura) {
        return "fechada"
      }
      return "aberta"
    }

    // Usar a função getStatusFatura da biblioteca faturas.ts para consistência
    return getStatusFatura(
      melhorDiaCompra,
      diaVencimento,
      hoje,
      dataVencimentoFatura,
      valorPago,
      valorTotal
    )
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

  if (authLoading || loadingStates.cartoes || loadingStates.faturas) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">
            {authLoading ? 'Verificando autenticação...' : 
             loadingStates.cartoes ? 'Carregando cartões...' : 
             'Carregando faturas...'}
          </p>
          {!authLoading && (
            <div className="mt-4 text-sm text-gray-400">
              <div className="flex justify-center space-x-4">
                <span className={loadingStates.cartoes ? 'text-yellow-400' : 'text-green-400'}>
                  {loadingStates.cartoes ? '⏳' : '✅'} Cartões
                </span>
                <span className={loadingStates.faturas ? 'text-yellow-400' : 'text-green-400'}>
                  {loadingStates.faturas ? '⏳' : '✅'} Faturas
                </span>
                <span className={loadingStates.contas ? 'text-yellow-400' : 'text-green-400'}>
                  {loadingStates.contas ? '⏳' : '✅'} Contas
                </span>
                <span className={loadingStates.processamento ? 'text-yellow-400' : 'text-green-400'}>
                  {loadingStates.processamento ? '⏳' : '✅'} Processamento
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-3 sm:gap-6">
                <Button
                  variant="outline"
                  size="icon"
                  className="border-white/20 text-white bg-transparent transition-all duration-200
                    w-12 h-12 min-w-[48px] min-h-[48px] sm:w-12 sm:h-12
                    flex items-center justify-center
                    hover:bg-white/10
                    p-0"
                  onClick={() => navigate("/")}
                >
                  <ArrowLeft className="w-7 h-7 sm:w-5 sm:h-5" />
                </Button>
                <div>
                  <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight leading-tight">Controle de Faturas</h1>
                  <p className="text-base sm:text-lg text-blue-100">Gerencie pagamentos e juros dos cartões</p>
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
            <DialogDescription className="text-gray-400">
              Registre o pagamento total ou parcial da fatura selecionada
            </DialogDescription>
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
                        className={`h-6 px-2 text-[13px] font-semibold rounded w-auto min-w-0 leading-tight ${
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
                        <div className="grid grid-cols-12 gap-1">
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
                          className={`h-6 px-0 text-[13px] font-semibold rounded w-auto min-w-0 leading-tight ${
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
                    <div className="space-y-3 max-h-60 overflow-y-auto" style={{
                      scrollbarWidth: 'thin',
                      scrollbarColor: '#1e293b #0f172a'
                    }}>
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
                                  {lancamento.categoria_id && (
                                    <>
                                      {" • "}
                                      <span className="text-blue-300">
                                        Categoria: {categorias.find(cat => cat.id === lancamento.categoria_id)?.nome || "N/A"}
                                      </span>
                                    </>
                                  )}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <p
                                className={`font-semibold ${
                                  lancamento.tipo === "compra" 
                                    ? (lancamento.valor >= 0 ? "text-white" : "text-white")
                                    : "text-white"
                                }`}
                              >
                                {lancamento.valor.toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })}
                              </p>
                              {/* Botões de ação apenas para compras */}
                              {lancamento.tipo === "compra" && (
                                <div className="flex items-center space-x-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => abrirModalEditar(lancamento)}
                                    className="h-6 w-6 p-0 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 bg-transparent"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => abrirModalRemover(lancamento)}
                                    className="h-6 w-6 p-0 border-red-500/30 text-red-400 hover:bg-red-500/10 bg-transparent"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
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

      {/* Modal de Edição de Lançamento */}
      <Dialog open={modalEditarOpen} onOpenChange={setModalEditarOpen}>
        <DialogContent className="bg-slate-900/95 border-slate-700 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="text-white text-xl flex items-center">
              <Edit2 className="w-5 h-5 mr-2 text-blue-400" />
              Editar Lançamento
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Altere o nome e categoria do lançamento selecionado
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {lancamentoSelecionado && (
              <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-2">Editando:</p>
                <p className="text-white font-medium">{lancamentoSelecionado.descricao}</p>
                <p className="text-xs text-gray-500 mt-1">Tipo: {lancamentoSelecionado.tipoCompra}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="novoNome" className="text-white font-medium">
                Nome/Título
              </Label>
              <Input
                id="novoNome"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Digite o novo nome"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="novaCategoria" className="text-white font-medium">
                Categoria (Opcional)
              </Label>
              <Select 
                value={novaCategoria || "sem-categoria"} 
                onValueChange={(value) => setNovaCategoria(value === "sem-categoria" ? "" : value)}
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="sem-categoria" className="text-gray-300 hover:bg-slate-700 focus:bg-slate-700">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-gray-500" />
                      <span>Sem categoria</span>
                    </div>
                  </SelectItem>
                  {categorias.map((categoria) => (
                    <SelectItem 
                      key={categoria.id} 
                      value={categoria.id}
                      className="text-white hover:bg-slate-700 focus:bg-slate-700"
                    >
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: categoria.cor || "#6b7280" }}
                        />
                        <span>{categoria.nome}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={processarEdicao}
                className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Salvar Alterações
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setModalEditarOpen(false)
                  setLancamentoSelecionado(null)
                  setNovoNome("")
                  setNovaCategoria("")
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

      {/* Modal de Confirmação de Remoção */}
      <Dialog open={modalRemoverOpen} onOpenChange={setModalRemoverOpen}>
        <DialogContent className="bg-slate-900/95 border-slate-700 backdrop-blur-sm">
          <DialogHeader>
            <DialogTitle className="text-white text-xl flex items-center">
              <Trash2 className="w-5 h-5 mr-2 text-red-400" />
              Confirmar Remoção
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Esta ação não pode ser desfeita. Confirme se deseja remover o lançamento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {lancamentoSelecionado && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <p className="text-red-300 font-medium mb-2">⚠️ Atenção!</p>
                <p className="text-white text-sm mb-2">
                  Você está prestes a remover: <strong>{lancamentoSelecionado.descricao}</strong>
                </p>
                {lancamentoSelecionado.tipoCompra === "parcelada" && (
                  <p className="text-red-300 text-sm">
                    <strong>Esta ação irá remover:</strong><br />
                    • A conta parcelada<br />
                    • Todas as parcelas futuras e atual<br />
                    • As parcelas passadas ficarão no histórico
                  </p>
                )}
                {lancamentoSelecionado.tipoCompra === "recorrente" && (
                  <p className="text-red-300 text-sm">
                    <strong>Esta ação irá remover permanentemente a compra recorrente.</strong>
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                onClick={processarRemocao}
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Confirmar Remoção
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setModalRemoverOpen(false)
                  setLancamentoSelecionado(null)
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
    </div>
  )
}

export default Faturas
