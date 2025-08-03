"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { supabase } from "@/integrations/supabase/client"
import type { User } from "@supabase/supabase-js"
import { useAuthSession } from "../hooks/useAuthSession"
import { Tag, Plus, Edit, Trash2, ArrowLeft, Palette, Sparkles, Hash, CheckCircle, AlertCircle } from "lucide-react"

// Interface para categoria
interface Categoria {
  id: string
  nome: string
  cor: string // Cor em formato hexadecimal
  created_at: string
  user_id: string
}

// Interface para dados do formulário
interface FormData {
  nome: string
  cor: string
}

const Categorias = () => {
  const { user, loading: authLoading } = useAuthSession()
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState<Categoria | null>(null)
  const [formData, setFormData] = useState<FormData>({
    nome: "",
    cor: "#3B82F6", // Cor padrão azul
  })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const navigate = useNavigate()

  // Carregar categorias quando o usuário estiver disponível
  useEffect(() => {
    if (user) {
      carregarCategorias(user.id)
    }
  }, [user])

  // Função para carregar categorias do usuário
  const carregarCategorias = async (userId: string) => {
    try {
      setLoading(true)
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
    } finally {
      setLoading(false)
    }
  }

  // Função para abrir modal de criação/edição
  const abrirModal = (categoria?: Categoria) => {
    if (categoria) {
      setEditingCategoria(categoria)
      setFormData({
        nome: categoria.nome,
        cor: categoria.cor,
      })
    } else {
      setEditingCategoria(null)
      setFormData({
        nome: "",
        cor: "#3B82F6",
      })
    }
    setModalOpen(true)
  }

  // Função para exibir mensagens de feedback
  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  // Função para salvar categoria (criar ou editar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nome.trim()) {
      showMessage("error", "Nome da categoria é obrigatório")
      return
    }

    setSubmitting(true)

    try {
      const categoriaData = {
        nome: formData.nome.trim(),
        cor: formData.cor,
        user_id: user!.id,
      }

      if (editingCategoria) {
        // Atualizar categoria existente
        const { data, error } = await supabase
          .from("categorias")
          .update(categoriaData)
          .eq("id", editingCategoria.id)
          .eq("user_id", user!.id)
          .select()

        if (error) throw error
        showMessage("success", "Categoria atualizada com sucesso!")
      } else {
        // Criar nova categoria
        const { data, error } = await supabase.from("categorias").insert([categoriaData]).select()

        if (error) throw error
        showMessage("success", "Categoria criada com sucesso!")
      }

      setModalOpen(false)
      if (user) await carregarCategorias(user.id)
    } catch (error) {
      console.error("Erro ao salvar categoria:", error)
      showMessage("error", `Erro: ${error instanceof Error ? error.message : "Erro desconhecido"}`)
    } finally {
      setSubmitting(false)
    }
  }

  // Função para excluir categoria
  const excluirCategoria = async (categoria: Categoria) => {
    if (!confirm(`Tem certeza que deseja excluir a categoria "${categoria.nome}"?`)) {
      return
    }

    try {
      const { error } = await supabase.from("categorias").delete().eq("id", categoria.id).eq("user_id", user!.id)

      if (error) throw error

      showMessage("success", "Categoria excluída com sucesso!")
      if (user) await carregarCategorias(user.id)
    } catch (error) {
      console.error("Erro ao excluir categoria:", error)
      showMessage("error", "Não foi possível excluir a categoria")
    }
  }

  // Tela de carregamento
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-400 border-t-transparent mx-auto mb-6"></div>
          <p className="text-2xl text-white font-medium drop-shadow-lg">Carregando categorias...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Toast de feedback */}
        {message && (
          <div
            className={`fixed top-6 right-6 z-50 p-4 rounded-xl shadow-2xl backdrop-blur-sm border-2 transform transition-all duration-300 ${
              message.type === "success"
                ? "bg-emerald-500/90 text-white border-emerald-400"
                : "bg-red-500/90 text-white border-red-400"
            }`}
          >
            <div className="flex items-center gap-3">
              {message.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              <span className="font-medium">{message.text}</span>
            </div>
          </div>
        )}

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
                <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl">
                  <Tag className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-4xl lg:text-5xl font-bold text-white drop-shadow-lg">Categorias</h1>
              </div>
              <p className="text-xl text-slate-300 drop-shadow-md flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                Organize seus gastos por categorias
              </p>
            </div>
          </div>

          <Dialog open={modalOpen} onOpenChange={setModalOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300"
                onClick={() => abrirModal()}
              >
                <Plus className="w-5 h-5 mr-2" />
                Nova Categoria
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white/95 backdrop-blur-md border-2 border-slate-200/50 shadow-2xl max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
                    <Palette className="w-5 h-5 text-white" />
                  </div>
                  {editingCategoria ? "Editar Categoria" : "Nova Categoria"}
                </DialogTitle>
                <DialogDescription className="text-slate-600 text-base">
                  {editingCategoria
                    ? "Atualize as informações da categoria"
                    : "Crie uma nova categoria para organizar seus gastos"}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                <div className="space-y-3">
                  <Label htmlFor="nome" className="text-slate-700 font-semibold text-base flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Nome da Categoria
                  </Label>
                  <Input
                    id="nome"
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Alimentação, Transporte, Lazer..."
                    className="border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl h-12 text-base"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="cor" className="text-slate-700 font-semibold text-base flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Cor da Categoria
                  </Label>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Input
                        id="cor"
                        type="color"
                        value={formData.cor}
                        onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                        className="w-16 h-12 border-2 border-slate-300 focus:border-blue-500 cursor-pointer rounded-xl overflow-hidden"
                      />
                      <div className="absolute inset-0 rounded-xl border-2 border-white/50 pointer-events-none"></div>
                    </div>
                    <div className="flex-1 relative">
                      <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="text"
                        value={formData.cor}
                        onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                        placeholder="#3B82F6"
                        className="border-2 border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-xl h-12 pl-10 text-base font-mono"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <div
                      className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: formData.cor }}
                    />
                    <span>Preview da cor selecionada</span>
                  </div>
                </div>

                <DialogFooter className="gap-3 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setModalOpen(false)}
                    className="border-2 border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl h-12 px-6"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl h-12 px-6 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                  >
                    {submitting ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        Salvando...
                      </div>
                    ) : editingCategoria ? (
                      "Atualizar"
                    ) : (
                      "Criar"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de Categorias */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categorias.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <div className="bg-white/10 backdrop-blur-sm border-2 border-slate-300/30 rounded-3xl p-12 max-w-md mx-auto">
                <div className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl w-fit mx-auto mb-6">
                  <Tag className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Nenhuma categoria criada</h3>
                <p className="text-slate-300 mb-8 text-lg leading-relaxed">
                  Crie categorias para organizar melhor seus gastos e ter mais controle financeiro
                </p>
                <Button
                  onClick={() => abrirModal()}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300 h-12 px-8"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Criar Primeira Categoria
                </Button>
              </div>
            </div>
          ) : (
            categorias.map((categoria) => (
              <Card
                key={categoria.id}
                className="bg-white/10 backdrop-blur-sm border-2 border-slate-300/30 hover:border-white/40 hover:bg-white/15 transition-all duration-300 hover:scale-105 hover:shadow-2xl group"
              >
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="relative">
                        <div
                          className="w-12 h-12 rounded-2xl border-3 border-white/50 shadow-lg group-hover:scale-110 transition-transform duration-300"
                          style={{ backgroundColor: categoria.cor }}
                        />
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent"></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-xl font-bold text-white mb-1 truncate group-hover:text-blue-200 transition-colors duration-300">
                          {categoria.nome}
                        </CardTitle>
                        <CardDescription className="text-slate-300 font-mono text-sm flex items-center gap-2">
                          <Hash className="w-3 h-3" />
                          {categoria.cor.toUpperCase()}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => abrirModal(categoria)}
                      className="flex-1 border-2 border-blue-300/50 text-blue-500 hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all duration-300 h-9"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => excluirCategoria(categoria)}
                      className="flex-1 border-2 border-red-300/50 text-red-300 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all duration-300 h-9"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Estatísticas */}
        {categorias.length > 0 && (
          <div className="mt-12">
            <Card className="bg-white/10 backdrop-blur-sm border-2 border-slate-300/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  Estatísticas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-2">{categorias.length}</div>
                    <div className="text-slate-300">Categorias Criadas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-2">
                      {new Set(categorias.map((c) => c.cor)).size}
                    </div>
                    <div className="text-slate-300">Cores Únicas</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-2">
                      {categorias.filter((c) => c.created_at.startsWith(new Date().getFullYear().toString())).length}
                    </div>
                    <div className="text-slate-300">Criadas Este Ano</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default Categorias
