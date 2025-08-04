import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuthSession } from '@/hooks/useAuthSession';
import { 
  DollarSign, 
  Plus, 
  Edit, 
  Trash2, 
  ArrowLeft,
  TrendingUp,
  Power,
  PowerOff
} from 'lucide-react';

// Interface para tipo de renda
interface TipoRenda {
  id: string;
  nome: string;
  valor: number;
  descricao?: string;
  ativo: boolean;
  created_at: string;
  user_id: string;
}

// Interface para dados do formulário
interface FormData {
  nome: string;
  valor: string;
  descricao: string;
}

const Renda = () => {
  const { user, loading } = useAuthSession();
  const [tiposRenda, setTiposRenda] = useState<TipoRenda[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTipoRenda, setEditingTipoRenda] = useState<TipoRenda | null>(null);
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    valor: '',
    descricao: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const navigate = useNavigate();

  // Carregar tipos de renda quando o usuário estiver disponível
  useEffect(() => {
    if (user) {
      carregarTiposRenda(user.id);
    }
  }, [user]);

  // Função para carregar tipos de renda do usuário
  const carregarTiposRenda = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('tipos_renda' as any)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao carregar tipos de renda:', error);
        return;
      }
      
      setTiposRenda(data as unknown as TipoRenda[] || []);
    } catch (error) {
      console.error('Erro ao carregar tipos de renda:', error);
    }
  };

  // Função para abrir modal de criação/edição
  const abrirModal = (tipoRenda?: TipoRenda) => {
    if (tipoRenda) {
      setEditingTipoRenda(tipoRenda);
      setFormData({
        nome: tipoRenda.nome,
        valor: tipoRenda.valor.toString(),
        descricao: tipoRenda.descricao || ''
      });
    } else {
      setEditingTipoRenda(null);
      setFormData({
        nome: '',
        valor: '',
        descricao: ''
      });
    }
    setModalOpen(true);
  };

  // Função para exibir mensagens de feedback
  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // Função para salvar tipo de renda (criar ou editar)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      showMessage('error', 'Nome do tipo de renda é obrigatório');
      return;
    }

    if (!formData.valor || parseFloat(formData.valor) <= 0) {
      showMessage('error', 'Valor deve ser maior que zero');
      return;
    }

    setSubmitting(true);
    try {
      const tipoRendaData = {
        nome: formData.nome.trim(),
        valor: parseFloat(formData.valor),
        descricao: formData.descricao.trim() || null,
        ativo: true,
        user_id: user!.id
      };

      if (editingTipoRenda) {
        // Atualizar tipo de renda existente
        const { data, error } = await supabase
          .from('tipos_renda' as any)
          .update(tipoRendaData)
          .eq('id', editingTipoRenda.id)
          .eq('user_id', user!.id)
          .select();

        if (error) throw error;

        showMessage('success', 'Tipo de renda atualizado com sucesso!');
      } else {
        // Criar novo tipo de renda
        const { data, error } = await supabase
          .from('tipos_renda' as any)
          .insert([tipoRendaData])
          .select();

        if (error) throw error;

        showMessage('success', 'Tipo de renda criado com sucesso!');
      }

      setModalOpen(false);
      if (user) await carregarTiposRenda(user.id);
      
    } catch (error) {
      console.error('Erro ao salvar tipo de renda:', error);
      showMessage('error', `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Função para excluir tipo de renda
  const excluirTipoRenda = async (tipoRenda: TipoRenda) => {
    if (!confirm(`Tem certeza que deseja excluir o tipo de renda "${tipoRenda.nome}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tipos_renda' as any)
        .delete()
        .eq('id', tipoRenda.id)
        .eq('user_id', user!.id);

      if (error) throw error;

      showMessage('success', 'Tipo de renda excluído com sucesso!');

      if (user) await carregarTiposRenda(user.id);
    } catch (error) {
      console.error('Erro ao excluir tipo de renda:', error);
      showMessage('error', 'Não foi possível excluir o tipo de renda');
    }
  };

  // Função para ativar/desativar tipo de renda
  const toggleAtivo = async (tipoRenda: TipoRenda) => {
    try {
      const { error } = await supabase
        .from('tipos_renda' as any)
        .update({ ativo: !tipoRenda.ativo })
        .eq('id', tipoRenda.id)
        .eq('user_id', user!.id);

      if (error) throw error;

      showMessage('success', `Tipo de renda ${tipoRenda.ativo ? 'desativado' : 'ativado'} com sucesso!`);

      if (user) await carregarTiposRenda(user.id);
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      showMessage('error', 'Não foi possível alterar o status do tipo de renda');
    }
  };

  // Função para calcular renda total
  const calcularRendaTotal = () => {
    return tiposRenda
      .filter(tipo => tipo.ativo)
      .reduce((total, tipo) => total + tipo.valor, 0);
  };

  // Tela de carregamento
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-xl text-white shadow-lg">Carregando tipos de renda...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const tiposAtivos = tiposRenda.filter(t => t.ativo);
  const rendaTotal = calcularRendaTotal();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header Principal */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm"></div>
        <div className="relative px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
              <Button
                  variant="outline"
                  size="icon"
                  className="border-white/20 text-white hover:bg-white/10 transition-all duration-200 bg-transparent"
                  onClick={() => navigate("/")}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white tracking-tight">Gestão de Renda</h1>
                  <p className="text-blue-200 text-lg">Gerencie suas fontes de renda mensal</p>
                </div>
              </div>
              <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Nova Fonte de Renda
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white/95 backdrop-blur-sm border-emerald-300">
                  <DialogHeader>
                    <DialogTitle className="text-gray-900">
                      {editingTipoRenda ? 'Editar Tipo de Renda' : 'Novo Tipo de Renda'}
                    </DialogTitle>
                    <DialogDescription className="text-gray-600">
                      {editingTipoRenda ? 'Edite as informações do tipo de renda' : 'Crie um novo tipo de renda para sua família'}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome" className="text-gray-700 font-medium">
                        Nome do Tipo de Renda
                      </Label>
                      <Input
                        id="nome"
                        type="text"
                        value={formData.nome}
                        onChange={(e) => setFormData({...formData, nome: e.target.value})}
                        placeholder="Ex: Salário Principal, Freelance, Investimentos..."
                        className="border-emerald-300 focus:border-emerald-500"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="valor" className="text-gray-700 font-medium">
                        Valor Mensal (R$)
                      </Label>
                      <Input
                        id="valor"
                        type="number"
                        step="0.01"
                        value={formData.valor}
                        onChange={(e) => setFormData({...formData, valor: e.target.value})}
                        placeholder="0,00"
                        className="border-emerald-300 focus:border-emerald-500"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="descricao" className="text-gray-700 font-medium">
                        Descrição (opcional)
                      </Label>
                      <Textarea
                        id="descricao"
                        value={formData.descricao}
                        onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                        placeholder="Detalhes sobre esta fonte de renda..."
                        className="border-emerald-300 focus:border-emerald-500"
                        rows={3}
                      />
                    </div>

                    <DialogFooter>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setModalOpen(false)}
                        className="bg-white/5 border-black/10 backdrop-blur-sm hover:shadow-xl hover:scale-105 transition-all duration-300">
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={submitting}
                        className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white"
                      >
                        {submitting ? 'Salvando...' : (editingTipoRenda ? 'Atualizar' : 'Criar')}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 pb-8">
        {/* Mensagem de feedback */}
        {message && (
          <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${
            message.type === 'success' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            {message.text}
          </div>
        )}

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 mb-8">
          {/* Renda Total Mensal */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:shadow-xl hover:scale-110 transition-all duration-300 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-emerald-400" />
                </div>
                <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                  +100%
                </Badge>
              </div>
              <h3 className="text-emerald-200 text-sm font-medium mb-1">Renda Total Mensal</h3>
              <p className="text-2xl font-bold text-white">
                R$ {rendaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          {/* Total de Tipos */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:shadow-xl hover:scale-105 transition-all duration-300 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-400" />
                </div>
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                  {tiposRenda.length}
                </Badge>
              </div>
              <h3 className="text-blue-200 text-sm font-medium mb-1">Total de Tipos de Renda</h3>
              <p className="text-2xl font-bold text-white">{tiposRenda.length}</p>
            </CardContent>
          </Card>

          {/* Tipos Ativos */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm hover:shadow-xl hover:scale-105 transition-all duration-300 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <Power className="w-6 h-6 text-purple-400" />
                </div>
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-300 border-purple-500/30">
                  {tiposAtivos.length}
                </Badge>
              </div>
              <h3 className="text-purple-200 text-sm font-medium mb-1">Tipos de Renda Ativos</h3>
              <p className="text-2xl font-bold text-white">{tiposAtivos.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de Tipos de Renda */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tiposRenda.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <DollarSign className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Nenhum tipo de renda cadastrado</h3>
              <p className="text-blue-100 mb-4">
                Comece adicionando suas fontes de renda mensal
              </p>
              <Button 
                onClick={() => abrirModal()}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Tipo de Renda
              </Button>
            </div>
          ) : (
            tiposRenda.map((tipoRenda) => (
              <Card key={tipoRenda.id} className={`backdrop-blur-sm border-2 shadow-xl transition-all duration-300 hover:scale-105 ${
                tipoRenda.ativo 
                  ? 'bg-white/5 border-white/10 hover:border-emerald-300' 
                  : 'bg-gray-500/10 border-gray-400/50'
              }`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className={`text-lg ${tipoRenda.ativo ? 'text-white' : 'text-gray-400'}`}>
                        {tipoRenda.nome}
                      </CardTitle>
                      <CardDescription className={tipoRenda.ativo ? 'text-blue-100' : 'text-gray-500'}>
                        Tipo de Renda
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={tipoRenda.ativo}
                        onCheckedChange={() => toggleAtivo(tipoRenda)}
                        className="data-[state=checked]:bg-emerald-600"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => abrirModal(tipoRenda)}
                        className="border-emerald-300 text-emerald-300 hover:bg-emerald-300 hover:text-emerald-900"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => excluirTipoRenda(tipoRenda)}
                        className="border-red-300 text-red-300 hover:bg-red-300 hover:text-red-900"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className={`text-sm ${tipoRenda.ativo ? 'text-blue-100' : 'text-gray-500'}`}>
                      Valor Mensal:
                    </span>
                    <span className={`font-semibold ${tipoRenda.ativo ? 'text-green-400' : 'text-gray-400'}`}>
                      R$ {tipoRenda.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {tipoRenda.descricao && (
                    <div className="pt-2">
                      <p className={`text-sm ${tipoRenda.ativo ? 'text-blue-100' : 'text-gray-500'}`}>
                        {tipoRenda.descricao}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pt-2">
                    {tipoRenda.ativo ? (
                      <>
                        <Power className="w-4 h-4 text-green-400" />
                        <span className="text-sm text-green-400">Ativo</span>
                      </>
                    ) : (
                      <>
                        <PowerOff className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-400">Inativo</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Renda; 