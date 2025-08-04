import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export const useAuthSession = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Função para verificar e revalidar a sessão
  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('❌ Erro ao verificar sessão:', error);
        setUser(null);
        navigate('/auth');
        return null;
      }

      if (!session) {
        setUser(null);
        navigate('/auth');
        return null;
      }

      setUser(session.user);
      return session.user;
    } catch (error) {
      console.error('💥 Erro inesperado ao verificar sessão:', error);
      setUser(null);
      navigate('/auth');
      return null;
    }
  };

  // Configurar listener de mudanças de autenticação
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        navigate('/auth');
      } else if (session) {
        setUser(session.user);
      }
      
      setLoading(false);
    });

    // Verificar sessão inicial
    checkSession().finally(() => setLoading(false));

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Detectar quando a aba volta a ficar ativa e revalidar sessão
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        checkSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user]);

  // Detectar mudanças de foco da janela (backup do visibilitychange)
  useEffect(() => {
    const handleWindowFocus = () => {
      if (user) {
        checkSession();
      }
    };

    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [user]);

  return {
    user,
    loading,
    checkSession
  };
};
