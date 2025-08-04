"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../integrations/supabase/client"
import type { User } from "@supabase/supabase-js"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { calcularVencimentoCompra, calcularCicloAtual, estaNoCiclo } from "../lib/ciclos-cartao"
import {
  ArrowLeft,
  CreditCard,
  Receipt,
  Save,
  Plus,
  X,
  Calendar,
  DollarSign,
  Hash,
  FileText,
  Tag,
  AlertCircle,
  RotateCcw,
  Info,
} from "lucide-react"

interface Cartao {
  id: string
  nome: string
  limite_credito: number | null
  dia_vencimento: number | null
  melhor_dia_compra?: number | null
  taxa_juros_rotativo: number | null
  ativo: boolean | null
  created_at: string
  updated_at: string
  user_id: string
}

const NovaContaParcelada: React.FC = () => {
  const [tipoParcelamento, setTipoParcelamento] = useState<"cartao" | "carne">("cartao")
  const [titulo, setTitulo] = useState("")
  const [valorTotal, setValorTotal] = useState("")
  const [numParcelas, setNumParcelas] = useState(1)
  const [parcelaInicial, setParcelaInicial] = useState(1)
  const [dataPrimeiraParcela, setDataPrimeiraParcela] = useState("")
  const [cartaoId, setCartaoId] = useState<string | null>(null)
  const [categoriaId, setCategoriaId] = useState<string | null>(null)
  const [descricao, setDescricao] = useState("")
  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const navigate = useNavigate()

  const [dadosRecarregados, setDadosRecarregados] = useState(false)
  
  // Estados para compra recorrente
  const [isRecorrente, setIsRecorrente] = useState(false)
  const [diaCobranca, setDiaCobranca] = useState(1)
  const [dataFimRecorrente, setDataFimRecorrente] = useState("")

  useEffect(() => {
    async function carregarDados() {
      const { data: cartoesData } = await supabase.from("cartoes").select("*").eq("ativo", true)
      setCartoes(cartoesData || [])

      const { data: categoriasData } = await supabase.from("categorias").select("*")
      setCategorias(categoriasData || [])
    }
    carregarDados()
  }, [])

  async function recarregarDados() {
    const { data: cartoesData } = await supabase.from("cartoes").select("*").eq("ativo", true)
    setCartoes(cartoesData || [])
    setDadosRecarregados(true)
  }

  const mostrarToast = (type: "success" | "error", text: string) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3000)
  }

  async function gerarFaturasParaTodosCartoes(userId: string, parcelaInicialNovaConta = 1) {
    try {
      const { data: cartoes } = await supabase.from("cartoes").select("*").eq("user_id", userId).eq("ativo", true)

      if (!cartoes || cartoes.length === 0) {
        return
      }

      const { data: contas } = await supabase
        .from("contas")
        .select("*")
        .eq("user_id", userId)
        .eq("tipo_conta", "parcelada")
        .not("cartao_id", "is", null)

      const { data: parcelas } = await supabase
        .from("parcelas")
        .select("*")
        .in("conta_id", contas?.map((c) => c.id) || [])

      for (const cartao of cartoes) {
        const contasDoCartao = contas?.filter((c) => c.cartao_id === cartao.id) || []
        const mesesComParcelas = new Set<string>()

        parcelas?.forEach((p) => {
          const conta = contasDoCartao.find((c) => c.id === p.conta_id)
          if (conta) {
            const dataVencimentoParcela = new Date(p.data_vencimento)
            const mesFatura = dataVencimentoParcela.getMonth() + 1
            const anoFatura = dataVencimentoParcela.getFullYear()
            const chaveMes = `${anoFatura}-${mesFatura.toString().padStart(2, "0")}`
            mesesComParcelas.add(chaveMes)
          }
        })

        for (const chaveMes of mesesComParcelas) {
          const [anoFatura, mesFaturaStr] = chaveMes.split("-")
          const mesFatura = Number.parseInt(mesFaturaStr)
          const anoFaturaNum = Number.parseInt(anoFatura)

          const { data: faturaExistente, error: faturaError } = await supabase
            .from("faturas_cartao")
            .select("*")
            .eq("cartao_id", cartao.id)
            .eq("mes_referencia", `${anoFaturaNum}-${mesFatura.toString().padStart(2, "0")}-01`)
            .maybeSingle()

          // Se houver erro na consulta (exceto "não encontrado"), pular
          if (faturaError && faturaError.code !== 'PGRST116') {
            console.error("Erro ao verificar fatura existente:", faturaError)
            continue
          }

          const parcelasDoCartao =
            parcelas?.filter((p) => {
              const conta = contasDoCartao.find((c) => c.id === p.conta_id)
              if (!conta) return false

              const dataVencimentoParcela = new Date(p.data_vencimento)
              const mesParcela = dataVencimentoParcela.getMonth() + 1
              const anoParcela = dataVencimentoParcela.getFullYear()

              return mesParcela === mesFatura && anoParcela === anoFaturaNum
            }) || []

          const valorTotal = parcelasDoCartao.reduce((total, p) => total + p.valor_parcela, 0)

          if (valorTotal > 0) {
            if (!faturaExistente) {
              const dataVencimento = new Date(anoFaturaNum, mesFatura - 1, cartao.dia_vencimento || 1)

              const hoje = new Date()
              const statusFatura = determinarStatusFatura(
                mesFatura,
                anoFaturaNum,
                cartao,
                hoje,
                parcelaInicialNovaConta,
              )

              const { error: insertError } = await supabase.from("faturas_cartao").insert({
                cartao_id: cartao.id,
                mes_referencia: `${anoFaturaNum}-${mesFatura.toString().padStart(2, "0")}-01`,
                valor_total: valorTotal,
                valor_pago: 0,
                valor_rotativo: 0,
                data_vencimento: dataVencimento.toISOString().slice(0, 10),
                status: statusFatura,
                user_id: userId,
              })

              if (insertError) {
                console.error("🚨 NOVA_CONTA_PARCELADA - Erro ao inserir fatura:", insertError)
                // Se for erro de duplicação, ignorar silenciosamente
                if (insertError.code !== '23505') {
                  throw insertError
                }
              }
            } else {
              await supabase
                .from("faturas_cartao")
                .update({
                  valor_total: valorTotal,
                  valor_restante: valorTotal,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", faturaExistente.id)
            }
          }
        }
      }
    } catch (error) {
      console.error("Erro na geração de faturas:", error)
    }
  }

  function determinarStatusFatura(
    mesFatura: number,
    anoFatura: number,
    cartao: any,
    hoje = new Date(),
    parcelaInicial = 1,
  ): "aberta" | "prevista" | "fechada" | "paga" {
    if (!cartao.melhor_dia_compra) {
      return "aberta"
    }

    // Se for uma conta parcelada já em andamento (parcela inicial > 1), 
    // marcar faturas passadas como "paga"
    if (parcelaInicial > 1) {
      const dataVencimentoFatura = new Date(anoFatura, mesFatura - 1, cartao.dia_vencimento || 1)
      
      if (dataVencimentoFatura < hoje) {
        return "paga"
      }
    }

    // USAR A MESMA LÓGICA DO FATURAS.TSX:
    // Simular uma compra no meio do mês da fatura para descobrir seu ciclo correto
    const melhorDia = cartao.melhor_dia_compra
    const diaVencimento = cartao.dia_vencimento || 1
    
    // Simular uma compra no dia 15 do mês da fatura
    const compraSimulada = new Date(anoFatura, mesFatura - 1, 15)
    
    // Calcular quando essa compra venceria
    const vencimentoCalculado = calcularVencimentoCompra(
      melhorDia,
      diaVencimento,
      compraSimulada
    )
    
    // Data de vencimento real da fatura
    const vencimentoRealFatura = new Date(anoFatura, mesFatura - 1, diaVencimento)
    
    // Se o vencimento calculado não bate com o real, tentar um mês anterior
    let dataCompraCorreta = compraSimulada
    if (vencimentoCalculado.getTime() !== vencimentoRealFatura.getTime()) {
      // Tentar mês anterior
      const compraAnterior = new Date(anoFatura, mesFatura - 2, 15)
      const vencimentoAnterior = calcularVencimentoCompra(
        melhorDia,
        diaVencimento,
        compraAnterior
      )
      
      if (vencimentoAnterior.getTime() === vencimentoRealFatura.getTime()) {
        dataCompraCorreta = compraAnterior
      }
    }
    
    // Agora calcular o ciclo baseado na compra correta
    const cicloFatura = calcularCicloAtual(melhorDia, dataCompraCorreta)
    
    // Comparar onde estamos em relação ao ciclo da fatura
    // Normalizar as datas para ignorar horários
    const hojeSemHorario = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
    const inicioSemHorario = new Date(cicloFatura.inicio.getFullYear(), cicloFatura.inicio.getMonth(), cicloFatura.inicio.getDate())
    const fimSemHorario = new Date(cicloFatura.fim.getFullYear(), cicloFatura.fim.getMonth(), cicloFatura.fim.getDate())
    
    if (hojeSemHorario < inicioSemHorario) {
      return "prevista"
    }
    
    if (hojeSemHorario >= inicioSemHorario && hojeSemHorario <= fimSemHorario) {
      return "aberta"
    }
    
    return "fechada"
  }

  function calcularProximaFatura(cartao: any) {
    if (!cartao || !cartao.dia_vencimento) {
      return ""
    }

    const dataVencimento = calcularVencimentoCompra(
      cartao.melhor_dia_compra || cartao.dia_vencimento,
      cartao.dia_vencimento,
      new Date(),
    )

    return dataVencimento.toISOString().slice(0, 10)
  }

  useEffect(() => {
    if (tipoParcelamento === "cartao" && cartaoId) {
      const cartaoSelecionado = cartoes.find((c) => c.id === cartaoId)
      if (cartaoSelecionado) {
        const proximaFatura = calcularProximaFatura(cartaoSelecionado)
        setDataPrimeiraParcela(proximaFatura)
      }
    }
  }, [cartaoId, tipoParcelamento, cartoes, parcelaInicial, dadosRecarregados])

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
      } else {
        navigate("/auth")
      }
    }

    checkAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
      } else {
        navigate("/auth")
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  function limparFormulario() {
    setTitulo("")
    setValorTotal("")
    setNumParcelas(1)
    setParcelaInicial(1)
    setDataPrimeiraParcela("")
    setCartaoId(null)
    setCategoriaId(null)
    setDescricao("")
    setErro(null)
    setDadosRecarregados(false)
    setIsRecorrente(false)
    setDiaCobranca(1)
  }

  async function criarCompraRecorrente() {
    try {
      if (!user || !cartaoId) {
        throw new Error("Usuário ou cartão não selecionado")
      }

      const compraRecorrentePayload = {
        user_id: user.id,
        cartao_id: cartaoId,
        titulo: titulo,
        valor: Number.parseFloat(valorTotal),
        dia_cobranca: diaCobranca,
        categoria_id: categoriaId,
        descricao: descricao,
        ativa: true,
        data_inicio: new Date().toISOString().slice(0, 10),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { error } = await (supabase as any)
        .from("compras_recorrentes_cartao")
        .insert([compraRecorrentePayload])

      if (error) {
        throw new Error("Erro ao criar compra recorrente: " + error.message)
      }

      return true
    } catch (error) {
      console.error("Erro ao criar compra recorrente:", error)
      throw error
    }
  }

  async function handleSalvar(e: React.FormEvent) {
    await handleSubmit(e, { redirecionar: true })
  }

  async function handleSalvarENovo(e: React.FormEvent) {
    await handleSubmit(e, { redirecionar: false })
  }

  async function handleSubmit(e: React.FormEvent, opcoes?: { redirecionar: boolean }) {
    e.preventDefault()
    setErro(null)
    setLoading(true)

    try {
      if (!titulo || !valorTotal) {
        setErro("Preencha todos os campos obrigatórios.")
        setLoading(false)
        return
      }

      if (!isRecorrente && (!numParcelas || !dataPrimeiraParcela)) {
        setErro("Preencha todos os campos obrigatórios.")
        setLoading(false)
        return
      }

      if (tipoParcelamento === "cartao" && !cartaoId) {
        setErro("Selecione um cartão de crédito.")
        setLoading(false)
        return
      }

      if (!user) {
        setErro("Usuário não autenticado.")
        setLoading(false)
        return
      }

      // Se for compra recorrente, usar lógica diferente
      if (isRecorrente) {
        if (tipoParcelamento !== "cartao" || !cartaoId) {
          setErro("Compras recorrentes só são permitidas no cartão de crédito.")
          setLoading(false)
          return
        }

        await criarCompraRecorrente()
        
        if (opcoes && opcoes.redirecionar === false) {
          limparFormulario()
          mostrarToast("success", "Compra recorrente criada com sucesso!")
        } else {
          mostrarToast("success", "Compra recorrente criada com sucesso!")
          setTimeout(() => navigate("/"), 1000)
        }
        setLoading(false)
        return
      }

      if (parcelaInicial > numParcelas) {
        setErro("A parcela inicial não pode ser maior que o número total de parcelas.")
        setLoading(false)
        return
      }

      if (parcelaInicial < 1) {
        setErro("A parcela inicial deve ser pelo menos 1.")
        setLoading(false)
        return
      }

      const contaPayload = {
        titulo,
        valor_total: Number.parseFloat(valorTotal),
        categoria_id: categoriaId,
        cartao_id: tipoParcelamento === "cartao" ? cartaoId : null,
        tipo_conta: "parcelada",
        total_parcelas: numParcelas,
        data_primeira_parcela: dataPrimeiraParcela,
        descricao,
        user_id: user.id,
      }

      const { data: contaData, error: contaError } = await supabase
        .from("contas")
        .insert([contaPayload])
        .select()
        .single()

      if (contaError || !contaData) {
        setErro("Erro ao criar conta: " + (contaError?.message || ""))
        setLoading(false)
        return
      }

      const dataReferencia = new Date(dataPrimeiraParcela)

      const parcelas = []
      const valorParcela = Math.round((Number.parseFloat(valorTotal) / numParcelas) * 100) / 100

      for (let i = 0; i < numParcelas; i++) {
        const numeroParcela = i + 1
        const diff = numeroParcela - parcelaInicial

        const dataParcela = new Date(dataReferencia)
        dataParcela.setMonth(dataParcela.getMonth() + diff)

        parcelas.push({
          conta_id: contaData.id,
          categoria_id: categoriaId,
          numero_parcela: numeroParcela,
          valor_parcela: valorParcela,
          data_vencimento: dataParcela.toISOString().slice(0, 10),
          status: "pendente",
          user_id: user.id, // ✅ Adicionar user_id para segurança
        })
      }

      const { error: parcelasError } = await supabase.from("parcelas").insert(parcelas)
      if (parcelasError) {
        setErro("Erro ao criar parcelas: " + parcelasError.message)
        setLoading(false)
        return
      }

      try {
        await gerarFaturasParaTodosCartoes(user.id, parcelaInicial)
      } catch (error) {
        console.error("Erro ao gerar faturas automaticamente:", error)
      }

      await recarregarDados()

      if (opcoes && opcoes.redirecionar === false) {
        limparFormulario()
        mostrarToast("success", "Conta parcelada criada com sucesso!")
      } else {
        mostrarToast("success", "Conta parcelada criada com sucesso!")
        setTimeout(() => navigate("/"), 1000)
      }
    } catch (err: any) {
      setErro("Erro inesperado: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const valorParcela = valorTotal && numParcelas > 0 ? (Number.parseFloat(valorTotal) / numParcelas).toFixed(2) : "0.00"

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
        <div className="relative px-6 py-6">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-8">
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
                  <h1 className="text-4xl font-bold text-white tracking-tight drop-shadow-lg">Nova Despesa no Crédito</h1>
                  <p className="text-xl text-blue-100 drop-shadow-md">Cadastre uma nova compra no crédito ou carnê</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 pb-8 mt-8">
        {/* Card Principal */}
        <Card className="bg-white/10 border-white/10 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl font-semibold text-white flex items-center">
              {tipoParcelamento === "cartao" ? (
                <>
                  <CreditCard className="w-6 h-6 mr-3 text-blue-400" />
                  Cartão de Crédito
                </>
              ) : (
                <>
                  <Receipt className="w-6 h-6 mr-3 text-orange-400" />
                  Carnê ou Boleto
                </>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Switch de Tipo de Parcelamento */}
            <div className="flex items-center justify-center space-x-6 p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center space-x-3">
                <CreditCard className="w-5 h-5 text-blue-400" />
                <Label className="text-white font-medium">Cartão de Crédito</Label>
                <Switch
                  checked={tipoParcelamento === "cartao"}
                  onCheckedChange={() => setTipoParcelamento("cartao")}
                  className="data-[state=checked]:bg-blue-500"
                />
              </div>
              <div className="w-px h-8 bg-white/20"></div>
              <div className="flex items-center space-x-3">
                <Receipt className="w-5 h-5 text-orange-400" />
                <Label className="text-white font-medium">Carnê/Boleto</Label>
                <Switch
                  checked={tipoParcelamento === "carne"}
                  onCheckedChange={() => setTipoParcelamento("carne")}
                  className="data-[state=checked]:bg-orange-500"
                />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Informações Básicas */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-blue-400" />
                  Informações Básicas
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Campo Título */}
                  <div className="space-y-2">
                    <Label htmlFor="titulo" className="text-white font-medium">
                      Título da Compra *
                    </Label>
                    <Input
                      id="titulo"
                      value={titulo}
                      onChange={(e) => setTitulo(e.target.value)}
                      placeholder="Ex: Notebook Dell, Sofá da Sala..."
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                      required
                    />
                  </div>

                  {/* Campo Valor Total */}
                  <div className="space-y-2">
                    <Label htmlFor="valorTotal" className="text-white font-medium">
                      Valor Total *
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="valorTotal"
                        type="number"
                        step="0.01"
                        min="0"
                        value={valorTotal}
                        onChange={(e) => setValorTotal(e.target.value)}
                        placeholder="0,00"
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 pl-10"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Opção de Compra Recorrente */}
                {tipoParcelamento === "cartao" && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                      <Switch
                        checked={isRecorrente}
                        onCheckedChange={setIsRecorrente}
                        className="data-[state=checked]:bg-purple-500"
                      />
                      <div className="flex items-center space-x-2">
                        <RotateCcw className="w-5 h-5 text-purple-400" />
                        <Label className="text-white font-medium">Compra Recorrente Mensal</Label>
                      </div>
                      <div className="ml-auto">
                        <Info className="w-4 h-4 text-purple-400" />
                      </div>
                    </div>
                    
                    {isRecorrente && (
                      <div className="space-y-4 p-4 bg-purple-500/5 border border-purple-500/10 rounded-lg">
                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                          <p className="text-purple-300 text-sm">
                            <Info className="w-4 h-4 inline mr-1" />
                            Compras recorrentes são cobradas automaticamente todo mês no mesmo dia e valor.
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="diaCobranca" className="text-white font-medium">
                            Dia da Cobrança Mensal *
                          </Label>
                          <Input
                            id="diaCobranca"
                            type="number"
                            min="1"
                            max="31"
                            value={diaCobranca}
                            onChange={(e) => setDiaCobranca(Number(e.target.value))}
                            className="bg-white/10 border-white/20 text-white"
                            required
                          />
                          <p className="text-sm text-purple-300">
                            A cobrança será feita todo dia {diaCobranca} do mês
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Campo Número de Parcelas */}
                  {!isRecorrente && (
                    <div className="space-y-2">
                      <Label htmlFor="numParcelas" className="text-white font-medium">
                        Total de Parcelas *
                      </Label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          id="numParcelas"
                          type="number"
                          min="1"
                          value={numParcelas}
                          onChange={(e) => setNumParcelas(Number(e.target.value))}
                          className="bg-white/10 border-white/20 text-white pl-10"
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Campo Parcela Inicial */}
                  {!isRecorrente && (
                    <div className="space-y-2">
                      <Label htmlFor="parcelaInicial" className="text-white font-medium">
                        Começar da Parcela *
                      </Label>
                      <Input
                        id="parcelaInicial"
                        type="number"
                        min="1"
                        max={numParcelas}
                        value={parcelaInicial}
                        onChange={(e) => setParcelaInicial(Number(e.target.value))}
                        className="bg-white/10 border-white/20 text-white"
                        required
                      />
                    </div>
                  )}

                  {/* Valor da Parcela (calculado) */}
                  {!isRecorrente && (
                    <div className="space-y-2">
                      <Label className="text-white font-medium">Valor da Parcela</Label>
                      <div className="bg-white/5 border border-white/10 rounded-md px-3 py-2 text-white font-semibold">
                        R$ {valorParcela.replace(".", ",")}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <p className="text-blue-300 text-sm">
                    <AlertCircle className="w-4 h-4 inline mr-1" />
                    Para despesas já em andamento, informe a parcela atual. Ex: se é a 4ª de 12 parcelas, coloque 4.
                  </p>
                </div>
              </div>

              {/* Seleção de Cartão (condicional) */}
              {tipoParcelamento === "cartao" && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <CreditCard className="w-5 h-5 mr-2 text-blue-400" />
                    Cartão de Crédito
                  </h3>

                  <div className="space-y-2">
                    <Label htmlFor="cartao" className="text-white font-medium">
                      Selecione o Cartão *
                    </Label>
                    <Select value={cartaoId || ""} onValueChange={setCartaoId}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Selecione um cartão..." />
                      </SelectTrigger>
                      <SelectContent>
                        {cartoes.map((cartao) => (
                          <SelectItem key={cartao.id} value={cartao.id}>
                            <div className="flex items-center space-x-2">
                              <CreditCard className="w-4 h-4" />
                              <span>{cartao.nome}</span>
                              {cartao.limite_credito && (
                                <Badge variant="secondary" className="text-xs">
                                  Limite: R$ {cartao.limite_credito.toLocaleString("pt-BR")}
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Data da Primeira Parcela */}
              {!isRecorrente && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-green-400" />
                    Data de Vencimento
                  </h3>

                  <div className="space-y-2">
                    <Label htmlFor="dataPrimeiraParcela" className="text-white font-medium">
                      Data da 1ª Parcela *
                    </Label>
                    <Input
                      id="dataPrimeiraParcela"
                      type="date"
                      value={dataPrimeiraParcela}
                      onChange={(e) => setDataPrimeiraParcela(e.target.value)}
                      className="bg-white/10 border-white/20 text-white"
                      required
                    />
                    {tipoParcelamento === "cartao" && cartaoId && (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                        <p className="text-green-300 text-sm">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          Data calculada automaticamente baseada no ciclo do cartão selecionado.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Informações Adicionais */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <Tag className="w-5 h-5 mr-2 text-purple-400" />
                  Informações Adicionais
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Seleção de Categoria */}
                  <div className="space-y-2">
                    <Label htmlFor="categoria" className="text-white font-medium">
                      Categoria
                    </Label>
                    <Select value={categoriaId || ""} onValueChange={setCategoriaId}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Sem categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categorias.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <div className="flex items-center space-x-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: cat.cor || "#6b7280" }}
                              ></div>
                              <span>{cat.nome}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Campo Descrição */}
                  <div className="space-y-2">
                    <Label htmlFor="descricao" className="text-white font-medium">
                      Descrição
                    </Label>
                    <Input
                      id="descricao"
                      value={descricao}
                      onChange={(e) => setDescricao(e.target.value)}
                      placeholder="Observações sobre a compra..."
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    />
                  </div>
                </div>
              </div>

              {/* Mensagem de Erro */}
              {erro && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <p className="text-red-300 font-medium">{erro}</p>
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="flex flex-col space-y-3 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button
                    type="submit"
                    onClick={handleSalvar}
                    disabled={loading}
                    className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? "Salvando..." : "Salvar"}
                  </Button>

                  <Button
                    type="button"
                    onClick={handleSalvarENovo}
                    disabled={loading}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {loading ? "Salvando..." : "Salvar e Novo"}
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/")}
                  className="border-white/20 text-white hover:bg-white/10 bg-transparent"
                >
                  <X className="w-4 h-4 mr-2" />
                  Voltar para o Dashboard
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default NovaContaParcelada
