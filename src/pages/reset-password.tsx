"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useNavigate, useLocation, useSearchParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Shield, Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft, KeyRound, Sparkles } from "lucide-react"

const ResetPassword = () => {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [validatingToken, setValidatingToken] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    const validateToken = async () => {
      try {
        // Capturar tokens do hash da URL
        const hash = location.hash // Exemplo: #access_token=...&refresh_token=...&type=recovery
        let accessToken = null
        let refreshToken = null
        let type = null
        if (hash) {
          const params = new URLSearchParams(hash.substring(1)) // remove o '#'
          accessToken = params.get("access_token")
          refreshToken = params.get("refresh_token")
          type = params.get("type")
        }

        if (!accessToken || !refreshToken || type !== "recovery") {
          throw new Error("Token inválido ou expirado")
        }

        // Definir a sessão com os tokens
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (error) throw error

        setTokenValid(true)
        toast({
          title: "Token validado!",
          description: "Agora você pode definir sua nova senha.",
        })
      } catch (error) {
        console.error("Erro ao validar token:", error)
        setTokenValid(false)
        toast({
          title: "Link inválido",
          description: "Este link de redefinição é inválido ou expirou.",
          variant: "destructive",
        })
      } finally {
        setValidatingToken(false)
      }
    }

    validateToken()
  }, [location, toast])

  const validatePassword = (password: string) => {
    const minLength = password.length >= 6
    const hasUpperCase = /[A-Z]/.test(password)
    const hasLowerCase = /[a-z]/.test(password)
    const hasNumbers = /\d/.test(password)

    return {
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      isValid: minLength && hasUpperCase && hasLowerCase && hasNumbers,
    }
  }

  const passwordValidation = validatePassword(password)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!passwordValidation.isValid) {
      toast({
        title: "Senha inválida",
        description: "A senha deve atender a todos os critérios de segurança.",
        variant: "destructive",
      })
      return
    }

    if (password !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "As senhas digitadas não são iguais.",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      })

      if (error) throw error

      toast({
        title: "Senha redefinida!",
        description: "Sua senha foi alterada com sucesso. Redirecionando...",
      })

      // Aguardar um pouco antes de redirecionar
      setTimeout(() => {
        navigate("/auth")
      }, 2000)
    } catch (error: any) {
      console.error("Erro ao redefinir senha:", error)
      toast({
        title: "Erro ao redefinir senha",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (validatingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        {/* Efeitos de fundo */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-green-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
        </div>

        <div className="text-center relative z-10">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-400 border-t-transparent mx-auto mb-6"></div>
          <p className="text-2xl text-white font-medium drop-shadow-lg">Validando link...</p>
          <p className="text-slate-300 mt-2">Aguarde enquanto verificamos seu token de redefinição</p>
        </div>
      </div>
    )
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        {/* Efeitos de fundo */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        </div>

        <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-2 border-slate-300/30 relative z-10">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 p-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-full w-fit">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Link Inválido</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-slate-300">Este link de redefinição de senha é inválido ou expirou.</p>
            <p className="text-slate-400 text-sm">Solicite um novo link de redefinição na página de login.</p>
            <Button
              onClick={() => navigate("/auth")}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold py-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      {/* Efeitos de fundo */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-green-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse"></div>
      </div>

      <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-2 border-slate-300/30 relative z-10">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-gradient-to-r from-green-500 to-blue-500 rounded-full w-fit">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            <Shield className="w-6 h-6" />
            Redefinir Senha
          </CardTitle>
          <p className="text-slate-300 mt-2 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            Crie uma nova senha segura para sua conta
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-6">
            {/* Nova Senha */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Nova Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua nova senha"
                  className="bg-white/10 border-slate-300/30 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/20 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Critérios de Senha */}
            {password && (
              <div className="bg-white/5 border border-slate-300/20 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-slate-300 mb-3">Critérios de Segurança:</p>
                <div className="space-y-2">
                  <div
                    className={`flex items-center gap-2 text-sm ${passwordValidation.minLength ? "text-green-400" : "text-slate-400"}`}
                  >
                    <CheckCircle
                      className={`w-4 h-4 ${passwordValidation.minLength ? "text-green-400" : "text-slate-500"}`}
                    />
                    Mínimo 6 caracteres
                  </div>
                  <div
                    className={`flex items-center gap-2 text-sm ${passwordValidation.hasUpperCase ? "text-green-400" : "text-slate-400"}`}
                  >
                    <CheckCircle
                      className={`w-4 h-4 ${passwordValidation.hasUpperCase ? "text-green-400" : "text-slate-500"}`}
                    />
                    Pelo menos uma letra maiúscula
                  </div>
                  <div
                    className={`flex items-center gap-2 text-sm ${passwordValidation.hasLowerCase ? "text-green-400" : "text-slate-400"}`}
                  >
                    <CheckCircle
                      className={`w-4 h-4 ${passwordValidation.hasLowerCase ? "text-green-400" : "text-slate-500"}`}
                    />
                    Pelo menos uma letra minúscula
                  </div>
                  <div
                    className={`flex items-center gap-2 text-sm ${passwordValidation.hasNumbers ? "text-green-400" : "text-slate-400"}`}
                  >
                    <CheckCircle
                      className={`w-4 h-4 ${passwordValidation.hasNumbers ? "text-green-400" : "text-slate-500"}`}
                    />
                    Pelo menos um número
                  </div>
                </div>
              </div>
            )}

            {/* Confirmar Senha */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-slate-300 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Confirmar Nova Senha
              </Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme sua nova senha"
                  className="bg-white/10 border-slate-300/30 text-white placeholder:text-slate-400 focus:border-blue-400 focus:ring-blue-400/20 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  As senhas não coincidem
                </p>
              )}
            </div>

            {/* Botões */}
            <div className="space-y-3">
              <Button
                type="submit"
                disabled={loading || !passwordValidation.isValid || password !== confirmPassword}
                className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold py-3 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Redefinindo Senha...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Redefinir Senha
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/auth")}
                className="w-full bg-white/10 border-slate-300/30 text-slate-300 hover:bg-white/20 hover:text-white hover:border-white/40 backdrop-blur-sm transition-all duration-300"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default ResetPassword
