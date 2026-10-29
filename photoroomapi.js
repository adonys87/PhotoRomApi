const fs = require('fs');
const path = require('path');

const outputFolder = process.env.OUTPUT_FOLDER
const photoRoomApi = process.env.PHOTOROOM_API_KEY

function getDataFormatada() {
    const agora = new Date();

    // Formata a data e hora usando o padrão brasileiro (24h)
    const formato = new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false
    }).formatToParts(agora);

    // Mapeia os componentes e monta a string ddmmyyyy_hhMMss
    const p = Object.fromEntries(formato.map(item => [item.type, item.value]));
    const dataFormatada = `${p.day}${p.month}${p.year}_${p.hour}${p.minute}${p.second}`;
    return dataFormatada
}


async function removerFundoNoNode(filenameInput, filenameOut) {
    // No Node, você precisa criar o FormData de forma ligeiramente diferente (usando o módulo form-data se < Node 18)
    const formData = new FormData();

    // Lê o arquivo local do seu computador para enviar
    const caminhoDaImagemOriginal = path.join(__dirname,filenameInput);
    const arquivoBuffer = fs.readFileSync(caminhoDaImagemOriginal);
    formData.append('image_file', new Blob([arquivoBuffer]));
    formData.append('format','jpg')
    formData.append('bg_color','#FFFFFF')

    try {
        const resposta = await fetch('https://sdk.photoroom.com/v1/segment', {
            method: 'POST',
            headers: {
                'x-api-key': photoRoomApi
            },
            body: formData
        });

        if (!resposta.ok) throw new Error(`Erro na API: ${resposta.status}`);

        const arrayBuffer = await resposta.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // DEFINA AQUI O LOCAL EXATO DO SEU PC
        const localEspecifico = `${outputFolder}/${filenameOut}_${getDataFormatada()}.jpg`;
        // No Mac/Linux use algo como: '/Users/nome/Downloads/resultado.png'

        // Salva diretamente no caminho sem intervenção do usuário
        fs.writeFileSync(localEspecifico, buffer);
        console.log(`Imagem salva direto em: ${localEspecifico}`);

    } catch (erro) {
        console.error('Falha no processo do Node:', erro);
    }
}