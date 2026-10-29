#!/bin/bash

# ============================================================
# Iniciar PhotoRoom Background Remover
# Dê dois cliques neste arquivo para iniciar o servidor
# ============================================================

# Obtém o diretório onde este script está localizado
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=========================================="
echo "  PhotoRoom Background Remover"
echo "  Iniciando servidor..."
echo "=========================================="
echo ""

# Verifica se o Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ ERRO: Node.js não encontrado!"
    echo ""
    echo "Por favor, instale o Node.js em:"
    echo "https://nodejs.org/"
    echo ""
    read -p "Pressione Enter para fechar..."
    exit 1
fi

# Verifica se o package.json existe
if [ ! -f "package.json" ]; then
    echo "❌ ERRO: Arquivo package.json não encontrado!"
    echo "Certifique-se de que todos os arquivos do projeto estão na mesma pasta."
    echo ""
    read -p "Pressione Enter para fechar..."
    exit 1
fi

# Verifica se o .env existe
if [ ! -f ".env" ]; then
    echo "⚠️  AVISO: Arquivo .env não encontrado!"
    echo "A API key do PhotoRoom pode não estar configurada."
    echo ""
fi

# Verifica se node_modules existe, se não, instala dependências
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências (apenas na primeira vez)..."
    npm install
    echo ""
fi

# Abre o navegador após 2 segundos (em background)
(sleep 2 && open "http://localhost:3000") &

# Inicia o servidor
echo "🚀 Servidor rodando em: http://localhost:3000"
echo "📱 O navegador abrirá automaticamente..."
echo ""
echo "⚠️  NÃO FECHE ESTA JANELA enquanto estiver usando o sistema."
echo "   Para parar, pressione Ctrl+C ou feche esta janela."
echo "=========================================="
echo ""

npm start

# Se chegar aqui, o servidor parou
echo ""
echo "=========================================="
echo "  Servidor encerrado."
echo "=========================================="
read -p "Pressione Enter para fechar esta janela..."
