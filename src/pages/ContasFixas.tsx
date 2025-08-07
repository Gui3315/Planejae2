"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  Home,
  Plus,
  ArrowLeft,
  DollarSign,
  Calendar,
  Edit,
  Trash2,
  Zap,
  Droplets,
  Flame,
  Save,
  X,
  AlertTriangle,
  Clock,
  CreditCard,
} from "lucide-react"

interface ContaFixa {
  id: string
  titulo: string
  valor_total: number
  categoria_id: string | null
  cartao_id: string | null
  tipo_conta: string
  total_parcelas: number
  data_primeira_parcela: string
  recorrente_ate: string | null
  descricao: string | null
  created_at: string
  updated_at: string
  user_id: string
}

interface Categoria {
  id: string
  nome: string
  cor: string
  created_at: string
  user_id: string
}

const ContasFixas = () => {
  const { user, loading: authLoading } = useAuthSession()
  const [contasFixas, setContasFixas] = useState<ContaFixa[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [parcelas, setParcelas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingConta, setEditingConta] = useState<ContaFixa | null>(null)
  const [confirmacaoExclusao, setConfirmacaoExclusao] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    titulo: "",
    valor_total: "",
    categoria_id: "",
    descricao: "",
    varia_mensalmente: false,
    dia_vencimento: "10",
    dia_lembrete: "5",
  })
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      carregarContasFixas(user.id)
      carregarCategorias(user.id)
    }
  }, [user])

  const carregarContasFixas = async (userId: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("contas")
        .select("*")
        .eq("user_id", userId)
        .or("tipo_conta.eq.recorrente,tipo_conta.eq.parcelada")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Erro ao carregar contas fixas e carnês:", error)
        return
      }

      const contasFixas = data?.filter((conta) => conta.tipo_conta === "recorrente") || []
      const carnes = data?.filter((conta) => conta.tipo_conta === "parcelada" && !conta.cartao_id) || []

      setContasFixas([...contasFixas, ...carnes])

      if (carnes.length > 0) {
        const contaIds = carnes.map((c) => c.id)
        const { data: parcelasData } = await supabase.from("parcelas").select("*").in("conta_id", contaIds)

        if (parcelasData) {
          setParcelas(parcelasData)
        }
      }
    } catch (error) {
      console.error("Erro ao carregar contas fixas e carnês:", error)
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

      setCategorias(data || [])
    } catch (error) {
      console.error("Erro ao carregar categorias:", error)
    }
  }

  const mostrarToast = (type: "success" | "error", text: string) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3000)
  }

  const abrirModal = (conta?: ContaFixa) => {
    if (conta) {
      const diaVencimento = conta.descricao?.match(/VENCIMENTO_(\d+)/)?.[1] || "10"
      const diaLembrete = conta.descricao?.match(/LEMBRETE_(\d+)/)?.[1] || "5"

      setEditingConta(conta)
      // Remover metadados da descrição visível
      let descricaoVisivel = conta.descricao || ""
      descricaoVisivel = descricaoVisivel.replace(/\s*VARIA_MENSAL\s+LEMBRETE_\d+/g, "")
      descricaoVisivel = descricaoVisivel.replace(/\s*VENCIMENTO_\d+/g, "")
      descricaoVisivel = descricaoVisivel.trim()

      setFormData({
        titulo: conta.titulo,
        valor_total: conta.valor_total.toString(),
        categoria_id: conta.categoria_id || "",
        descricao: descricaoVisivel,
        varia_mensalmente: conta.descricao?.includes("VARIA_MENSAL") || false,
        dia_vencimento: diaVencimento,
        dia_lembrete: diaLembrete,
      })
    } else {
      setEditingConta(null)
      setFormData({
        titulo: "",
        valor_total: "",
        categoria_id: "",
        descricao: "",
        varia_mensalmente: false,
        dia_vencimento: "10",
        dia_lembrete: "5",
      })
    }
    setModalOpen(true)
  }

  const getIconForConta = (titulo: string) => {
    const lowerTitulo = titulo.toLowerCase()
    if (lowerTitulo.includes("luz") || lowerTitulo.includes("energia"))
      return <Zap className="w-4 h-4 text-yellow-400" />
    if (lowerTitulo.includes("água") || lowerTitulo.includes("agua"))
      return <Droplets className="w-4 h-4 text-blue-400" />
    if (lowerTitulo.includes("gás") || lowerTitulo.includes("gas")) return <Flame className="w-4 h-4 text-orange-400" />
    return <Home className="w-4 h-4 text-purple-400" />
  }

  const isContaVariavel = (conta: ContaFixa) => {
    return conta.descricao?.includes("VARIA_MENSAL") || false
  }

  const getDiaLembrete = (conta: ContaFixa) => {
    const match = conta.descricao?.match(/LEMBRETE_(\d+)/)
    return match ? Number.parseInt(match[1]) : null
  }

  const getDiaVencimento = (conta: ContaFixa) => {
    const match = conta.descricao?.match(/VENCIMENTO_(\d+)/)
    return match ? Number.parseInt(match[1]) : null
  }

  const getCategoriaConta = (categoriaId: string | null) => {
    if (!categoriaId) return null
    return categorias.find(cat => cat.id === categoriaId) || null
  }

  const isLembreteProximo = (conta: ContaFixa) => {
    const diaLembrete = getDiaLembrete(conta)
    if (!diaLembrete) return false

    const hoje = new Date().getDate()
    const proximoLembrete = new Date(new Date().getFullYear(), new Date().getMonth(), diaLembrete)

    if (hoje > diaLembrete) {
      proximoLembrete.setMonth(proximoLembrete.getMonth() + 1)
    }

    const diffDias = Math.ceil((proximoLembrete.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    return diffDias <= 3
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.titulo.trim()) {
      mostrarToast("error", "Título da conta é obrigatório")
      return
    }
    if (!formData.valor_total || Number.parseFloat(formData.valor_total) <= 0) {
      mostrarToast("error", "Valor deve ser maior que zero")
      return
    }

    setSubmitting(true)
    try {
      let descricao = formData.descricao.trim()

      descricao = descricao.replace(/\s*VARIA_MENSAL\s+LEMBRETE_\d+/g, "")
      descricao = descricao.replace(/\s*VENCIMENTO_\d+/g, "")
      descricao = descricao.trim()

      if (formData.varia_mensalmente) {
        descricao += ` VARIA_MENSAL LEMBRETE_${formData.dia_lembrete}`
      }
      if (formData.dia_vencimento) {
        descricao += ` VENCIMENTO_${formData.dia_vencimento}`
      }

      const contaData = {
        titulo: formData.titulo.trim(),
        valor_total: Number.parseFloat(formData.valor_total),
        categoria_id: formData.categoria_id || null,
        cartao_id: null,
        tipo_conta: "recorrente",
        total_parcelas: 1,
        data_primeira_parcela: new Date().toISOString().split("T")[0],
        recorrente_ate: null,
        descricao: descricao || null,
        user_id: user!.id,
      }

      if (editingConta) {
        const { data, error } = await supabase.from("contas").update(contaData).eq("id", editingConta.id).select()

        if (error) throw error
        mostrarToast("success", "Conta fixa atualizada com sucesso!")
      } else {
        const { data, error } = await supabase.from("contas").insert([contaData]).select()

        if (error) throw error
        mostrarToast("success", "Conta fixa criada com sucesso!")
      }

      setModalOpen(false)
      setFormData({
        titulo: "",
        valor_total: "",
        categoria_id: "",
        descricao: "",
        varia_mensalmente: false,
        dia_vencimento: "10",
        dia_lembrete: "5",
      })

      if (user) await carregarContasFixas(user.id)
    } catch (error) {
      console.error("Erro ao salvar conta fixa:", error)
      mostrarToast("error", `Erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
    } finally {
      setSubmitting(false)
    }
  }

  const excluirConta = async (contaId: string) => {
    try {
      const { error } = await supabase.from("contas").delete().eq("id", contaId)

      if (error) throw error
      mostrarToast("success", "Conta fixa excluída com sucesso!")
      if (user) await carregarContasFixas(user.id)
    } catch (error) {
      console.error("Erro ao excluir conta:", error)
      mostrarToast("error", "Não foi possível excluir a conta")
    }
    setConfirmacaoExclusao(null)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Carregando despesas fixas...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const totalMensal = contasFixas.reduce((total, conta) => {
    if (conta.tipo_conta === "parcelada") {
      const parcelasDoMes = parcelas.filter((p) => {
        if (p.conta_id !== conta.id) return false
        const dataVencimento = new Date(p.data_vencimento)
        const mesAtual = new Date().getMonth()
        const anoAtual = new Date().getFullYear()
        return dataVencimento.getMonth() === mesAtual && dataVencimento.getFullYear() === anoAtual
      })
      return total + parcelasDoMes.reduce((sum, p) => sum + p.valor_parcela, 0)
    } else {
      return total + conta.valor_total
    }
  }, 0)

  const contasVariaveis = contasFixas.filter(isContaVariavel)

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
                  <h1 className="text-4xl font-bold text-white tracking-tight drop-shadow-lg">
                    Gerenciar Despesas Fixas
                  </h1>
                  <p className="text-xl text-blue-100 drop-shadow-md">Gerencie suas despesas recorrentes com cartões de crédito e carnês</p>
                </div>
              </div>
              <Button
                onClick={() => abrirModal()}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                size="lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Nova Despesa Fixa
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 pb-8">
        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 mb-8">
          {/* Total de Contas */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:shadow-xl hover:scale-105 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <Home className="w-6 h-6 text-purple-400" />
                </div>
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                  {contasVariaveis.length} variáveis
                </Badge>
              </div>
              <h3 className="text-purple-200 text-sm font-medium mb-1">Total de Despesas</h3>
              <p className="text-2xl font-bold text-white">{contasFixas.length}</p>
              <p className="text-purple-300 text-xs mt-1">{contasVariaveis.length} variáveis</p>
            </CardContent>
          </Card>

          {/* Total Mensal */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:shadow-xl hover:scale-105 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-emerald-400" />
                </div>
                <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                  Mensal
                </Badge>
              </div>
              <h3 className="text-emerald-200 text-sm font-medium mb-1">Total Mensal</h3>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalMensal)}</p>
              <p className="text-emerald-300 text-xs mt-1">Despesas fixas + parcelas do mês</p>
            </CardContent>
          </Card>

          {/* Contas Variáveis */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:shadow-xl hover:scale-105 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-orange-400" />
                </div>
                <Badge variant="secondary" className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                  Atenção
                </Badge>
              </div>
              <h3 className="text-orange-200 text-sm font-medium mb-1">Despesas Variáveis</h3>
              <p className="text-2xl font-bold text-white">{contasVariaveis.length}</p>
              <p className="text-orange-300 text-xs mt-1">Precisam atualização</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Contas Fixas */}
        {contasFixas.length === 0 ? (
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <div className="w-24 h-24 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Home className="w-12 h-12 text-purple-400" />
              </div>
              <h3 className="text-2xl font-semibold text-white mb-2">Nenhuma despesa fixa ou carnê cadastrado</h3>
              <p className="text-gray-400 mb-6">Comece adicionando suas despesas recorrentes ou carnês</p>
              <Button
                onClick={() => abrirModal()}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                size="lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                Adicionar Primeira Despesa
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contasFixas.map((conta) => (
              <Card
                key={conta.id}
                className="bg-white/10 border-blue-500/20 backdrop-blur-sm hover:shadow-xl hover:scale-105 transition-all duration-300 hover:border-blue-400/30"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                        {getIconForConta(conta.titulo)}
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold text-white">{conta.titulo}</CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge
                            variant="secondary"
                            className={`text-xs ${
                              conta.tipo_conta === "parcelada"
                                ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                                : isContaVariavel(conta)
                                  ? "bg-orange-500/20 text-orange-300 border-orange-500/30"
                                  : "bg-green-500/20 text-green-300 border-green-500/30"
                            }`}
                          >
                            {conta.tipo_conta === "parcelada" ? (
                              <>
                                <CreditCard className="w-3 h-3 mr-1" />
                                Carnê
                              </>
                            ) : isContaVariavel(conta) ? (
                              <>
                                <Clock className="w-3 h-3 mr-1" />
                                Variável
                              </>
                            ) : (
                              <>
                                <Home className="w-3 h-3 mr-1" />
                                Fixa
                              </>
                            )}
                          </Badge>
                          {getCategoriaConta(conta.categoria_id) && (
                            <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                              <div
                                className="w-2 h-2 rounded-full mr-1"
                                style={{ backgroundColor: getCategoriaConta(conta.categoria_id)!.cor }}
                              ></div>
                              {getCategoriaConta(conta.categoria_id)!.nome}
                            </Badge>
                          )}
                          {isLembreteProximo(conta) && (
                            <Badge variant="secondary" className="bg-red-500/20 text-red-300 border-red-500/30 text-xs">
                              Lembrete!
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => abrirModal(conta)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 transition-all duration-200"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmacaoExclusao(conta.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all duration-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-300">
                      {conta.tipo_conta === "parcelada" ? "Valor Total:" : "Valor:"}
                    </span>
                    <span className="font-semibold text-white">{formatCurrency(conta.valor_total)}</span>
                  </div>

                  {/* Informações específicas dos carnês */}
                  {conta.tipo_conta === "parcelada" && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-purple-300">Parcelas:</span>
                        <span className="text-sm text-purple-300">{conta.total_parcelas}x</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-emerald-300">Valor da Parcela:</span>
                        <span className="text-sm text-emerald-300">
                          {formatCurrency(conta.valor_total / conta.total_parcelas)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-orange-300">Primeira Parcela:</span>
                        <span className="text-sm text-orange-300">
                          {new Date(conta.data_primeira_parcela).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </>
                  )}

                  {/* Informações de contas variáveis */}
                  {isContaVariavel(conta) && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-orange-300">Vencimento:</span>
                        <span className="text-sm text-orange-300">{getDiaVencimento(conta)}º do mês</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-blue-300">Lembrete:</span>
                        <span className="text-sm text-blue-300">{getDiaLembrete(conta)}º do mês</span>
                      </div>
                    </>
                  )}

                  {/* Descrição */}
                  {/* Exibir vencimento formatado se houver VENCIMENTO no campo descricao */}
                  {conta.descricao && conta.descricao.match(/VENCIMENTO_(\d+)/) && (
                    <div className="flex justify-between items-center pt-2 border-t border-white/10">
                      <span className="text-sm text-orange-300">Vencimento:</span>
                      <span className="text-sm text-orange-300">{conta.descricao.match(/VENCIMENTO_(\d+)/)[1]}º do mês</span>
                    </div>
                  )}
                  {/* Exibir descrição normal se não for VENCIMENTO */}
                  {conta.descricao && !conta.descricao.includes("VARIA_MENSAL") && !conta.descricao.match(/VENCIMENTO_(\d+)/) && (
                    <div className="pt-2 border-t border-white/10">
                      <p className="text-sm text-gray-300">{conta.descricao}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Formulário */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-slate-900/95 border-slate-700 backdrop-blur-sm max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">
              {editingConta ? "Editar Conta Fixa" : "Nova Conta Fixa"}
            </DialogTitle>
            <DialogDescription className="text-gray-300">Preencha as informações da despesa recorrente</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="titulo" className="text-white">
                Título da Despesa *
              </Label>
              <Input
                id="titulo"
                type="text"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ex: Conta de Luz, Escola do João..."
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor" className="text-white">
                Valor Mensal (R$) *
              </Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                value={formData.valor_total}
                onChange={(e) => setFormData({ ...formData, valor_total: e.target.value })}
                placeholder="0,00"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoria" className="text-white">
                Categoria
              </Label>
              <Select 
                value={formData.categoria_id || "sem-categoria"} 
                onValueChange={(value) => setFormData({ ...formData, categoria_id: value === "sem-categoria" ? "" : value })}
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sem-categoria">Sem categoria</SelectItem>
                  {categorias.map((categoria) => (
                    <SelectItem key={categoria.id} value={categoria.id}>
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: categoria.cor || "#6b7280" }}
                        ></div>
                        <span>{categoria.nome}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="varia_mensalmente"
                  checked={formData.varia_mensalmente}
                  onCheckedChange={(checked) => setFormData({ ...formData, varia_mensalmente: checked })}
                  className="data-[state=checked]:bg-orange-500"
                />
                <Label htmlFor="varia_mensalmente" className="text-white">
                  Valor varia mensalmente (luz, água, gás)
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dia_vencimento" className="text-white">
                Dia do Vencimento
              </Label>
              <Input
                id="dia_vencimento"
                type="number"
                min="1"
                max="31"
                value={formData.dia_vencimento}
                onChange={(e) => setFormData({ ...formData, dia_vencimento: e.target.value })}
                placeholder="1-31"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
              <p className="text-xs text-gray-400">Dia do mês em que a despesa vence</p>
            </div>

            {formData.varia_mensalmente && (
              <div className="space-y-2">
                <Label htmlFor="dia_lembrete" className="text-white">
                  Dia do Lembrete
                </Label>
                <Input
                  id="dia_lembrete"
                  type="number"
                  min="1"
                  max="31"
                  value={formData.dia_lembrete}
                  onChange={(e) => setFormData({ ...formData, dia_lembrete: e.target.value })}
                  placeholder="1-31"
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                />
                <p className="text-xs text-gray-400">
                  Dia do mês para lembrar de preencher o valor (Escolha uma data antes do vencimento)
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="descricao" className="text-white">
                Descrição (opcional)
              </Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Observações sobre a despesa..."
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 resize-none"
                rows={3}
              />
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
                {submitting ? "Salvando..." : editingConta ? "Atualizar" : "Criar"}
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
              Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita e todas as informações
              relacionadas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 backdrop-blur-sm hover:shadow-xl hover:scale-105 transition-all duration-300">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmacaoExclusao && excluirConta(confirmacaoExclusao)}
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

export default ContasFixas
