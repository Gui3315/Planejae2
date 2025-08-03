import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuthSession } from '@/hooks/useAuthSession';
import { 
  DollarSign,
  BarChart3, 
  CreditCard, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Plus,
  Eye,
  Settings,
  LogOut,
  Zap,
  Droplets,
  Flame,
  Home,
  Tag,
  Bell,
  ChevronRight,
  PiggyBank
} from 'lucide-react';

interface Profile {
  id: string;
  nome: string;
  email: string;
}

interface Cartao {
  id: string;
  nome: string;
  limite_credito: number;
  dia_vencimento: number;
  melhor_dia_compra?: number; // Dia em que o cartão "vira" (ciclo de compras) - opcional
  taxa_juros_rotativo: number;
  ativo: boolean;
}

interface Conta {
  id: string;
  titulo: string;
  valor_total: number;
  tipo_conta: string;
  data_primeira_parcela: string;
  total_parcelas: number;
  descricao: string | null;
  cartao_id: string | null; // ID do cartão (se for conta parcelada)
}

interface Parcela {
  id: string;
  conta_id: string;
  numero_parcela: number;
  valor_parcela: number;
  data_vencimento: string;
  status: string;
}

interface TipoRenda {
  id: string;
  nome: string;
  valor: number;
  descricao?: string;
  ativo: boolean;
  created_at: string;
  user_id: string;
}

interface FaturaCartao {
  id: string;
  cartao_id: string;
  mes_referencia: string;
  valor_total: number;
  valor_pago: number;
  valor_restante: number;
  data_vencimento: string;
  status: string;
  user_id: string;
}

const Index = () => {
  const { user, loading } = useAuthSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [parcelas, setParcelas] = useState<Parcela[]>([]); // Parcelas do mês atual para gastos
  const [todasParcelas, setTodasParcelas] = useState<Parcela[]>([]); // Todas as parcelas para cálculo de limite
  const [contasParceladas, setContasParceladas] = useState<Conta[]>([]); // Contas parceladas para cálculo de limite
  const [faturasEmAberto, setFaturasEmAberto] = useState<FaturaCartao[]>([]); // Faturas em aberto para gastos
  const [contasFixas, setContasFixas] = useState<Conta[]>([]); // Contas fixas para gastos
  const [parcelasCarne, setParcelasCarne] = useState<Parcela[]>([]); // Parcelas de carnê para gastos
  const [tiposRenda, setTiposRenda] = useState<TipoRenda[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Estado do mês atual
  const [mesAtual] = useState(new Date().getMonth());
  const [anoAtual] = useState(new Date().getFullYear());

  // Carregar dados quando o usuário estiver disponível
  useEffect(() => {
    if (user) {
      carregarDados(user.id);
    }
  }, [user]);

  // 🔖 NOVO: Recarregar dados automaticamente a cada 30 segundos
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      carregarDados(user.id);
    }, 30000); // 30 segundos

    return () => clearInterval(interval);
  }, [user]);

  // 🔖 NOVO: Recarregar dados quando a aba voltar a ficar ativa
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        console.log('🔄 Aba voltou a ficar ativa, recarregando dados...');
        carregarDados(user.id);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // Função para calcular o limite disponível de um cartão
  const calcularLimiteDisponivel = (cartao: Cartao) => {
    const limiteCartao = cartao.limite_credito || 0;
    
    // 🔖 CORREÇÃO: Buscar contas parceladas deste cartão
    const contasDoCartao = contasParceladas.filter(conta => conta.cartao_id === cartao.id);
    
    let limiteUsado = 0;
    
    contasDoCartao.forEach(conta => {
      // 🔖 CORREÇÃO: Usar todas as parcelas para cálculo de limite
      const parcelasDaConta = todasParcelas.filter(parcela => parcela.conta_id === conta.id);
      
      // Calcular valor total das parcelas pendentes
      const parcelasPendentes = parcelasDaConta.filter(parcela => parcela.status === 'pendente');
      const valorPendente = parcelasPendentes.reduce((total, parcela) => total + parcela.valor_parcela, 0);
      
      limiteUsado += valorPendente;
    });
    
    return limiteCartao - limiteUsado;
  };

  const carregarDados = async (userId: string) => {
    try {
      // Carregar perfil
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError) {
        console.error('Erro ao carregar perfil:', profileError);
        if (profileError.code === 'PGRST301') {
          // Usuário não autorizado, redirecionar para login
          navigate('/auth');
          return;
        }
      }
      
      if (profileData) setProfile(profileData);

      // Carregar tipos de renda
      const { data: tiposRendaData } = await supabase
        .from('tipos_renda' as any)
        .select('*')
        .eq('user_id', userId)
        .eq('ativo', true);
      
      if (tiposRendaData) setTiposRenda(tiposRendaData as unknown as TipoRenda[]);

      // Carregar cartões
      const { data: cartoesData } = await supabase
        .from('cartoes')
        .select('*')
        .eq('user_id', userId)
        .eq('ativo', true);
      
      if (cartoesData) setCartoes(cartoesData);

      // Carregar contas
      const { data: contasData } = await supabase
        .from('contas')
        .select('*')
        .eq('user_id', userId);
      
      if (contasData) {
        setContas(contasData);
        
        // Separar contas parceladas para cálculo de limite
        const parceladas = contasData.filter(conta => conta.tipo_conta === 'parcelada' && conta.cartao_id);
        setContasParceladas(parceladas);
      }

      // 🔖 CORREÇÃO: Carregar apenas parcelas do mês atual para gastos
      const inicioMes = new Date(anoAtual, mesAtual, 1);
      const fimMes = new Date(anoAtual, mesAtual + 1, 0);
      
      const { data: parcelasData } = await supabase
        .from('parcelas')
        .select('*')
        .gte('data_vencimento', inicioMes.toISOString().split('T')[0])
        .lte('data_vencimento', fimMes.toISOString().split('T')[0]);
      
      if (parcelasData) setParcelas(parcelasData);

      // 🔖 CORREÇÃO: Carregar TODAS as parcelas separadamente para cálculo de limite
      const { data: todasParcelasData } = await supabase
        .from('parcelas')
        .select('*');
      
      if (todasParcelasData) {
        setTodasParcelas(todasParcelasData);
      }

      // 🔖 NOVO: Carregar faturas em aberto E fechadas para cálculo de gastos
      const { data: faturasData } = await supabase
        .from('faturas_cartao' as any)
        .select('*')
        .eq('user_id', userId)
        .or('status.eq.aberta,status.eq.fechada');
      
      if (faturasData) {
        setFaturasEmAberto(faturasData as unknown as FaturaCartao[]);
      }

      // 🔖 NOVO: Carregar contas fixas para gastos
      const { data: contasFixasData } = await supabase
        .from('contas')
        .select('*')
        .eq('user_id', userId)
        .eq('tipo_conta', 'recorrente');
      
      if (contasFixasData) {
        setContasFixas(contasFixasData);
      }

      // 🔖 NOVO: Carregar parcelas de carnê (parcelas que não são de cartão)
      // Primeiro buscar contas parceladas sem cartão
      const { data: contasCarneData } = await supabase
        .from('contas')
        .select('id')
        .eq('user_id', userId)
        .eq('tipo_conta', 'parcelada')
        .is('cartao_id', null);
      
      if (contasCarneData && contasCarneData.length > 0) {
        const contaIds = contasCarneData.map(c => c.id);
        
        // 🔖 CORREÇÃO: Buscar parcelas do mês atual apenas
        const inicioMes = new Date(anoAtual, mesAtual, 1);
        const fimMes = new Date(anoAtual, mesAtual + 1, 0);
        
        const { data: parcelasCarneData } = await supabase
          .from('parcelas')
          .select('*')
          .in('conta_id', contaIds)
          .eq('status', 'pendente')
          .gte('data_vencimento', inicioMes.toISOString().split('T')[0])
          .lte('data_vencimento', fimMes.toISOString().split('T')[0]);
        
        if (parcelasCarneData) {
          setParcelasCarne(parcelasCarneData);
        }
      }

    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      setError(error?.message || 'Erro ao carregar dados. Verifique sua conexão ou tente novamente.');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // Cálculos financeiros
  const rendaTotal = tiposRenda.reduce((total, tipo) => total + tipo.valor, 0);
  const salarioMensal = rendaTotal; // Usar apenas a nova estrutura de renda
  
  // 🔖 NOVA LÓGICA: Calcular todos os gastos considerando pagamentos parciais
  // 1. Faturas em aberto (valor restante após pagamentos parciais)
  const totalFaturasRestantes = faturasEmAberto.reduce((total, fatura) => {
    const valorRestante = fatura.valor_total - fatura.valor_pago;
    return total + valorRestante;
  }, 0);
  
  // 2. Contas fixas
  const totalContasFixas = contasFixas.reduce((total, conta) => total + conta.valor_total, 0);
  
  // 3. Parcelas de carnê
  const totalParcelasCarne = parcelasCarne.reduce((total, parcela) => total + parcela.valor_parcela, 0);
  
  // 4. Total geral de gastos
  const totalGastosMes = totalFaturasRestantes + totalContasFixas + totalParcelasCarne;
  
  const saldoDisponivel = salarioMensal - totalGastosMes;
  const percentualGasto = salarioMensal > 0 ? (totalGastosMes / salarioMensal) * 100 : 0;

  // 🔖 NOVO: Contas vencendo em breve (próximos 7 dias)
  // 🔖 CORREÇÃO: Usar data local do Brasil (UTC-3)
  const hoje = new Date();
  const hojeBrasil = new Date(hoje.getTime() - (3 * 60 * 60 * 1000)); // Ajustar para UTC-3
  hojeBrasil.setHours(0, 0, 0, 0);
  const proximos7Dias = new Date(hojeBrasil.getTime() + 7 * 24 * 60 * 60 * 1000);
  

  
  // Interface para contas vencendo
  interface ContaVencendo {
    id: string;
    titulo: string;
    valor: number;
    dataVencimento: Date;
    tipo: 'cartao' | 'carne' | 'conta_fixa';
    cartaoNome?: string;
    parcelaInfo?: string;
  }
  
  // 🔖 NOVA FUNÇÃO: Obter dia de vencimento de uma conta
  const getDiaVencimento = (conta: Conta) => {
    const match = conta.descricao?.match(/VENCIMENTO_(\d+)/);
    return match ? parseInt(match[1]) : null;
  };
  
  const contasVencendo: ContaVencendo[] = [];
  
  // 1. Faturas de cartão vencendo (abertas E fechadas)
  faturasEmAberto.forEach(fatura => {
    const dataVencimento = new Date(fatura.data_vencimento);
    // 🔖 CORREÇÃO: Zerar horário para comparar apenas datas
    dataVencimento.setHours(0, 0, 0, 0);
    
    if (dataVencimento >= hojeBrasil && dataVencimento <= proximos7Dias) {
      const cartao = cartoes.find(c => c.id === fatura.cartao_id);
      contasVencendo.push({
        id: fatura.id,
        titulo: `Fatura ${cartao?.nome || 'Cartão'}`,
        valor: fatura.valor_restante,
        dataVencimento,
        tipo: 'cartao',
        cartaoNome: cartao?.nome
      });
    }
  });
  
  // 2. Parcelas de carnê vencendo
  parcelasCarne.forEach(parcela => {
    const dataVencimento = new Date(parcela.data_vencimento);
    // 🔖 CORREÇÃO: Zerar horário para comparar apenas datas
    dataVencimento.setHours(0, 0, 0, 0);
    
    if (dataVencimento >= hojeBrasil && dataVencimento <= proximos7Dias && parcela.status === 'pendente') {
      const conta = contas.find(c => c.id === parcela.conta_id);
      contasVencendo.push({
        id: parcela.id,
        titulo: conta?.titulo || 'Carnê',
        valor: parcela.valor_parcela,
        dataVencimento,
        tipo: 'carne',
        parcelaInfo: `Parcela ${parcela.numero_parcela} de ${conta?.total_parcelas || 1}`
      });
    }
  });
  
  // 3. Contas fixas vencendo (baseado no dia do mês)
  contasFixas.forEach(conta => {
    const diaVencimento = getDiaVencimento(conta);
    if (diaVencimento) {
      const dataVencimento = new Date(hojeBrasil.getFullYear(), hojeBrasil.getMonth(), diaVencimento);
      
      // Se já passou do dia este mês, verificar próximo mês
      if (hojeBrasil.getDate() > diaVencimento) {
        dataVencimento.setMonth(dataVencimento.getMonth() + 1);
      }
      
      if (dataVencimento >= hojeBrasil && dataVencimento <= proximos7Dias) {
        contasVencendo.push({
          id: conta.id,
          titulo: conta.titulo,
          valor: conta.valor_total,
          dataVencimento,
          tipo: 'conta_fixa'
        });
      }
    }
  });
  
  // Ordenar por data de vencimento
  contasVencendo.sort((a, b) => a.dataVencimento.getTime() - b.dataVencimento.getTime());
  
  // 🔖 NOVO: Encontrar o próximo vencimento
  const proximoVencimento = contasVencendo.length > 0 ? contasVencendo[0] : null;
  


  // Total de faturas de cartão
  const totalFaturasCartao = cartoes.reduce((total, cartao) => total + (cartao.limite_credito || 0), 0);

  // Funções para contas variáveis
  const isContaVariavel = (conta: Conta) => {
    return conta.descricao?.includes('VARIA_MENSAL') || false;
  };

  const getDiaLembrete = (conta: Conta) => {
    const match = conta.descricao?.match(/LEMBRETE_(\d+)/);
    return match ? parseInt(match[1]) : null;
  };

  const isLembreteProximo = (conta: Conta) => {
    const diaLembrete = getDiaLembrete(conta);
    if (!diaLembrete) return false;
    
    const hoje = new Date().getDate();
    const proximoLembrete = new Date(new Date().getFullYear(), new Date().getMonth(), diaLembrete);
    
    // Se já passou do dia do lembrete este mês, verificar próximo mês
    if (hoje > diaLembrete) {
      proximoLembrete.setMonth(proximoLembrete.getMonth() + 1);
    }
    
    const diffDias = Math.ceil((proximoLembrete.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return diffDias <= 3; // Mostrar lembrete 3 dias antes
  };

  const getIconForConta = (titulo: string) => {
    const lowerTitulo = titulo.toLowerCase();
    if (lowerTitulo.includes('luz') || lowerTitulo.includes('energia')) return <Zap className="w-4 h-4 text-yellow-400" />;
    if (lowerTitulo.includes('água') || lowerTitulo.includes('agua')) return <Droplets className="w-4 h-4 text-blue-400" />;
    if (lowerTitulo.includes('gás') || lowerTitulo.includes('gas')) return <Flame className="w-4 h-4 text-orange-400" />;
    return <Home className="w-4 h-4 text-purple-400" />;
  };

  const contasVariaveis = contas.filter(isContaVariavel);
  const contasParaPreencher = contasVariaveis.filter(isLembreteProximo);

  // Calcular limite total disponível (soma de todos os cartões)
  const totalLimiteDisponivel = cartoes.reduce((total, cartao) => {
    return total + calcularLimiteDisponivel(cartao);
  }, 0);

  // Calcular limite total original (soma dos limites configurados)
  const totalLimiteOriginal = cartoes.reduce((total, cartao) => {
    return total + (cartao.limite_credito || 0);
  }, 0);

  // Calcular limite total usado
  const totalLimiteUsado = totalLimiteOriginal - totalLimiteDisponivel;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl text-white shadow-lg">Carregando...</p>
          {error && (
            <div className="mt-6 p-4 bg-red-900/40 border border-red-500/30 rounded-xl text-red-200 shadow-lg">
              <p className="font-semibold">{error}</p>
              <p className="text-sm text-red-300 mt-2">Se o problema persistir, verifique sua conexão ou tente recarregar a página.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
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
                  <h1 className="text-3xl font-bold text-white tracking-tight">Planejaê</h1>
                  <p className="text-blue-200 text-lg">Bem-vindo, {profile?.nome || user.email}!</p>
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
                  onClick={handleSignOut}
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
        {contasParaPreencher.length > 0 && (
          <Card className="mt-8 mb-8 bg-orange-500/20 border-orange-300 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-orange-200 mb-1">Despesas a Preencher</h3>
                    <p className="text-orange-100">
                      Você tem {contasParaPreencher.length} despesas variáveis para preencher
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="flex space-x-2">
                    {contasParaPreencher.slice(0, 3).map((conta) => (
                      <div
                        key={conta.id}
                        className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center border border-orange-400"
                      >
                        {getIconForConta(conta.titulo)}
                      </div>
                    ))}
                  </div>
                  <Button 
                    onClick={() => navigate('/contas-fixas')}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md"
                  >
                    Preencher
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8 mb-8">
          {/* Renda Mensal */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:shadow-xl hover:scale-110 transition-all duration-300 transition-all duration-300">
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
              <p className="text-2xl font-bold text-white">
                R$ {salarioMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          {/* Gastos Totais */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:shadow-xl hover:scale-110 transition-all duration-300 transition-all duration-300">
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
              <p className="text-2xl font-bold text-white">
                R$ {totalGastosMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          {/* Saldo Disponível */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:shadow-xl hover:scale-110 transition-all duration-300 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <PiggyBank className="w-6 h-6 text-blue-400" />
                </div>
                <Badge 
                  variant="secondary" 
                  className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                  {saldoDisponivel >= 0 ? "+" : ""}
                  {salarioMensal > 0 ? ((saldoDisponivel / salarioMensal) * 100).toFixed(0) : "0"}%
                </Badge>
              </div>
              <h3 className={`text-sm font-medium mb-1 ${saldoDisponivel >= 0 ? "text-blue-200" : "text-red-200"}`}>
                Saldo Disponível
              </h3>
              <p className={`text-2xl font-bold ${saldoDisponivel >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                R$ {saldoDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>


          {/* Próximo Vencimento */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:shadow-xl hover:scale-110 transition-all duration-300 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-orange-400" />
                </div>
                <Badge 
                  variant="secondary" 
                  className="bg-orange-500/20 text-orange-300 border-orange-500/30">
                    {proximoVencimento ? Math.ceil((proximoVencimento.dataVencimento.getTime() - hojeBrasil.getTime()) / (1000 * 60 * 60 * 24)) : 0}d
                  </Badge>
                  </div>
              <h3 className="text-orange-200 text-sm font-medium mb-1">Próximo Vencimento</h3>
                {proximoVencimento ? (
                  <>
                    <p className="text-lg font-bold text-white truncate">
                      {proximoVencimento.titulo}
                    </p>
                    <p className="text-orange-300 text-sm">
                      R$ {proximoVencimento.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-bold text-green-400">
                      Nenhum vencimento
                    </p>
                    <p className="text-orange-300 text-sm">
                      Tudo em dia! 🎉
                    </p>
                  </>
                )}
                  </CardContent>
                </Card>
              </div>

        {/* Seção Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contas Vencendo em Breve */}
          <div className="lg:col-span-2">
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:shadow-xl hover:scale-105 transition-all duration-300 transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold text-white flex items-center">
                    <Bell className="w-5 h-5 mr-2 text-blue-400" />
                    Despesas Vencendo em Breve
                  </CardTitle>
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                    {contasVencendo.length} contas
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {contasVencendo.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-blue-100">Nenhuma conta vencendo nos próximos 7 dias</p>
                  </div>
                ) : (
                  contasVencendo.map((conta) => {
                    const diasAteVencimento = Math.ceil((conta.dataVencimento.getTime() - hojeBrasil.getTime()) / (1000 * 60 * 60 * 24));
                    
                    const getUrgenciaColor = (dias: number) => {
                      if (dias <= 3) return "bg-red-500";
                      if (dias <= 5) return "bg-yellow-500";
                      return "bg-green-500";
                    };
                    
                    return (
                      <div
                        key={conta.id}
                        className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-200 group"
                      >
                        <div className="flex items-center space-x-4">
                          <div className={`w-3 h-3 rounded-full ${getUrgenciaColor(diasAteVencimento)} shadow-lg`}></div>
                          <div>
                            <h4 className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                              {conta.titulo}
                            </h4>
                            <p className="text-sm text-gray-400">
                              {conta.tipo === 'cartao' && 'Fatura de Cartão'}
                              {conta.tipo === 'carne' && conta.parcelaInfo}
                              {conta.tipo === 'conta_fixa' && 'Conta Fixa'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-white">R$ {conta.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          <p className="text-sm text-gray-400">
                            {diasAteVencimento === 0 ? 'Vence hoje' : 
                             diasAteVencimento === 1 ? 'Vence amanhã' : 
                             `${diasAteVencimento} dias`}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
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
                <Button 
                  className="w-full justify-start bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  size="lg"
                  onClick={() => navigate('/renda')}
                >
                  <TrendingUp className="w-5 h-5 mr-3" />
                  Gerenciar Renda
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </Button>
                <Button 
                  className="w-full justify-start bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  size="lg"
                  onClick={() => navigate('/cartoes')}
                >
                  <CreditCard className="w-5 h-5 mr-3" />
                  Gerenciar Cartões
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </Button>
                <Button 
                  className="w-full justify-start bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  size="lg"
                  onClick={() => navigate('/contas-fixas')}
                >
                  <Home className="w-5 h-5 mr-3" />
                  Gerenciar Despesas Fixas
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </Button>
                <Button 
                  className="w-full justify-start bg-gradient-to-r from-fuchsia-500 to-fuchsia-600 hover:from-fuchsia-600 hover:to-fuchsia-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  size="lg"
                  onClick={() => navigate('/nova-conta-parcelada')}
                >
                  <Plus className="w-5 h-5 mr-3" />
                  Nova Compra
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </Button>
                <Button 
                  className="w-full justify-start bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  size="lg"
                  onClick={() => navigate('/faturas')}
                >
                  <DollarSign className="w-5 h-5 mr-3" />
                  Controle Faturas
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </Button>
                <Button 
                  className="w-full justify-start bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  size="lg"
                  onClick={() => navigate('/categorias')}
                >
                  <Tag className="w-5 h-5 mr-3" />
                  Categorias
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </Button>
                <Button 
                  onClick={() => navigate('/gerenciar-categorias')}
                  className="w-full justify-start bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                  size="lg"
                >
                  <BarChart3 className="w-5 h-5 mr-3" />
                  Relatório de Categorias
                  <ChevronRight className="w-4 h-4 ml-auto" />
                </Button>
              </CardContent>
            </Card>

            {/* Alerta de Saldo Negativo */}
            {saldoDisponivel < 0 && (
              <Card className="mt-8 bg-red-900/20 border border-red-500/30 backdrop-blur-sm shadow-md">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-red-500/30 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-red-200 mb-1">⚠ Atenção: Saldo Negativo</h3>
                    <p className="text-red-300">Seus gastos estão superiores à sua renda. Revise seu orçamento.</p>
                  </div>
                </div>
              </CardContent>
            </Card>            
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
