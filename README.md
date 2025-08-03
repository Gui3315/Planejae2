# Planejaê

Este projeto é um sistema completo para controle financeiro pessoal, desenvolvido em React + TypeScript e integrado ao Supabase. Ele permite ao usuário gerenciar cartões de crédito, despesas fixas, compras parceladas, categorias de despesas, rendas e faturas, tudo em um painel interativo e fácil de usar.

## Funcionalidades

- **Dashboard:** Resumo financeiro do mês, saldo disponível, gastos, vencimentos próximos e ações rápidas.
- **Autenticação:** Login, cadastro e recuperação de senha via Supabase.
- **Cartões de Crédito:** Cadastro, edição, exclusão e controle de limite, vencimento e faturas.
- **Despesas Fixas:** Gerenciamento de despesas recorrentes e carnês.
- **Compras Parceladas:** Cadastro de despesas parceladas, cálculo automático de parcelas e vinculação a cartões.
- **Categorias:** Criação, edição, exclusão e relatório detalhado de gastos por categoria.
- **Rendas:** Cadastro e controle de fontes de renda mensais.
- **Faturas:** Controle de faturas de cartão, pagamento e acompanhamento de status.
- **Relatórios:** Estatísticas e gráficos de gastos por categoria, mês, cartão, etc.
- **Alertas:** Notificações de despesas e faturas a vencer.

## Tecnologias Utilizadas

- React
- TypeScript
- Vite
- Supabase (autenticação e banco de dados)
- Lucide React (ícones)
- CSS Modules

## Como Executar

1. **Instale as dependências:**
   ```bash
   npm install
   ```
2. **Configure o Supabase:**
   - Crie um projeto no [Supabase](https://supabase.com/).
   - Configure as variáveis de ambiente com sua URL e chave pública do Supabase.
3. **Inicie o projeto:**
   ```bash
   npm run dev
   ```
4. **Acesse no navegador:**
   - Normalmente em `http://localhost:5173`

## Estrutura de Pastas

- `src/pages/` — Páginas principais do sistema (dashboard, cartões, despesas, faturas, etc.)
- `src/components/` — Componentes reutilizáveis de UI
- `src/hooks/` — Hooks customizados
- `src/integrations/supabase/` — Integração com Supabase
- `src/lib/` — Funções utilitárias
- `src/styles/` — Estilos globais

## Contribuição

1. Fork este repositório
2. Crie uma branch: `git checkout -b minha-feature`
3. Faça suas alterações e commit: `git commit -m "Minha feature"`
4. Envie sua branch: `git push origin minha-feature`
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT.

## Screenshots

Veja abaixo exemplos visuais do sistema:

> Adicione aqui suas imagens de tela. Exemplo:

![Dashboard](./screenshots/dashboard.png)
![Cadastro de Despesa](./screenshots/cadastro-despesa.png)
![Relatório de Categorias](./screenshots/relatorio-categorias.png)

---

**Pocket Finances Hub** — Controle suas finanças de forma simples, visual e eficiente!
