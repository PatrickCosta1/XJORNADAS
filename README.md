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

## Entrar por número mecanográfico (CSV)

Existe validação por ficheiro `presencas.csv`.

Fluxo:

- No botão **Entrar**, o aluno indica o nº mecanográfico
- A API valida no Excel (`POST /api/students/enrollment-lookup`)
- Se encontrado, preenche automaticamente `nome`
- O aluno avança para os passos de LinkedIn/CV e criação do QR

### Variáveis necessárias no backend (`server/.env`)

Definir variáveis abaixo:

- `ENROLLMENTS_CSV_PATH=../presencas.csv`
- `ENROLLMENTS_MECH_COLUMN=Número mecanográfico`
- `ENROLLMENTS_NAME_COLUMN=Nome Completo`
- `ENROLLMENTS_INSTITUTIONAL_EMAIL_DOMAIN=isep.ipp.pt`

> O endpoint infere automaticamente o email institucional no formato `numero@dominio` para manter compatibilidade com o registo atual.

## Deploy no Render (backend)

Se aparecer erro `ENOENT: ... /opt/render/project/src/package.json`, o serviço está a correr na pasta errada.

Configuração correta para a API:

- **Root Directory**: `server`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- Definir no Render todas as variáveis do `server/.env` (incluindo as de CSV)

Opcional: usar `render.yaml` deste repositório para criar o serviço já com `rootDir: server`.

## Segurança/Notas

- Email institucional validado por domínio (configurável)
- Upload só aceita PDF
- Palavra-passe de empresas guardada com hash `bcrypt`
- Registo de scan só é feito se empresa estiver autenticada
