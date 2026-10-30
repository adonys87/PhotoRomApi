const sharp = require('sharp');

/**
 * Redimensiona proporcionalmente pelo lado maior, como o script Python
 * reduzir_maior_proporcao. Não aumenta imagem cuja largura e altura já
 * sejam menores que o valor base.
 */
async function reduzirMaiorProporcao(buffer, valorBase) {
    const image = sharp(buffer);
    const meta = await image.metadata();
    const largura = meta.width;
    const altura = meta.height;

    if (!largura || !altura) {
        throw new Error('Não foi possível ler as dimensões da imagem.');
    }

    if (largura < valorBase && altura < valorBase) {
        const aviso = `não redimensionada: ${largura}x${altura} menor que ${valorBase}`;
        console.warn(aviso);
        return {
            buffer,
            width: largura,
            height: altura,
            redimensionado: false,
            aviso
        };
    }

    const proporcao = altura >= largura
        ? valorBase / altura
        : valorBase / largura;

    const novaLargura = Math.round(largura * proporcao);
    const novaAltura = Math.round(altura * proporcao);

    let pipeline = sharp(buffer).resize(novaLargura, novaAltura, {
        kernel: sharp.kernel.lanczos3
    });

    if (meta.format === 'jpeg' || meta.format === 'jpg') {
        pipeline = pipeline.jpeg();
    } else if (meta.format === 'png') {
        pipeline = pipeline.png();
    } else if (meta.format === 'webp') {
        pipeline = pipeline.webp();
    }

    const saida = await pipeline.toBuffer();
    return {
        buffer: saida,
        width: novaLargura,
        height: novaAltura,
        redimensionado: true,
        aviso: null
    };
}

module.exports = { reduzirMaiorProporcao };
