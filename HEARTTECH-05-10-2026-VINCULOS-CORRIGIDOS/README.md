# HEART-TECH

Sistema Inteligente de Monitoramento para Pessoas com Deficiência Cognitiva.

O Heart-Tech combina uma aplicação web responsiva, APIs REST, PostgreSQL e uma futura pulseira com ESP32 + GPS + GSM. O objetivo do projeto é permitir acompanhamento remoto, localização, geofence, rotina, metas, mensagens e emergência.

## Stack

- Next.js 16.3.3
- React 19
- PostgreSQL
- bcryptjs
- Leaflet / React Leaflet
- JavaScript / JSX

## Estrutura funcional

```text
app/
├── auth/                 # login e cadastro
├── landing/              # painel principal por perfil
├── components/           # componentes reutilizáveis, incluindo mapa
├── lib/                  # conexão PostgreSQL e autenticação
└── api/                  # backend REST
    ├── auth/             # login, cadastro, sessão e logout
    ├── users/            # administração de usuários
    ├── portadores/       # dados e configuração dos assistidos
    ├── localizacoes/     # localização pelo navegador
    ├── location/         # entrada da futura pulseira
    ├── rotinas/
    ├── metas/
    ├── mensagens/
    └── emergencias/

scripts/
├── criar-banco.mjs      # cria/atualiza o schema
├── migrar-usuarios.mjs  # migra usuários com hash bcrypt
├── migrar-dados.mjs     # migra portadores, rotinas, metas etc.
└── proteger-senhas.mjs  # protege senhas legadas
```

## Configuração

1. Crie um banco PostgreSQL chamado `hearttech`.
2. No PowerShell, na pasta do projeto, execute `Copy-Item .env.example .env.local`.
3. Abra `.env.local` e preencha `DATABASE_URL`, `HEARTTECH_SESSION_SECRET`, `HEARTTECH_ADMIN_PASSWORD` e `HEARTTECH_DEVICE_TOKEN`.
4. Instale as dependências com `npm install`.
5. Verifique a configuração com `npm run doctor`.
6. Prepare/migre o banco em uma única etapa:

```bash
npm run db:migrate
```

Os scripts do banco carregam automaticamente o `.env.local` em Node 22+.

Esse comando cria/atualiza as tabelas, migra usuários e dados legados e protege senhas antigas com bcrypt.

Depois, rode:

```bash
npm run dev
```

Aplicação: `http://localhost:3000`

## Autenticação

A versão atual utiliza sessão assinada em cookie `HttpOnly`. O `localStorage` não é mais a fonte de verdade da autenticação.

O auto-cadastro público aceita somente:

- acompanhante
- portador

A criação do administrador é controlada pela configuração do banco.

## Localização da pulseira

O endpoint `/api/location` segue o protocolo definido para a Sprint 1:

```json
{
  "device_id": "HT001",
  "latitude": -20.123456,
  "longitude": -51.123456,
  "battery": 78,
  "accuracy": 4.2,
  "timestamp": "2026-04-15T14:32:10Z"
}
```

A pulseira deverá enviar o header:

```text
x-device-token: <HEARTTECH_DEVICE_TOKEN>
```

O `device_id` é vinculado ao portador pela coluna `portadores.device_id`.

## Banco oficial

A direção da arquitetura é:

```text
Interface → API → PostgreSQL
```

O arquivo `data/db.json` permanece apenas como legado de demonstração/migração e não deve ser usado como banco de produção.

## Validação

Antes da entrega final serão validados:

- autenticação e autorização por perfil;
- CRUD de rotinas e metas;
- mensagens e emergências;
- localização e histórico;
- geofence;
- integração com protocolo da pulseira;
- responsividade mobile;
- testes de campo e evidências técnicas;
- deploy final.

## Observação de segurança

Nunca publique `.env.local`, tokens, senhas ou credenciais de banco. Em produção, use uma chave `HEARTTECH_SESSION_SECRET` longa e aleatória e uma senha administrativa forte.
## Relação acompanhante x portador

A versão atual utiliza PostgreSQL como fonte oficial para os vínculos. Um portador não é associado automaticamente a nenhum acompanhante. O vínculo é criado somente quando o acompanhante executa a ação **Conectar**.

A relação é armazenada na tabela `acompanhante_portador` e segue estas regras:

- administrador: visualiza todos os portadores;
- acompanhante: visualiza somente os portadores explicitamente vinculados;
- portador: visualiza somente o próprio cadastro e seu acompanhante, quando existir;
- exclusão de um usuário portador remove automaticamente seu perfil, localização, rotinas, metas, mensagens, emergências e vínculos por `ON DELETE CASCADE`.

Os arquivos `data/db.json` e `localStorage` não são mais usados como fonte de verdade para portadores ou vínculos.

