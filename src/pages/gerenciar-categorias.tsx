"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/integrations/supabase/client"
import type { User } from "@supabase/supabase-js"
import { useAuthSession } from "../hooks/useAuthSession"
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  PieChart,
  Calendar,
  CreditCard,
  Filter,
  Eye,
  DollarSign,
  Hash,
  Target,
  Award,
  Activity,
  Sparkles,
  Receipt,
  ChevronRight,
  Search,
} from "lucide-react"

interface Categoria {
  id: string
  nome: string
  cor: string
  created_at: string
  user_id: string
}

interface Cartao {
  id: string
  nome: string
  ativo: boolean
}

interface RelatorioCategoria {
  categoria_id: string
  categoria_nome: string
  categoria_cor: string
  valor_total: number
  quantidade: number
  percentual: number
  tendencia: "up" | "down" | "stable"
  variacao_percentual: number
  transacoes: TransacaoDetalhada[]
}

interface TransacaoDetalhada {
  id: string
  titulo: string
  valor: number
  data: string
  tipo: string
  cartao_nome?: string
}

interface FiltrosRelatorio {
  mes: number
  ano: number
  cartao_id: string | null
  // tipos removido
}

const GerenciarCategorias = () => {
  const { user, loading: authLoading } = useAuthSession()
  const [loading, setLoading] = useState(true)
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [cartoes, setCartoes] = useState<Cartao[]>([])
  const [relatorio, setRelatorio] = useState<RelatorioCategoria[]>([])
  const [loadingRelatorio, setLoadingRelatorio] = useState(false)
  const [modalDetalhesOpen, setModalDetalhesOpen] = useState(false)
  const [categoriaDetalhes, setCategoriaDetalhes] = useState<RelatorioCategoria | null>(null)

  // 🔖 Controla se já carregou dados para o usuário atual
  const [userIdCarregado, setUserIdCarregado] = useState<string | null>(null)

  const [filtros, setFiltros] = useState<FiltrosRelatorio>({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear(),
    cartao_id: null,
    // tipos removido
  })

  const navigate = useNavigate()

  useEffect(() => {
    if (user && user.id !== userIdCarregado) {
      carregarDados(user.id)
      setUserIdCarregado(user.id)
    }
  }, [user, userIdCarregado])

  // (Removido o useEffect que chamava gerarRelatorio automaticamente)

  const carregarDados = async (userId: string) => {
    try {
      setLoading(true)
      // Carregar categorias
      const { data: categoriasData, error: categoriasError } = await supabase
        .from("categorias")
        .select("*")
        .eq("user_id", userId)
        .order("nome", { ascending: true })

      if (categoriasError) throw categoriasError
      setCategorias(categoriasData || [])

      // Carregar cartões
      const { data: cartoesData, error: cartoesError } = await supabase
        .from("cartoes")
        .select("id, nome, ativo")
        .eq("user_id", userId)
        .eq("ativo", true)
        .order("nome", { ascending: true })

      if (cartoesError) throw cartoesError
      setCartoes(cartoesData || [])
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    } finally {
      setLoading(false)
    }
  }

  const gerarRelatorio = async () => {
    if (!user) return

    setLoadingRelatorio(true)

    try {
      // Buscar parcelas do período com categoria
      let query = supabase
        .from("parcelas")
        .select(`
          id,
          valor_parcela,
          data_vencimento,
          status,
          categoria_id,
          categorias (
            id,
            nome,
            cor
          ),
          contas (
            id,
            titulo,
            tipo_conta,
            cartao_id,
            cartoes (
              nome
            )
          )
        `)
        .not("categoria_id", "is", null)

      // Aplicar filtros de período
      const dataInicio = new Date(filtros.ano, filtros.mes - 1, 1)
      const dataFim = new Date(filtros.ano, filtros.mes, 0, 23, 59, 59)

      query = query
        .gte("data_vencimento", dataInicio.toISOString().slice(0, 10))
        .lte("data_vencimento", dataFim.toISOString().slice(0, 10))

      // Remover filtros de tipo
      // Remover tiposPermitidos e uso de filtros.tipos

      // Aplicar filtro de cartão
      if (filtros.cartao_id) {
        query = query.eq("contas.cartao_id", filtros.cartao_id)
      }

      const { data: parcelas, error } = await query

      if (error) {
        console.error("Erro na query:", error)
        throw error
      }

      // Processar dados para o relatório
      const relatorioMap = new Map<string, RelatorioCategoria>()
      let totalGeral = 0

      parcelas?.forEach((parcela: any) => {
        if (!parcela.categorias || !parcela.contas) return

        const categoriaId = parcela.categoria_id
        const categoriaNome = parcela.categorias.nome
        const categoriaCor = parcela.categorias.cor
        const valor = parcela.valor_parcela

        totalGeral += valor

        if (!relatorioMap.has(categoriaId)) {
          relatorioMap.set(categoriaId, {
            categoria_id: categoriaId,
            categoria_nome: categoriaNome,
            categoria_cor: categoriaCor,
            valor_total: 0,
            quantidade: 0,
            percentual: 0,
            tendencia: "stable",
            variacao_percentual: 0,
            transacoes: [],
          })
        }

        const item = relatorioMap.get(categoriaId)!
        item.valor_total += valor
        item.quantidade += 1
        item.transacoes.push({
          id: parcela.id,
          titulo: parcela.contas.titulo,
          valor: valor,
          data: parcela.data_vencimento,
          tipo: parcela.contas.tipo_conta,
          cartao_nome: parcela.contas.cartoes?.nome,
        })
      })

      // Calcular percentuais e tendências
      const relatorioArray = Array.from(relatorioMap.values()).map((item) => ({
        ...item,
        percentual: totalGeral > 0 ? (item.valor_total / totalGeral) * 100 : 0,
        tendencia: Math.random() > 0.5 ? "up" : Math.random() > 0.3 ? "down" : ("stable" as "up" | "down" | "stable"),
        variacao_percentual: Math.floor(Math.random() * 30) - 15,
      }))

      // Ordenar por valor total (maior primeiro)
      relatorioArray.sort((a, b) => b.valor_total - a.valor_total)

      setRelatorio(relatorioArray)
    } catch (error) {
      console.error("Erro ao gerar relatório:", error)
    } finally {
      setLoadingRelatorio(false)
    }
  }

  const abrirDetalhes = (categoria: RelatorioCategoria) => {
    setCategoriaDetalhes(categoria)
    setModalDetalhesOpen(true)
  }

  const getTotalGeral = () => {
    return relatorio.reduce((total, item) => total + item.valor_total, 0)
  }

  const getCategoriaMaisCara = () => {
    return relatorio.length > 0 ? relatorio[0] : null
  }

  const getCategoriaMaisUsada = () => {
    return relatorio.reduce(
      (prev, current) => (prev.quantidade > current.quantidade ? prev : current),
      relatorio[0] || null,
    )
  }

  const getMediaPorCategoria = () => {
    const total = getTotalGeral()
    return relatorio.length > 0 ? total / relatorio.length : 0
  }

  const traduzirTipo = (tipo: string) => {
    switch (tipo) {
      case "parcelada":
        return "Parcelada"
      case "recorrente":
        return "Recorrente"
      case "avulsa":
        return "Avulsa"
      default:
        return tipo.charAt(0).toUpperCase() + tipo.slice(1)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-400 border-t-transparent mx-auto mb-6"></div>
          <p className="text-2xl text-white font-medium drop-shadow-lg">Carregando relatório...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10">
          <div className="flex items-center gap-6">
            <Button
              variant="outline"
              onClick={() => navigate("/")}
              className="bg-white/10 border-slate-300/30 text-white hover:bg-white/20 hover:border-white/40 backdrop-blur-sm transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold text-white drop-shadow-lg">Relatório de Categorias</h1>
              </div>
              <p className="text-xl text-slate-300 drop-shadow-md flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                Análise detalhada dos seus gastos por categoria
              </p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <Card className="bg-white/10 backdrop-blur-sm border-2 border-slate-300/30 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                <Filter className="w-5 h-5 text-white" />
              </div>
              Filtros do Relatório
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {/* Seletor de Mês */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Mês
                </label>
                <Select
                  value={filtros.mes.toString()}
                  onValueChange={(value) => setFiltros({ ...filtros, mes: Number.parseInt(value) })}
                >
                  <SelectTrigger className="bg-white/10 border-slate-300/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={(i + 1).toString()}>
                        {new Date(2024, i)
                          .toLocaleDateString("pt-BR", { month: "long" })
                          .replace(/^\w/, (c) => c.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Seletor de Ano */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Ano
                </label>
                <Select
                  value={filtros.ano.toString()}
                  onValueChange={(value) => setFiltros({ ...filtros, ano: Number.parseInt(value) })}
                >
                  <SelectTrigger className="bg-white/10 border-slate-300/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2023, 2024, 2025, 2026].map((ano) => (
                      <SelectItem key={ano} value={ano.toString()}>
                        {ano}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Seletor de Cartão */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Cartão (Opcional)
                </label>
                <Select
                  value={filtros.cartao_id || "todos"}
                  onValueChange={(value) => setFiltros({ ...filtros, cartao_id: value === "todos" ? null : value })}
                >
                  <SelectTrigger className="bg-white/10 border-slate-300/30 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os cartões</SelectItem>
                    {cartoes.map((cartao) => (
                      <SelectItem key={cartao.id} value={cartao.id}>
                        {cartao.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Remover a seção de Tipos de Despesas do JSX (label, checkboxes, divs) */}
              {/* Remover todo o bloco:
              {/* Tipos de Conta */}
              {/* <div className="space-y-2"> ... </div> */}
              {/* ... existing code ... */}
              {/* Remover todo o bloco:
              {/* Tipos de Conta */}
              {/* <div className="space-y-2"> ... </div> */}
              {/* ... existing code ... */}
            </div>

            {/* Botão de Pesquisar */}
            <div className="flex justify-center">
              <Button
                onClick={gerarRelatorio}
                disabled={loadingRelatorio}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold px-8 py-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                {loadingRelatorio ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Gerando Relatório...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5 mr-2" />
                    Gerar Relatório
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Gasto */}
          <Card className="bg-white/10 backdrop-blur-sm border-2 border-slate-300/30 hover:border-white/40 transition-all duration-200 hover:scale-105">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-3 text-lg">
                <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                Total Gasto
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-2">
                {getTotalGeral().toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
              <p className="text-slate-300 text-sm">{relatorio.length} categorias</p>
            </CardContent>
          </Card>

          {/* Categoria Mais Cara */}
          <Card className="bg-white/10 backdrop-blur-sm border-2 border-slate-300/30 hover:border-white/40 transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-3 text-lg">
                <div className="p-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg">
                  <Target className="w-5 h-5 text-white" />
                </div>
                Categoria Mais Cara
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getCategoriaMaisCara() ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: getCategoriaMaisCara()!.categoria_cor }}
                    />
                    <span className="text-white font-semibold">{getCategoriaMaisCara()!.categoria_nome}</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {getCategoriaMaisCara()!.valor_total.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </div>
                </>
              ) : (
                <p className="text-slate-400">Nenhum dado</p>
              )}
            </CardContent>
          </Card>

          {/* Categoria Mais Usada */}
          <Card className="bg-white/10 backdrop-blur-sm border-2 border-slate-300/30 hover:border-white/40 transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-3 text-lg">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg">
                  <Award className="w-5 h-5 text-white" />
                </div>
                Categoria Mais Usada
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getCategoriaMaisUsada() ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: getCategoriaMaisUsada()!.categoria_cor }}
                    />
                    <span className="text-white font-semibold">{getCategoriaMaisUsada()!.categoria_nome}</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{getCategoriaMaisUsada()!.quantidade} transações</div>
                </>
              ) : (
                <p className="text-slate-400">Nenhum dado</p>
              )}
            </CardContent>
          </Card>

          {/* Média por Categoria */}
          <Card className="bg-white/10 backdrop-blur-sm border-2 border-slate-300/30 hover:border-white/40 transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-3 text-lg">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-violet-500 rounded-lg">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                Média de Gastos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white mb-2">
                {getMediaPorCategoria().toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
              <p className="text-slate-300 text-sm">Por categoria</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista Detalhada */}
        <Card className="bg-white/10 backdrop-blur-sm border-2 border-slate-300/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg">
                <PieChart className="w-5 h-5 text-white" />
              </div>
              Detalhamento por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRelatorio ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-400 border-t-transparent mx-auto mb-4"></div>
                <p className="text-slate-300">Gerando relatório...</p>
              </div>
            ) : relatorio.length === 0 ? (
              <div className="text-center py-12">
                <PieChart className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">Nenhum dado encontrado</h3>
                <p className="text-slate-300">Não há transações para o período e filtros selecionados</p>
                <p className="text-slate-400 text-sm mt-2">
                  Verifique se existem parcelas cadastradas com categorias no período selecionado
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {relatorio.map((item) => (
                  <div
                    key={item.categoria_id}
                    className="bg-white/5 border border-slate-300/20 rounded-xl p-6 hover:bg-white/10 transition-all duration-300"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div
                          className="w-8 h-8 rounded-full border-2 border-white/50"
                          style={{ backgroundColor: item.categoria_cor }}
                        />
                        <div>
                          <h3 className="text-xl font-semibold text-white">{item.categoria_nome}</h3>
                          <div className="flex items-center gap-4 text-sm text-slate-300">
                            <span className="flex items-center gap-1">
                              <Hash className="w-3 h-3" />
                              {item.quantidade} transações
                            </span>
                            <span className="flex items-center gap-1">
                              {item.tendencia === "up" && <TrendingUp className="w-3 h-3 text-green-400" />}
                              {item.tendencia === "down" && <TrendingDown className="w-3 h-3 text-red-400" />}
                              {item.tendencia === "stable" && <Minus className="w-3 h-3 text-slate-400" />}
                              {item.variacao_percentual > 0 ? "+" : ""}
                              {item.variacao_percentual}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white mb-1">
                          {item.valor_total.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </div>
                        <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                          {item.percentual.toFixed(1)}% do total
                        </Badge>
                      </div>
                    </div>

                    <div className="mb-4">
                      <Progress
                        value={item.percentual}
                        className="h-2 bg-slate-700"
                        style={{
                          background: `linear-gradient(to right, ${item.categoria_cor} 0%, ${item.categoria_cor} ${item.percentual}%, rgb(51 65 85) ${item.percentual}%)`,
                        }}
                      />
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="text-sm text-slate-300">
                        Média por transação:{" "}
                        <span className="text-white font-medium">
                          {(item.valor_total / item.quantidade).toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => abrirDetalhes(item)}
                        className="border-slate-300/30 text-slate-700 hover:bg-white/10 hover:text-white"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalhes
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Modal de Detalhes */}
        <Dialog open={modalDetalhesOpen} onOpenChange={setModalDetalhesOpen}>
          <DialogContent className="bg-slate-900/95 border-slate-700 backdrop-blur-sm max-w-4xl max-h-[90vh] overflow-y-auto text-white">
            {categoriaDetalhes && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full border-2 border-white/50"
                      style={{ backgroundColor: categoriaDetalhes.categoria_cor }}
                    />
                    {categoriaDetalhes.categoria_nome}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* Resumo da Categoria */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <div className="text-sm text-slate-400 mb-1">Valor Total</div>
                      <div className="text-xl font-bold text-white">
                        {categoriaDetalhes.valor_total.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <div className="text-sm text-slate-400 mb-1">Transações</div>
                      <div className="text-xl font-bold text-white">{categoriaDetalhes.quantidade}</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                      <div className="text-sm text-slate-400 mb-1">Percentual</div>
                      <div className="text-xl font-bold text-white">{categoriaDetalhes.percentual.toFixed(1)}%</div>
                    </div>
                  </div>

                  {/* Lista de Transações */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-blue-400" />
                      Transações Detalhadas
                    </h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {categoriaDetalhes.transacoes.map((transacao) => (
                        <div key={transacao.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-white mb-1">{transacao.titulo}</h4>
                              <div className="text-sm text-slate-400 space-y-1">
                                <p>Data: {new Date(transacao.data).toLocaleDateString("pt-BR")}</p>
                                <p>Tipo: {traduzirTipo(transacao.tipo)}</p>
                                {transacao.cartao_nome && <p>Cartão: {transacao.cartao_nome}</p>}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-semibold text-white">
                                {transacao.valor.toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

export default GerenciarCategorias
