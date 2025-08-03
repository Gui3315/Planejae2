import type React from "react"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import {
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  CreditCard,
  Sparkles,
  Shield,
  ArrowRight,
  KeyRound,
  Send,
} from "lucide-react"

const Auth = () => {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [nome, setNome] = useState("")
  const [resetEmail, setResetEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/")
      }
    })

    return () => subscription.unsubscribe()
  }, [navigate])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      toast({
        title: "Erro",
        description: "Nome é obrigatório",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/`
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          nome: nome.trim(),
        },
      },
    })

    if (error) {
      toast({
        title: "Erro no cadastro",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Cadastro realizado!",
        description: "Verifique seu email para confirmar a conta.",
      })
    }
    setLoading(false)
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast({
        title: "Erro no login",
        description: error.message,
        variant: "destructive",
      })
    }
    setLoading(false)
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!resetEmail.trim()) {
      toast({
        title: "Erro",
        description: "Email é obrigatório",
        variant: "destructive",
      })
      return
    }

    setResetLoading(true)
    // Monta a URL de redirecionamento automaticamente (dev + produção)
    const redirectUrl = `${import.meta.env.VITE_APP_URL || window.location.origin}/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: redirectUrl,
    })

    if (error) {
      toast({
        title: "Erro ao enviar email",
        description: error.message,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      })
      setResetModalOpen(false)
      setResetEmail("")
    }
    setResetLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/10 rounded-full blur-3xl"></div>
      </div>

      <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-2 border-slate-300/30 shadow-2xl relative z-10">
        <CardHeader className="text-center pb-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl">
              <CreditCard className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-white drop-shadow-lg flex items-center justify-center gap-2">
            <Sparkles className="w-6 h-6 text-yellow-400" />
            Planejaê
          </CardTitle>
          <CardDescription className="text-slate-300 text-lg drop-shadow-md">
            Gerencie suas contas e controle financeiro
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-white/10 border border-slate-300/30">
              <TabsTrigger
                value="login"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white text-slate-300"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Login
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-blue-500 data-[state=active]:text-white text-slate-300"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Cadastro
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <form onSubmit={handleSignIn} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email-login" className="text-slate-300 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </Label>
                  <Input
                    id="email-login"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-white/10 border-slate-300/30 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/20"
                    placeholder="seu@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-login" className="text-slate-300 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Senha
                  </Label>
                  <Input
                    id="password-login"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white/10 border-slate-300/30 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/20"
                    placeholder="••••••••"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Entrando...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Entrar
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>

                {/* Esqueci minha senha */}
                <div className="text-center">
                  <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-white/10 text-sm">
                        <KeyRound className="w-4 h-4 mr-2" />
                        Esqueci minha senha
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-slate-900/95 border-slate-700 backdrop-blur-sm">
                      <DialogHeader>
                        <DialogTitle className="text-white flex items-center gap-2">
                          <Shield className="w-5 h-5 text-blue-400" />
                          Redefinir Senha
                        </DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handlePasswordReset} className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="reset-email" className="text-slate-300">
                            Digite seu email para receber o link de redefinição:
                          </Label>
                          <Input
                            id="reset-email"
                            type="email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            required
                            className="bg-white/10 border-slate-300/30 text-white placeholder:text-slate-400"
                            placeholder="seu@email.com"
                          />
                        </div>
                        <Button
                          type="submit"
                          className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                          disabled={resetLoading}
                        >
                          {resetLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Enviar Link
                            </>
                          )}
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-6">
              <form onSubmit={handleSignUp} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="nome" className="text-slate-300 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Nome completo
                  </Label>
                  <Input
                    id="nome"
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    className="bg-white/10 border-slate-300/30 text-white placeholder:text-slate-400 focus:border-green-400 focus:ring-green-400/20"
                    placeholder="Seu nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-register" className="text-slate-300 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email
                  </Label>
                  <Input
                    id="email-register"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="bg-white/10 border-slate-300/30 text-white placeholder:text-slate-400 focus:border-green-400 focus:ring-green-400/20"
                    placeholder="seu@email.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-register" className="text-slate-300 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Senha
                  </Label>
                  <Input
                    id="password-register"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="bg-white/10 border-slate-300/30 text-white placeholder:text-slate-400 focus:border-green-400 focus:ring-green-400/20"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold py-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Cadastrando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Criar Conta
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default Auth
