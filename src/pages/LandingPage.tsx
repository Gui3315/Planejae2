import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, BarChart3, Calendar, CheckCircle, TrendingUp, Shield, Users, Zap, PieChart, Star, ArrowRight, Clock, Target, Smartphone, Globe, Award, ThumbsUp } from 'lucide-react';

const LandingPage = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const testimonials = [
    {
      name: "Maria Santos",
      role: "Professora",
      text: "Em 3 meses consegui economizar R$ 2.400 que nem sabia que estava gastando. O Planejaê mudou minha vida!",
      rating: 5
    },
    {
      name: "João Silva",
      role: "Empresário",
      text: "Deixei as planilhas de lado. Agora economizo 3 horas por mês e tenho controle total das finanças.",
      rating: 5
    },
    {
      name: "Ana Costa",
      role: "Designer",
      text: "Interface linda e super fácil de usar. Finalmente entendo para onde vai meu dinheiro!",
      rating: 5
    }
  ];

  const stats = [
    { number: "2,847", label: "Usuários ativos" },
    { number: "R$ 420k", label: "Economizados" },
    { number: "4.9/5", label: "Avaliação" },
    { number: "99.9%", label: "Uptime" }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    // Aqui você integraria com seu backend
    alert(`Obrigado! Em breve você receberá um e-mail em ${email}`);
    setEmail('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white overflow-hidden">
      {/* Hero Section Melhorado */}
      <section className={`max-w-6xl mx-auto px-6 py-20 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="flex-1 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl animate-pulse">
                <DollarSign className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold mb-6 drop-shadow-2xl bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent">
              Planejaê
            </h1>
            <p className="text-xl lg:text-2xl text-blue-200 mb-8 max-w-2xl leading-relaxed">
              Transforme sua vida financeira em <span className="text-yellow-400 font-bold">30 segundos</span>. 
              Diga adeus às planilhas complicadas e economize até <span className="text-green-400 font-bold">R$ 500/mês</span>!
            </p>
            
            {/* Quick Signup Form */}
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4 mb-6 max-w-md mx-auto lg:mx-0">
              <input
                type="email"
                placeholder="Seu melhor e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-blue-200 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <Button type="submit" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 text-lg rounded-xl shadow-xl hover:scale-105 hover:shadow-2xl transition-all duration-300 flex items-center gap-2">
                Começar Grátis <ArrowRight className="w-5 h-5" />
              </Button>
            </form>
            
            <div className="flex items-center justify-center lg:justify-start gap-4 text-sm text-blue-200">
              <div className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span>Grátis para sempre</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="w-4 h-4 text-blue-400" />
                <span>100% seguro</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-purple-400" />
                <span>Setup em 30s</span>
              </div>
            </div>
          </div>
          
          {/* Stats Sidebar */}
          <div className="flex-1 max-w-md">
            <div className="grid grid-cols-2 gap-4 mb-8">
              {stats.map((stat, index) => (
                <Card key={index} className="bg-white/10 border-white/20 backdrop-blur-sm hover:bg-white/15 transition-all duration-300">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-400 mb-1">{stat.number}</div>
                    <div className="text-xs text-blue-200">{stat.label}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* Trust Badges */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="flex items-center gap-1 px-3 py-1 bg-green-500/20 rounded-full border border-green-400/30">
                <Shield className="w-4 h-4 text-green-400" />
                <span className="text-xs text-green-300">SSL Seguro</span>
              </div>
              <div className="flex items-center gap-1 px-3 py-1 bg-blue-500/20 rounded-full border border-blue-400/30">
                <Award className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-blue-300">LGPD</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof - Testimonials */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Mais de 2.800 pessoas já transformaram suas finanças</h2>
          <div className="flex items-center justify-center gap-2 mb-8">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-6 h-6 text-yellow-400 fill-yellow-400" />
            ))}
            <span className="ml-2 text-yellow-400 font-semibold">4.9/5 baseado em 247 avaliações</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="bg-white/10 border-white/20 backdrop-blur-sm hover:bg-white/15 transition-all duration-300 hover:scale-105">
              <CardContent className="p-6">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-blue-100 mb-4 italic">"{testimonial.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold">{testimonial.name.charAt(0)}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{testimonial.name}</div>
                    <div className="text-blue-200 text-xs">{testimonial.role}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Como Funciona - Enhanced */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold mb-4 text-center">Como funciona?</h2>
        <p className="text-xl text-blue-200 text-center mb-12">4 passos simples para o controle total</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { icon: Users, title: "1. Cadastre-se", desc: "Conta criada em 30 segundos, zero burocracia", color: "text-blue-400" },
            { icon: PieChart, title: "2. Conecte suas contas", desc: "Adicione cartões e contas de forma segura", color: "text-purple-400" },
            { icon: BarChart3, title: "3. Veja os insights", desc: "Relatórios automáticos e gráficos inteligentes", color: "text-emerald-400" },
            { icon: TrendingUp, title: "4. Economize mais", desc: "Alcance metas e veja seu dinheiro crescer", color: "text-yellow-400" }
          ].map((step, index) => (
            <Card key={index} className="bg-white/10 border-white/20 backdrop-blur-sm hover:bg-white/15 transition-all duration-300 hover:scale-105 group">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <step.icon className={`w-8 h-8 ${step.color}`} />
                </div>
                <h3 className="font-bold text-white text-lg mb-2">{step.title}</h3>
                <p className="text-blue-100 text-sm leading-relaxed">{step.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features com benefícios específicos */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold mb-4 text-center">Por que escolher o Planejaê?</h2>
        <p className="text-xl text-blue-200 text-center mb-12">Recursos que fazem a diferença na sua vida financeira</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { 
              icon: Calendar, 
              title: "Economize 3h por mês", 
              desc: "Lembretes automáticos e relatórios prontos. Sem mais planilhas manuais.", 
              color: "text-orange-400",
              benefit: "⏰ Mais tempo livre"
            },
            { 
              icon: Shield, 
              title: "Seus dados 100% seguros", 
              desc: "Criptografia bancária e conformidade LGPD. Sua privacidade é nossa prioridade.", 
              color: "text-blue-300",
              benefit: "🔒 Tranquilidade total"
            },
            { 
              icon: Zap, 
              title: "Reduza gastos em 15%", 
              desc: "IA identifica padrões e sugere onde economizar. Resultados em 30 dias.", 
              color: "text-fuchsia-400",
              benefit: "💰 Mais dinheiro no bolso"
            }
          ].map((feature, index) => (
            <Card key={index} className="bg-white/10 border-white/20 backdrop-blur-sm hover:bg-white/15 transition-all duration-300 hover:scale-105 group">
              <CardContent className="p-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className={`w-8 h-8 ${feature.color}`} />
                </div>
                <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-blue-100 text-sm mb-3 leading-relaxed">{feature.desc}</p>
                <div className="px-3 py-1 bg-green-500/20 rounded-full text-green-300 text-xs font-semibold">
                  {feature.benefit}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Comparativo Melhorado */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold mb-4 text-center">Planejaê vs Planilhas</h2>
        <p className="text-xl text-blue-200 text-center mb-12">Veja por que milhares migraram das planilhas</p>
        
        {/* Visual Comparison Cards */}
        <div className="relative max-w-4xl mx-auto">
          {/* Planejaê Card */}
          <div className="relative mb-8">
            <div className="bg-gradient-to-br from-emerald-500/20 via-green-500/15 to-blue-500/20 backdrop-blur-sm border border-emerald-400/40 rounded-2xl p-6 shadow-2xl hover:shadow-emerald-500/25 transition-all duration-500 hover:scale-[1.02]">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <DollarSign className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-3xl text-emerald-300">Planejaê</h3>
                    <div className="px-3 py-1 bg-emerald-500/30 rounded-full text-emerald-200 text-xs font-bold border border-emerald-400/50">
                      ✨ INTELIGENTE
                    </div>
                  </div>
                  <div className="w-full bg-emerald-500/20 rounded-full h-3 border border-emerald-400/30">
                    <div className="bg-gradient-to-r from-emerald-500 to-green-400 h-full rounded-full w-[92%] shadow-lg"></div>
                  </div>
                  <p className="text-emerald-200 text-sm mt-1">92% de satisfação</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {[
                  { icon: "🚀", text: "Automação total - economize 3h/mês", highlight: true },
                  { icon: "📊", text: "Relatórios visuais em tempo real", highlight: true }, 
                  { icon: "🔔", text: "Lembretes inteligentes automáticos", highlight: true },
                  { icon: "☁️", text: "Backup seguro na nuvem 24/7", highlight: false },
                  { icon: "📱", text: "Perfeito no mobile e desktop", highlight: false },
                  { icon: "🎯", text: "Zero erros, 100% precisão", highlight: true },
                  { icon: "💬", text: "Suporte especializado sempre", highlight: false },
                  { icon: "🔒", text: "Segurança bancária garantida", highlight: false }
                ].map((item, i) => (
                  <div key={i} className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-300 ${
                    item.highlight ? 'bg-emerald-500/20 border border-emerald-400/30' : 'bg-white/5'
                  }`}>
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-emerald-100 text-sm font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
              
              <div className="bg-gradient-to-r from-emerald-500/30 to-green-500/20 rounded-xl p-4 border border-emerald-400/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">💰</span>
                    <span className="text-emerald-200 font-semibold">Economia média:</span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-emerald-300">R$ 385</div>
                    <div className="text-emerald-200 text-sm">por mês</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* VS Divider */}
          <div className="flex items-center justify-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-2xl border-4 border-white/20">
              <span className="text-white font-bold text-lg">VS</span>
            </div>
          </div>

          {/* Planilhas Card */}
          <div className="relative">
            <div className="bg-gradient-to-br from-red-500/20 via-orange-500/15 to-red-600/20 backdrop-blur-sm border border-red-400/40 rounded-2xl p-6 shadow-2xl hover:shadow-red-500/25 transition-all duration-500">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <BarChart3 className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-bold text-3xl text-red-300">Planilhas</h3>
                    <div className="px-3 py-1 bg-red-500/30 rounded-full text-red-200 text-xs font-bold border border-red-400/50">
                      😵 ULTRAPASSADO
                    </div>
                  </div>
                  <div className="w-full bg-red-500/20 rounded-full h-3 border border-red-400/30">
                    <div className="bg-gradient-to-r from-red-500 to-orange-400 h-full rounded-full w-[23%] shadow-lg"></div>
                  </div>
                  <p className="text-red-200 text-sm mt-1">23% de eficiência</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {[
                  { icon: "😴", text: "3+ horas semanais de trabalho manual", critical: true },
                  { icon: "📉", text: "Gráficos limitados e estáticos", critical: false }, 
                  { icon: "🧠", text: "Você precisa lembrar de tudo", critical: true },
                  { icon: "💥", text: "Risco de perder dados (crashes)", critical: true },
                  { icon: "📱", text: "Péssima experiência no mobile", critical: false },
                  { icon: "🐛", text: "Erros de fórmula frequentes", critical: true },
                  { icon: "🚫", text: "Sem suporte técnico", critical: false },
                  { icon: "🔓", text: "Dados vulneráveis localmente", critical: true }
                ].map((item, i) => (
                  <div key={i} className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-300 ${
                    item.critical ? 'bg-red-500/20 border border-red-400/30' : 'bg-white/5'
                  }`}>
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-red-100 text-sm font-medium">{item.text}</span>
                  </div>
                ))}
              </div>
              
              <div className="bg-gradient-to-r from-red-500/30 to-orange-500/20 rounded-xl p-4 border border-red-400/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">📉</span>
                    <span className="text-red-200 font-semibold">Perda média:</span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-red-300">R$ 150</div>
                    <div className="text-red-200 text-sm">por mês (gastos ocultos)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="mt-12 text-center">
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-2xl p-8 border border-blue-400/30 backdrop-blur-sm">
              <h3 className="text-2xl font-bold mb-4">A escolha é óbvia, não é?</h3>
              <p className="text-blue-200 mb-6">Migre das planilhas em menos de 5 minutos</p>
              <Button className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-8 py-3 text-lg rounded-xl shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2 mx-auto">
                <span>Fazer a Migração Grátis</span>
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold mb-4 text-center">Comece grátis, evolua quando quiser</h2>
        <p className="text-xl text-blue-200 text-center mb-12">Sem compromissos, sem cartão de crédito</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm hover:scale-105 transition-all duration-300">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-2">Gratuito</h3>
              <div className="text-4xl font-bold mb-4 text-green-400">R$ 0</div>
              <p className="text-blue-200 mb-6">Para sempre</p>
              <ul className="space-y-2 mb-6 text-sm text-left">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Até 3 contas bancárias</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Relatórios básicos</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Lembretes de vencimento</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Suporte por e-mail</li>
              </ul>
              <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:scale-105 transition-all duration-200">
                Começar Grátis
              </Button>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-500/20 to-purple-600/20 border-blue-400/50 backdrop-blur-sm hover:scale-105 transition-all duration-300 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                MAIS POPULAR
              </div>
            </div>
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-2">Premium</h3>
              <div className="text-4xl font-bold mb-4 text-blue-400">R$ 19</div>
              <p className="text-blue-200 mb-6">por mês</p>
              <ul className="space-y-2 mb-6 text-sm text-left">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Contas ilimitadas</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Relatórios avançados + IA</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Metas e planejamento</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Exportar dados</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Suporte prioritário</li>
              </ul>
              <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:scale-105 transition-all duration-200">
                Experimentar Premium
              </Button>
            </CardContent>
          </Card>
          
          <Card className="bg-white/10 border-white/20 backdrop-blur-sm hover:scale-105 transition-all duration-300">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-2">Empresarial</h3>
              <div className="text-4xl font-bold mb-4 text-purple-400">R$ 49</div>
              <p className="text-blue-200 mb-6">por mês</p>
              <ul className="space-y-2 mb-6 text-sm text-left">
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Múltiplos usuários</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Dashboard executivo</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> API e integrações</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Suporte dedicado</li>
                <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Consultoria financeira</li>
              </ul>
              <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:scale-105 transition-all duration-200">
                Falar com Vendas
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ Melhorado */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold mb-4 text-center">Perguntas Frequentes</h2>
        <p className="text-xl text-blue-200 text-center mb-12">Tudo que você precisa saber</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            { q: "Como meus dados estão protegidos?", a: "Usamos criptografia AES-256 (padrão bancário) e certificação LGPD. Seus dados nunca são compartilhados." },
            { q: "Funciona no celular?", a: "Sim! Interface responsiva otimizada para mobile. Funciona perfeitamente em iOS e Android." },
            { q: "Preciso pagar para testar?", a: "Não! Versão gratuita completa para sempre. Sem cartão de crédito, sem pegadinhas." },
            { q: "Como faço backup dos dados?", a: "Backup automático na nuvem a cada 5 minutos. Você também pode exportar tudo em Excel/PDF." },
            { q: "Posso conectar meu banco?", a: "Por segurança, não acessamos sua conta bancária. Você adiciona os dados manualmente ou via OFX." },
            { q: "E se eu não gostar?", a: "Sem problema! Cancele a qualquer momento com 1 clique. Dados ficam disponíveis por 90 dias." }
          ].map((faq, index) => (
            <Card key={index} className="bg-white/10 border-white/20 backdrop-blur-sm hover:bg-white/15 transition-all duration-300">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-3 text-blue-200">{faq.q}</h3>
                <p className="text-blue-100 text-sm leading-relaxed">{faq.a}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Final Melhorado */}
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <div className="bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-3xl p-12 border border-blue-400/30 backdrop-blur-sm">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">
            Pronto para <span className="text-yellow-400">economizar R$ 500/mês</span>?
          </h2>
          <p className="text-xl text-blue-200 mb-8 max-w-3xl mx-auto">
            Junte-se a <strong className="text-white">2.847 pessoas inteligentes</strong> que já estão no controle total das finanças. 
            Comece grátis em 30 segundos!
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 max-w-md mx-auto">
            <Button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 text-lg rounded-xl shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2">
              <Users className="w-5 h-5" />
              Criar Conta Grátis
            </Button>
          </div>
          
          <div className="flex items-center justify-center gap-6 text-sm text-blue-200">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span>Setup em 30 segundos</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              <span>100% gratuito</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-400" />
              <span>Sem cartão necessário</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Melhorado */}
      <footer className="max-w-6xl mx-auto px-6 py-12 text-center border-t border-white/10 mt-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl">Planejaê</span>
            </div>
            <p className="text-blue-200 text-sm">Transformando vidas financeiras desde 2023.</p>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3">Produto</h4>
            <ul className="space-y-2 text-sm text-blue-200">
              <li><a href="#" className="hover:text-white transition-colors">Funcionalidades</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Preços</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Segurança</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3">Suporte</h4>
            <ul className="space-y-2 text-sm text-blue-200">
              <li><a href="#" className="hover:text-white transition-colors">Central de Ajuda</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contato</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3">Empresa</h4>
            <ul className="space-y-2 text-sm text-blue-200">
              <li><a href="#" className="hover:text-white transition-colors">Sobre</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Carreiras</a></li>
            </ul>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/10">
          <div className="text-blue-200 text-sm mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} Planejaê. Todos os direitos reservados.
          </div>
          <div className="flex items-center gap-6 text-sm text-blue-200">
            <a href="#" className="hover:text-white transition-colors">Privacidade</a>
            <a href="#" className="hover:text-white transition-colors">Termos</a>
            <a href="#" className="hover:text-white transition-colors">Cookies</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;