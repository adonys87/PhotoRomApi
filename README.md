# PhotoRoom Background Remover

Ferramenta local para **remover o fundo de várias imagens de uma vez** usando a [API do PhotoRoom](https://www.photoroom.com/). Você escolhe uma pasta no Mac, define formato e cor de fundo, e o servidor processa todas as imagens (incluindo subpastas).

## O que faz

- Percorre a pasta selecionada **recursivamente**
- Envia cada imagem para a API de segmentação do PhotoRoom (`/v1/segment`)
- Opcionalmente **redimensiona** o resultado com um valor base (inteiro)
- Salva o resultado **na mesma pasta do arquivo original**
- Mostra progresso em tempo real no navegador (sucessos e erros)

Formatos aceitos na entrada: `.jpg`, `.jpeg`, `.png`, `.webp`, `.bmp`, `.heic`.

## Requisitos

- **macOS** (o seletor de pasta usa AppleScript)
- [Node.js](https://nodejs.org/) (versão recente, com suporte a `--env-file`)
- Chave da API do PhotoRoom (`PHOTOROOM_API_KEY`)

## Configuração

1. Instale as dependências:

```bash
npm install
```

2. Copie o arquivo de exemplo e preencha a chave:

```bash
cp .env.example .env
```

No `.env`:

```
PHOTOROOM_API_KEY=sua_chave_aqui
```

Não versionar o `.env` — ele já está no `.gitignore`.

## Como usar

### Atalho no Mac

Dê dois cliques em `Iniciar.command`. O script instala dependências se necessário, sobe o servidor e abre o navegador em `http://localhost:3000`.

Mantenha a janela do Terminal aberta enquanto usar a ferramenta. Para encerrar, use `Ctrl+C` ou feche a janela.

### Pelo terminal

```bash
npm start
```

Para desenvolvimento (reinício automático):

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

### Na interface

1. Clique em **Selecionar Pasta** e escolha a pasta com as imagens.
2. Escolha o **formato de saída** (JPG ou PNG).
3. Escolha a **cor de fundo**:
   - Branco
   - Preto
   - Nenhuma (transparente; o formato passa a PNG)
4. (Opcional) Preencha **Valor Base para Redimensionar** com um inteiro. O lado maior da imagem sem fundo vira esse valor e o outro escala na proporção (`2400x1200` + `1200` → `1200x600`). Campo vazio mantém o tamanho que a PhotoRoom devolve. Se largura e altura já forem menores que o valor, a imagem **não é aumentada** e o log mostra um aviso.
5. Clique em **Iniciar Processamento** e acompanhe a lista.

## Arquivos gerados

Cada imagem editada é salva ao lado da original, com o padrão:

```
nomeoriginal_Editada_ddmmyyyy_hhMMss.ext
```

Exemplo: `produto_Editada_29102026_201530.jpg`

As imagens originais não são alteradas.

## Estrutura

| Arquivo | Função |
| --- | --- |
| `server.js` | Servidor Express: seleção de pasta, processamento em lote e progresso (SSE) |
| `redimensionar.js` | Resize proporcional do buffer após a PhotoRoom (`sharp`) |
| `public/index.html` | Interface no navegador |
| `Iniciar.command` | Atalho para subir o servidor no Mac |
| `.env` | Chave da API (local, não vai para o Git) |

`photoroomapi.js` é um script de teste pontual da API; o fluxo principal da aplicação é o `server.js`.

## Observações

- O seletor de pasta só funciona no Mac, porque usa `osascript`.
- Cada imagem gera uma chamada à API do PhotoRoom; o consumo de créditos depende do plano da conta.
- Sem `PHOTOROOM_API_KEY` no `.env`, o job falha com erro de configuração.
