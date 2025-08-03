"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { supabase } from "@/integrations/supabase/client"
import type { User } from "@supabase/supabase-js"
import { useAuthSession } from "../hooks/useAuthSession"
import {
  CreditCard,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  Power,
  PowerOff,
  Calendar,
  Tag,
  TrendingUp,
  Save,
  X,
  AlertTriangle,
  Info,
} from "lucide-react"
import { getStatusFatura, getVencimentoFatura } from "../lib/faturas"

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

interface FormData {
  nome: string
  limite_credito: string
  dia_vencimento: string
  melhor_dia_compra: string
  taxa_juros_rotativo: string
}

interface Categoria {
  id: string
  nome: string
  cor: string
  created_at: string
  user_id: string
}

const Cartoes = () => {
  const { user, loading: authLoading } = useAuthSession()
  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [contasParceladas, setContasParceladas] = useState<any[]>([])
  const [parcelas, setParcelas] = useState<any[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCartao, setEditingCartao] = useState<Cartao | null>(null)
  const [confirmacaoExclusao, setConfirmacaoExclusao] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>({
    nome: "",
    limite_credito: "",
    dia_vencimento: "",
    melhor_dia_compra: "",
    taxa_juros_rotativo: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      carregarCartoes(user.id)
    }
  }, [user])

  const calcularLimiteDisponivel = (cartao: Cartao) => {
    const limiteCartao = cartao.limite_credito || 0
    const contasDoCartao = contasParceladas.filter((conta) => conta.cartao_id === cartao.id)

    let limiteUsado = 0

    contasDoCartao.forEach((conta) => {
      const parcelasDaConta = parcelas.filter((parcela) => parcela.conta_id === conta.id)
      const parcelasPendentes = parcelasDaConta.filter((parcela) => parcela.status === "pendente")
      const valorPendente = parcelasPendentes.reduce((total, parcela) => total + parcela.valor_parcela, 0)
      limiteUsado += valorPendente
    })

    return limiteCartao - limiteUsado
  }

  const carregarDadosParaLimite = async (userId: string) => {
    try {
      const { data: contasData } = await supabase
        .from("contas")
        .select("*")
        .eq("user_id", userId)
        .eq("tipo_conta", "parcelada")
        .not("cartao_id", "is", null)

      if (contasData) {
        setContasParceladas(contasData)

        const contaIds = contasData.map((conta) => conta.id)
        if (contaIds.length > 0) {
          const { data: parcelasData } = await supabase.from("parcelas").select("*").in("conta_id", contaIds)

          if (parcelasData) {
            setParcelas(parcelasData)
          }
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados para cálculo de limite:", error)
    }
  }

  const carregarCartoes = async (userId: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("cartoes")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Erro ao carregar cartões:", error)
        return
      }

      setCartoes(data || [])
      await carregarDadosParaLimite(userId)
      await carregarCategorias(userId)
    } catch (error) {
      console.error("Erro ao carregar cartões:", error)
    } finally {
      setLoading(false)
    }
  }

  const carregarCategorias = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("categorias")
        .select("*")
        .eq("user_id", userId)
        .order("nome", { ascending: true })

      if (error) {
        console.error("Erro ao carregar categorias:", error)
        return
      }
      if (data) {
        setCategorias(data)
      }
    } catch (error) {
      console.error("Erro ao carregar categorias:", error)
    }
  }

  const abrirModal = (cartao?: Cartao) => {
    if (cartao) {
      setEditingCartao(cartao)
      setFormData({
        nome: cartao.nome,
        limite_credito: cartao.limite_credito?.toString() || "",
        dia_vencimento: cartao.dia_vencimento?.toString() || "",
        melhor_dia_compra: cartao.melhor_dia_compra?.toString() || "",
        taxa_juros_rotativo: cartao.taxa_juros_rotativo?.toString() || "",
      })
    } else {
      setEditingCartao(null)
      setFormData({
        nome: "",
        limite_credito: "",
        dia_vencimento: "",
        melhor_dia_compra: "",
        taxa_juros_rotativo: "",
      })
    }
    setModalOpen(true)
  }

  const mostrarToast = (type: "success" | "error", text: string) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3000)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nome.trim()) {
      mostrarToast("error", "Nome do cartão é obrigatório")
      return
    }

    setSubmitting(true)
    try {
      const cartaoData = {
        nome: formData.nome.trim(),
        limite_credito: formData.limite_credito ? Number.parseFloat(formData.limite_credito) : null,
        dia_vencimento: formData.dia_vencimento ? Number.parseInt(formData.dia_vencimento) : null,
        melhor_dia_compra: formData.melhor_dia_compra ? Number.parseInt(formData.melhor_dia_compra) : null,
        taxa_juros_rotativo: formData.taxa_juros_rotativo ? Number.parseFloat(formData.taxa_juros_rotativo) : 0,
        ativo: true,
        user_id: user!.id,
      }

      if (editingCartao) {
        const { data, error } = await supabase.from("cartoes").update(cartaoData).eq("id", editingCartao.id).eq("user_id", user!.id).select()

        if (error) throw error
        mostrarToast("success", "Cartão atualizado com sucesso!")
      } else {
        const { data, error } = await supabase.from("cartoes").insert([cartaoData]).select()

        if (error) throw error
        mostrarToast("success", "Cartão criado com sucesso!")
      }

      setModalOpen(false)
      if (user) await carregarCartoes(user.id)
    } catch (error) {
      console.error("Erro ao salvar cartão:", error)
      mostrarToast("error", `Erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleAtivo = async (cartao: Cartao) => {
    try {
      const { error } = await supabase.from("cartoes").update({ ativo: !cartao.ativo }).eq("id", cartao.id).eq("user_id", user!.id)

      if (error) throw error
      mostrarToast("success", `Cartão ${cartao.ativo ? "desativado" : "ativado"} com sucesso!`) 
      if (user) await carregarCartoes(user.id)
    } catch (error) {
      console.error("Erro ao alterar status:", error)
      mostrarToast("error", "Não foi possível alterar o status do cartão")
    }
  }

  const excluirCartao = async (cartao: Cartao) => {
    try {
      const { error } = await supabase.from("cartoes").delete().eq("id", cartao.id).eq("user_id", user!.id)

      if (error) throw error
      mostrarToast("success", "Cartão excluído com sucesso!")
      if (user) await carregarCartoes(user.id)
    } catch (error) {
      console.error("Erro ao excluir cartão:", error)
      mostrarToast("error", "Não foi possível excluir o cartão")
    }
    setConfirmacaoExclusao(null)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }).format(date)
  }

  const getDiasAteVencimento = (data: Date) => {
    const hoje = new Date()
    const diff = data.getTime() - hoje.getTime()
    return Math.ceil(diff / (1000 * 3600 * 24))
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Carregando cartões...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const cartoesAtivos = cartoes.filter((c) => c.ativo)
  const totalLimite = cartoesAtivos.reduce((total, cartao) => total + (cartao.limite_credito || 0), 0)
  const totalLimiteDisponivel = cartoes.reduce((total, cartao) => {
    return total + calcularLimiteDisponivel(cartao)
  }, 0)
  const totalLimiteOriginal = cartoes.reduce((total, cartao) => {
    return total + (cartao.limite_credito || 0)
  }, 0)
  const totalLimiteUsado = totalLimiteOriginal - totalLimiteDisponivel

  const calcularProximoVencimento = () => {
    if (cartoesAtivos.length === 0) return null
    const hoje = new Date()
    const mesAtual = hoje.getMonth()
    const anoAtual = hoje.getFullYear()
    const diaAtual = hoje.getDate()

    let proximoVencimento = null
    let cartaoProximo = null
    let valorFatura = 0
    let faturaFechada = false

    cartoesAtivos.forEach((cartao) => {
      const melhorDiaCompra = cartao.melhor_dia_compra || cartao.dia_vencimento
      const dataVencimento = getVencimentoFatura(
        melhorDiaCompra,
        cartao.dia_vencimento,
        new Date(anoAtual, mesAtual, diaAtual),
      )

      if (!proximoVencimento || dataVencimento < proximoVencimento) {
        proximoVencimento = dataVencimento
        cartaoProximo = cartao

        faturaFechada =
          getStatusFatura(melhorDiaCompra, cartao.dia_vencimento, new Date(), dataVencimento, 0, 0) === "fechada"

        valorFatura = parcelas
          .filter((p) => p.status === "pendente")
          .filter((p) => {
            const conta = contasParceladas.find((c) => c.id === p.conta_id)
            return conta && conta.cartao_id === cartao.id
          })
          .reduce((total, p) => total + (p.valor || 0), 0)
      }
    })

    return {
      cartao: cartaoProximo,
      data: proximoVencimento,
      valor: valorFatura,
      fechada: faturaFechada,
    }
  }

  const calcularCategoriasMaisUsadas = () => {
    const categoriasCount: { [key: string]: number } = {}

    contasParceladas.forEach((conta) => {
      if (conta.categoria_id) {
        const categoria = categorias.find((c) => c.id === conta.categoria_id)
        if (categoria) {
          categoriasCount[categoria.nome] = (categoriasCount[categoria.nome] || 0) + 1
        }
      }
    })

    return Object.entries(categoriasCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([nome, count]) => ({ nome, count }))
  }

  const calcularCartaoMaisUsado = () => {
    if (cartoesAtivos.length === 0) return null
    const cartoesCount: { [key: string]: number } = {}

    contasParceladas.forEach((conta) => {
      if (conta.cartao_id) {
        cartoesCount[conta.cartao_id] = (cartoesCount[conta.cartao_id] || 0) + 1
      }
    })

    const cartaoMaisUsado = Object.entries(cartoesCount).sort(([, a], [, b]) => b - a)[0]

    if (cartaoMaisUsado) {
      return cartoes.find((c) => c.id === cartaoMaisUsado[0])
    }
    return null
  }

  const proximoVencimento = calcularProximoVencimento()
  const categoriasMaisUsadas = calcularCategoriasMaisUsadas()
  const cartaoMaisUsado = calcularCartaoMaisUsado()

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
                  <h1 className="text-4xl font-bold text-white tracking-tight drop-shadow-lg">Cartões de Crédito</h1>
                  <p className="text-xl text-blue-100 drop-shadow-md">Gerencie seus cartões e limites</p>
                </div>
              </div>
              <Button
                onClick={() => abrirModal()}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                size="lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Novo Cartão
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 pb-8">
        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8 mb-8">
          {/* Total de Cartões */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:shadow-xl hover:scale-105 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-purple-400" />
                </div>
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                  {cartoesAtivos.length} ativos
                </Badge>
              </div>
              <h3 className="text-purple-200 text-sm font-medium mb-1">Total de Cartões</h3>
              <p className="text-2xl font-bold text-white">{cartoes.length}</p>
              <p className="text-purple-300 text-xs mt-1">{cartoesAtivos.length} ativos</p>
            </CardContent>
          </Card>

          {/* Próximo Vencimento */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:shadow-xl hover:scale-105 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-orange-400" />
                </div>
                <Badge
                  variant="secondary"
                  className={`${
                    proximoVencimento?.fechada
                      ? "bg-red-500/20 text-red-300 border-red-500/30"
                      : "bg-green-500/20 text-green-300 border-green-500/30"
                  }`}
                >
                  {proximoVencimento?.fechada ? "Fechada" : "Aberta"}
                </Badge>
              </div>
              <h3 className="text-orange-200 text-sm font-medium mb-1">Próximo Vencimento</h3>
              {proximoVencimento ? (
                <>
                  <p className="text-lg font-bold text-white truncate">{proximoVencimento.cartao?.nome}</p>
                  <p className="text-orange-300 text-sm">
                    {proximoVencimento.data?.toLocaleDateString("pt-BR")} • {formatCurrency(proximoVencimento.valor)}
                  </p>
                </>
              ) : (
                <p className="text-white">Nenhum vencimento</p>
              )}
            </CardContent>
          </Card>

          {/* Categorias Mais Usadas */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:shadow-xl hover:scale-105 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <Tag className="w-6 h-6 text-emerald-400" />
                </div>
                <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                  Top 3
                </Badge>
              </div>
              <h3 className="text-emerald-200 text-sm font-medium mb-2">Categorias Mais Usadas</h3>
              {categoriasMaisUsadas.length > 0 ? (
                <div className="space-y-1">
                  {categoriasMaisUsadas.slice(0, 3).map((categoria, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-white truncate">{categoria.nome}</span>
                      <span className="text-emerald-300">{categoria.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-emerald-300 text-sm">Nenhuma</p>
              )}
            </CardContent>
          </Card>

          {/* Cartão Mais Usado */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:shadow-xl hover:scale-105 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-400" />
                </div>
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                  {cartaoMaisUsado && cartaoMaisUsado.limite_credito > 0
                    ? Math.round(
                        ((cartaoMaisUsado.limite_credito - calcularLimiteDisponivel(cartaoMaisUsado)) /
                          cartaoMaisUsado.limite_credito) *
                          100,
                      )
                    : 0}
                  %
                </Badge>
              </div>
              <h3 className="text-blue-200 text-sm font-medium mb-1">Cartão Mais Usado</h3>
              {cartaoMaisUsado ? (
                <> 
                  <p className="text-lg font-bold text-white truncate">{cartaoMaisUsado.nome}</p>
                  <p className="text-blue-300 text-sm">Mais contas parceladas</p>
                </>
              ) : (
                <p className="text-white">Nenhum cartão</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lista de Cartões */}
        {cartoes.length === 0 ? (
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <div className="w-24 h-24 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CreditCard className="w-12 h-12 text-purple-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-2">Nenhum cartão cadastrado</h3>
              <p className="text-gray-400 mb-6">
                Comece adicionando seu primeiro cartão de crédito para organizar suas finanças
              </p>
              <Button
                onClick={() => abrirModal()}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                size="lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Adicionar Primeiro Cartão
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cartoes.map((cartao) => {
              const limiteDisponivel = calcularLimiteDisponivel(cartao)
              const limiteUsado = (cartao.limite_credito || 0) - limiteDisponivel
              const percentualUsado = cartao.limite_credito > 0 ? (limiteUsado / cartao.limite_credito) * 100 : 0

              return (
                <Card
                  key={cartao.id}
                  className={`bg-white/5 border-white/10 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:scale-105 ${
                    cartao.ativo
                      ? "hover:border-blue-400/30"
                      : "hover:border-gray-400/30"
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle
                        className={`text-lg font-semibold truncate ${cartao.ativo ? "text-white" : "text-gray-400"}`}
                      >
                        {cartao.nome}
                      </CardTitle>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={cartao.ativo}
                          onCheckedChange={() => toggleAtivo(cartao)}
                          className="data-[state=checked]:bg-blue-500"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Limite */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className={cartao.ativo ? "text-gray-300" : "text-gray-500"}>Limite Disponível</span>
                        <span className={`font-semibold ${cartao.ativo ? "text-emerald-400" : "text-gray-500"}`}>
                          {formatCurrency(limiteDisponivel)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            percentualUsado > 80
                              ? "bg-red-500"
                              : percentualUsado > 60
                                ? "bg-yellow-500"
                                : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(percentualUsado, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className={cartao.ativo ? "text-gray-400" : "text-gray-600"}>
                          Usado: {formatCurrency(limiteUsado)}
                        </span>
                        <span className={cartao.ativo ? "text-gray-400" : "text-gray-600"}>
                          Total: {formatCurrency(cartao.limite_credito || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Informações */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className={cartao.ativo ? "text-gray-400" : "text-gray-600"}>Vencimento</p>
                        <p className={`font-semibold ${cartao.ativo ? "text-white" : "text-gray-500"}`}>
                          Dia {cartao.dia_vencimento || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className={cartao.ativo ? "text-gray-400" : "text-gray-600"}>Melhor Dia</p>
                        <p className={`font-semibold ${cartao.ativo ? "text-white" : "text-gray-500"}`}>
                          Dia {cartao.melhor_dia_compra || "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className={cartao.ativo ? "text-gray-400" : "text-gray-600"}>Taxa Juros</p>
                        <p className={`font-semibold ${cartao.ativo ? "text-white" : "text-gray-500"}`}>
                          {(cartao.taxa_juros_rotativo || 0).toFixed(2)}% a.m.
                        </p>
                      </div>
                      <div>
                        <p className={cartao.ativo ? "text-gray-400" : "text-gray-600"}>Uso</p>
                        <p className={`font-semibold ${cartao.ativo ? "text-white" : "text-gray-500"}`}>
                          {percentualUsado.toFixed(0)}%
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <Badge
                        variant="secondary"
                        className={`${
                          cartao.ativo
                            ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                            : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                        }`}
                      >
                        {cartao.ativo ? (
                          <>
                            <Power className="w-3 h-3 mr-1" />
                            Ativo
                          </>
                        ) : (
                          <>
                            <PowerOff className="w-3 h-3 mr-1" />
                            Inativo
                          </>
                        )}
                      </Badge>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => abrirModal(cartao)}
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 transition-all duration-200"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setConfirmacaoExclusao(cartao.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all duration-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de Formulário */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-slate-900/95 border-slate-700 backdrop-blur-sm max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">{editingCartao ? "Editar Cartão" : "Novo Cartão"}</DialogTitle>
            <DialogDescription className="text-gray-300">
              Preencha as informações do cartão de crédito
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-white">
                Nome do cartão *
              </Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Nubank Roxinho, Inter Gold..."
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="limite" className="text-white">
                Limite de crédito
              </Label>
              <Input
                id="limite"
                type="number"
                step="0.01"
                min="0"
                value={formData.limite_credito}
                onChange={(e) => setFormData({ ...formData, limite_credito: e.target.value })}
                placeholder="0,00"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="diaVencimento" className="text-white">
                  Dia do vencimento
                </Label>
                <Input
                  id="diaVencimento"
                  type="number"
                  min="1"
                  max="31"
                  value={formData.dia_vencimento}
                  onChange={(e) => setFormData({ ...formData, dia_vencimento: e.target.value })}
                  placeholder="15"
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="melhorDia" className="text-white flex items-center">
                  Melhor dia
                  <Info className="w-3 h-3 ml-1 text-gray-400" />
                </Label>
                <Input
                  id="melhorDia"
                  type="number"
                  min="1"
                  max="31"
                  value={formData.melhor_dia_compra}
                  onChange={(e) => setFormData({ ...formData, melhor_dia_compra: e.target.value })}
                  placeholder="20"
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxaJuros" className="text-white">
                Taxa de juros rotativo (% a.m.)
              </Label>
              <Input
                id="taxaJuros"
                type="number"
                step="0.01"
                min="0"
                value={formData.taxa_juros_rotativo}
                onChange={(e) => setFormData({ ...formData, taxa_juros_rotativo: e.target.value })}
                placeholder="12,50"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-blue-300 text-xs">
                <Info className="w-3 h-3 inline mr-1" />O melhor dia é quando você deve fazer compras para ter mais
                tempo até o vencimento da fatura.
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="border-white/20 text-white hover:bg-white/10 bg-transparent"
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {submitting ? "Salvando..." : editingCartao ? "Atualizar" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!confirmacaoExclusao} onOpenChange={() => setConfirmacaoExclusao(null)}>
        <AlertDialogContent className="bg-slate-900/95 border-slate-700 backdrop-blur-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Tem certeza que deseja excluir este cartão? Esta ação não pode ser desfeita e todas as informações
              relacionadas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmacaoExclusao && excluirCartao(cartoes.find(c => c.id === confirmacaoExclusao)!)}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default Cartoes