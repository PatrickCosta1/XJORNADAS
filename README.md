# Jornadas26 - Plataforma de QR para Alunos e Empresas

Plataforma full-stack para as Jornadas de Sistemas:

- Aluno preenche formulário (nome, email institucional, LinkedIn opcional, CV PDF opcional)
- Sistema cria perfil e gera QR Code
- QR abre página pública do aluno
- Empresas autenticadas podem registar leitura ao abrir o perfil
- Aluno tem uma página inicial para ver quais empresas leram o seu QR

## Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Base de dados: MongoDB (com ficheiro PDF guardado no próprio documento MongoDB)

## Estrutura

- client/: frontend React
- server/: API Express + MongoDB

## Como executar

### 1) Backend

1. Ir para `server`
2. Copiar `.env.example` para `.env`
3. Ajustar variáveis
4. Instalar dependências e arrancar

```bash
cd server
npm install
npm run dev
```

API por defeito: `http://localhost:4000`

### 2) Frontend

1. Ir para `client`
2. Criar `.env` com `VITE_API_URL=http://localhost:4000/api`
3. Instalar dependências e arrancar

```bash
cd client
npm install
npm run dev
```

Frontend por defeito: `http://localhost:5173`

## Provisionar empresas (pré-criação de contas)

Existe endpoint protegido por chave de setup:

- `POST /api/company/provision`
- Header obrigatório: `x-setup-key: <ADMIN_SETUP_KEY>`
- Body: `{ "name": "Empresa X", "email": "hr@empresa.pt", "password": "SenhaForte123" }`

## Fluxo do aluno

1. Abrir `/student/novo`
2. Preencher formulário
3. Recebe link único da área pessoal (com token) e QR
4. Pode acompanhar leituras em `/student/:slug/dashboard?token=...`

## Segurança/Notas

- Email institucional validado por domínio (configurável)
- Upload só aceita PDF
- Palavra-passe de empresas guardada com hash `bcrypt`
- Registo de scan só é feito se empresa estiver autenticada
