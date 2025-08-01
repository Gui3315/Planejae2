"use client"

import { useState, useEffect } from "react"
import {
  Settings,
  LogOut,
  AlertTriangle,
  DollarSign,
  CreditCard,
  Calendar,
  TrendingUp,
  TrendingDown,
  Zap,
  Droplets,
  Wifi,
  Home,
  ShoppingCart,
  PiggyBank,
  FileText,
  Tags,
  ChevronRight,
  Bell,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "./src/components/ui/card"
import { Button } from "./src/components/ui/button"
import { Badge } from "./src/components/ui/badge"

export default function Component() {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 30000) // Auto-refresh a cada 30 segundos

    return () => clearInterval(timer)
  }, [])

  // Dados mockados para demonstração
  const userData = {
    name: "João Silva",
    renda: 5500.0,
    gastos: 4200.0,
    saldo: 1300.0,
    proximoVencimento: { nome: "Cartão Nubank", valor: 850.0, dias: 3 },
  }

  const contasAPreencher = [
    { id: 1, nome: "Conta de Luz", icon: Zap, cor: "text-yellow-400" },
    { id: 2, nome: "Conta de Água", icon: Droplets, cor: "text-blue-400" },
    { id: 3, nome: "Internet", icon: Wifi, cor: "text-purple-400" },
  ]

  const contasVencendo = [
    { nome: "Cartão Nubank", valor: 850.0, tipo: "Cartão", dias: 3, urgencia: "alta" },
    { nome: "Financiamento Casa", valor: 1200.0, tipo: "Carnê", dias: 5, urgencia: "media" },
    { nome: "Conta de Luz", valor: 180.0, tipo: "Conta Fixa", dias: 7, urgencia: "baixa" },
    { nome: "Plano de Saúde", valor: 320.0, tipo: "Conta Fixa", dias: 6, urgencia: "media" },
  ]

  const acoesRapidas = [
    {
      nome: "Gerenciar Renda",
      icon: TrendingUp,
      cor: "from-emerald-500 to-emerald-600",
      hover: "hover:from-emerald-600 hover:to-emerald-700",
    },
    {
      nome: "Gerenciar Cartões",
      icon: CreditCard,
      cor: "from-blue-500 to-blue-600",
      hover: "hover:from-blue-600 hover:to-blue-700",
    },
    {
      nome: "Contas Fixas",
      icon: Home,
      cor: "from-indigo-500 to-indigo-600",
      hover: "hover:from-indigo-600 hover:to-indigo-700",
    },
    {
      nome: "Nova Compra",
      icon: ShoppingCart,
      cor: "from-purple-500 to-purple-600",
      hover: "hover:from-purple-600 hover:to-purple-700",
    },
    {
      nome: "Controle Faturas",
      icon: FileText,
      cor: "from-red-500 to-red-600",
      hover: "hover:from-red-600 hover:to-red-700",
    },
    {
      nome: "Categorias",
      icon: Tags,
      cor: "from-orange-500 to-orange-600",
      hover: "hover:from-orange-600 hover:to-orange-700",
    },
  ]

  const getUrgenciaColor = (urgencia: string) => {
    switch (urgencia) {
      case "alta":
        return "bg-red-500"
      case "media":
        return "bg-yellow-500"
      case "baixa":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header Principal */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm"></div>
        <div className="relative px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white tracking-tight">CAP - Contas a Pagar</h1>
                  <p className="text-blue-200 text-lg">Bem-vindo, {userData.name}!</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 transition-all duration-200"
                >
                  <Settings className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/10 transition-all duration-200"
                >
                  <LogOut className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 pb-8">
        {/* Seção de Alertas */}
        {contasAPreencher.length > 0 && (
          <Card className="mb-8 bg-gradient-to-r from-orange-500/10 to-red-500/10 border-orange-500/20 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1">Contas a Preencher</h3>
                    <p className="text-orange-200">
                      Você tem {contasAPreencher.length} contas variáveis para preencher
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex -space-x-2">
                    {contasAPreencher.slice(0, 3).map((conta) => (
                      <div
                        key={conta.id}
                        className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center border-2 border-orange-500/30"
                      >
                        <conta.icon className={`w-4 h-4 ${conta.cor}`} />
                      </div>
                    ))}
                  </div>
                  <Button className="bg-orange-500 hover:bg-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                    Preencher
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Renda Mensal */}
          <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/20 backdrop-blur-sm hover:shadow-xl hover:scale-105 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-emerald-400" />
                </div>
                <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                  +100%
                </Badge>
              </div>
              <h3 className="text-emerald-200 text-sm font-medium mb-1">Renda Mensal</h3>
              <p className="text-2xl font-bold text-white">{formatCurrency(userData.renda)}</p>
            </CardContent>
          </Card>

          {/* Gastos Totais */}
          <Card className="bg-gradient-to-br from-red-500/10 to-pink-500/10 border-red-500/20 backdrop-blur-sm hover:shadow-xl hover:scale-105 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-red-400" />
                </div>
                <Badge variant="secondary" className="bg-red-500/20 text-red-300 border-red-500/30">
                  76%
                </Badge>
              </div>
              <h3 className="text-red-200 text-sm font-medium mb-1">Gastos Totais</h3>
              <p className="text-2xl font-bold text-white">{formatCurrency(userData.gastos)}</p>
            </CardContent>
          </Card>

          {/* Saldo Disponível */}
          <Card
            className={`bg-gradient-to-br ${userData.saldo >= 0 ? "from-blue-500/10 to-cyan-500/10 border-blue-500/20" : "from-red-500/10 to-pink-500/10 border-red-500/20"} backdrop-blur-sm hover:shadow-xl hover:scale-105 transition-all duration-300`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-12 h-12 ${userData.saldo >= 0 ? "bg-blue-500/20" : "bg-red-500/20"} rounded-full flex items-center justify-center`}
                >
                  <PiggyBank className={`w-6 h-6 ${userData.saldo >= 0 ? "text-blue-400" : "text-red-400"}`} />
                </div>
                <Badge
                  variant="secondary"
                  className={`${userData.saldo >= 0 ? "bg-blue-500/20 text-blue-300 border-blue-500/30" : "bg-red-500/20 text-red-300 border-red-500/30"}`}
                >
                  {userData.saldo >= 0 ? "+" : ""}
                  {((userData.saldo / userData.renda) * 100).toFixed(0)}%
                </Badge>
              </div>
              <h3 className={`${userData.saldo >= 0 ? "text-blue-200" : "text-red-200"} text-sm font-medium mb-1`}>
                Saldo Disponível
              </h3>
              <p className="text-2xl font-bold text-white">{formatCurrency(userData.saldo)}</p>
            </CardContent>
          </Card>

          {/* Próximo Vencimento */}
          <Card className="bg-gradient-to-br from-orange-500/10 to-yellow-500/10 border-orange-500/20 backdrop-blur-sm hover:shadow-xl hover:scale-105 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-orange-400" />
                </div>
                <Badge variant="secondary" className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                  {userData.proximoVencimento.dias}d
                </Badge>
              </div>
              <h3 className="text-orange-200 text-sm font-medium mb-1">Próximo Vencimento</h3>
              <p className="text-lg font-bold text-white truncate">{userData.proximoVencimento.nome}</p>
              <p className="text-orange-300 text-sm">{formatCurrency(userData.proximoVencimento.valor)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Seção Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contas Vencendo em Breve */}
          <div className="lg:col-span-2">
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold text-white flex items-center">
                    <Bell className="w-5 h-5 mr-2 text-blue-400" />
                    Contas Vencendo em Breve
                  </CardTitle>
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                    {contasVencendo.length} contas
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {contasVencendo.map((conta, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-200 group"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${getUrgenciaColor(conta.urgencia)} shadow-lg`}></div>
                      <div>
                        <h4 className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                          {conta.nome}
                        </h4>
                        <p className="text-sm text-gray-400">{conta.tipo}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white">{formatCurrency(conta.valor)}</p>
                      <p className="text-sm text-gray-400">{conta.dias} dias</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Ações Rápidas */}
          <div>
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-semibold text-white">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {acoesRapidas.map((acao, index) => (
                  <Button
                    key={index}
                    className={`w-full justify-start bg-gradient-to-r ${acao.cor} ${acao.hover} text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105`}
                    size="lg"
                  >
                    <acao.icon className="w-5 h-5 mr-3" />
                    {acao.nome}
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </Button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Alerta de Saldo Negativo */}
        {userData.saldo < 0 && (
          <Card className="mt-8 bg-gradient-to-r from-red-500/10 to-pink-500/10 border-red-500/20 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">Atenção: Saldo Negativo</h3>
                  <p className="text-red-200">Seus gastos estão superiores à sua renda. Revise seu orçamento.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
