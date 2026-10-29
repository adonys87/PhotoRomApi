const express = require('express');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const jobs = new Map();

function getDataFormatada() {
    const agora = new Date();
    const formato = new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    }).formatToParts(agora);
    const p = Object.fromEntries(formato.map(item => [item.type, item.value]));
    return `${p.day}${p.month}${p.year}_${p.hour}${p.minute}${p.second}`;
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/selecionar-pasta', (req, res) => {
    // POSIX path of converte o alias do macOS para caminho Unix direto (/Users/...)
    const script = 'POSIX path of (choose folder with prompt "Selecione a pasta com as imagens")';
    const applescript = spawn('osascript', ['-e', script]);

    let stdout = '';
    let stderr = '';

    applescript.stdout.on('data', (data) => {
        stdout += data.toString();
    });

    applescript.stderr.on('data', (data) => {
        stderr += data.toString();
    });

    applescript.on('close', (code) => {
        console.log('[selecionar-pasta] code:', code, 'stdout:', stdout.trim(), 'stderr:', stderr.trim());
        if (code !== 0) {
            return res.status(400).json({ erro: 'Seleção cancelada pelo usuário ou erro ao abrir diálogo.' });
        }
        const caminho = stdout.trim();
        if (!caminho || caminho === '') {
            return res.status(400).json({ erro: 'Nenhum caminho retornado.' });
        }
        return res.json({ caminho: caminho });
    });
});
app.post('/processar', async (req, res) => {
    const { imagePath, format, bgColor } = req.body;
    if (!imagePath || !format || !bgColor) {
        return res.status(400).json({ erro: 'Parâmetros obrigatórios: imagePath, format, bgColor' });
    }
    if (!fs.existsSync(imagePath)) {
        return res.status(400).json({ erro: 'O caminho informado não existe.' });
    }
    const jobId = 'job_' + Date.now();
    const job = {
        id: jobId, status: 'processando', total: 0, processados: 0,
        sucessos: 0, erros: 0, detalhes: [], criadoEm: new Date()
    };
    jobs.set(jobId, job);
    processarImagens(jobId, imagePath, format, bgColor).catch(console.error);
    return res.json({ jobId });
});

app.get('/progresso/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);
    if (!job) {
        return res.status(404).json({ erro: 'Job não encontrado.' });
    }
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    res.write('data: ' + JSON.stringify(job) + '\n\n');
    const interval = setInterval(() => {
        const atual = jobs.get(jobId);
        if (!atual) { clearInterval(interval); res.end(); return; }
        res.write('data: ' + JSON.stringify(atual) + '\n\n');
        if (atual.status === 'concluido' || atual.status === 'erro') {
            clearInterval(interval);
            res.end();
        }
    }, 500);
    req.on('close', () => { clearInterval(interval); });
});

// Função auxiliar: percorre recursivamente a pasta e retorna lista de arquivos de imagem
// com { caminhoCompleto, caminhoRelativo, nomeArquivo, pastaOriginal }
function encontrarImagensRecursivo(dir, baseDir = dir) {
    const extensoesValidas = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.heic'];
    const resultados = [];

    const entradas = fs.readdirSync(dir, { withFileTypes: true });

    for (const entrada of entradas) {
        const caminhoCompleto = path.join(dir, entrada.name);

        if (entrada.isDirectory()) {
            // Recursão para subpastas
            resultados.push(...encontrarImagensRecursivo(caminhoCompleto, baseDir));
        } else if (entrada.isFile()) {
            const ext = path.extname(entrada.name).toLowerCase();
            if (extensoesValidas.includes(ext)) {
                const caminhoRelativo = path.relative(baseDir, caminhoCompleto);
                const pastaOriginal = path.dirname(caminhoCompleto);
                resultados.push({
                    caminhoCompleto,
                    caminhoRelativo,
                    nomeArquivo: entrada.name,
                    pastaOriginal
                });
            }
        }
    }

    return resultados;
}

async function processarImagens(jobId, imagePath, format, bgColor) {
    const job = jobs.get(jobId);
    const photoRoomApi = process.env.PHOTOROOM_API_KEY;
    if (!photoRoomApi) {
        job.status = 'erro';
        job.erro = 'PHOTOROOM_API_KEY não configurada no .env';
        return;
    }

    // Busca todas as imagens recursivamente
    const imagens = encontrarImagensRecursivo(imagePath);
    job.total = imagens.length;

    if (imagens.length === 0) {
        job.status = 'concluido';
        return;
    }

    let formatApi = format.toLowerCase();
    let bgColorApi = null;
    if (bgColor === 'branco') {
        bgColorApi = '#FFFFFF';
    } else if (bgColor === 'preto') {
        bgColorApi = '#000000';
    } else if (bgColor === 'nenhuma') {
        formatApi = 'png';
        bgColorApi = null;
    }

    for (let i = 0; i < imagens.length; i++) {
        const img = imagens[i];
        const nomeSemExt = path.parse(img.nomeArquivo).name;
        const dataHora = getDataFormatada();
        const nomeSaida = nomeSemExt + '_Editada_' + dataHora + '.' + formatApi;
        // Salva na MESMA pasta do arquivo original (pode ser subpasta)
        const caminhoSaida = path.join(img.pastaOriginal, nomeSaida);

        try {
            const arquivoBuffer = fs.readFileSync(img.caminhoCompleto);
            const formData = new FormData();
            formData.append('image_file', new Blob([arquivoBuffer]));
            formData.append('format', formatApi);
            if (bgColorApi) {
                formData.append('bg_color', bgColorApi);
            }
            const resposta = await fetch('https://sdk.photoroom.com/v1/segment', {
                method: 'POST',
                headers: { 'x-api-key': photoRoomApi },
                body: formData
            });
            if (!resposta.ok) {
                throw new Error('Erro na API: ' + resposta.status);
            }
            const arrayBuffer = await resposta.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            fs.writeFileSync(caminhoSaida, buffer);
            job.sucessos++;
            // Mostra o caminho relativo para o usuário saber onde está
            job.detalhes.push({ arquivo: img.caminhoRelativo, status: 'sucesso', saida: nomeSaida });
        } catch (erro) {
            job.erros++;
            job.detalhes.push({ arquivo: img.caminhoRelativo, status: 'erro', mensagem: erro.message });
        }
        job.processados = i + 1;
    }
    job.status = 'concluido';
}

app.listen(PORT, () => {
    console.log('Servidor rodando em http://localhost:' + PORT);
});

