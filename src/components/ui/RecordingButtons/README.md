# RecordingButtons Component

Componente para gravação de vídeo e criação de GIFs da simulação FaraLab.

## Funcionalidades

### Gravação de Vídeo 🎥
- Clique no botão "Vídeo" para iniciar a gravação
- Durante a gravação, o botão muda para "Parar" com um indicador vermelho piscante
- Clique em "Parar" para finalizar a gravação
- O vídeo é automaticamente baixado no formato WebM (codificado com VP9)
- Qualidade: 30 FPS, 2.5 Mbps

### Criação de GIF 📸
- Clique no botão "GIF" para iniciar a gravação
- Durante a gravação, o botão muda para "Parar" com um indicador vermelho piscante
- Clique em "Parar" para finalizar e processar o GIF
- Enquanto o GIF está sendo processado, aparece "Processando..." com um ícone de ampulheta
- O GIF é automaticamente baixado após o processamento
- Qualidade: 10 FPS, otimizado para tamanho de arquivo

## Detalhes Técnicos

### Gravação de Vídeo
- Usa a API `HTMLCanvasElement.captureStream()` para capturar o canvas
- Codec: VP9 (WebM)
- Taxa de bits: 2.5 Mbps
- Frame rate: 30 FPS

### Criação de GIF
- Captura frames do canvas a 10 FPS
- Usa a biblioteca `gif.js` para processamento
- Worker threads para não bloquear a UI durante o processamento
- Frames armazenados como ImageData durante a gravação

## Arquivos

- `RecordingButtons.jsx` - Componente principal com toda a lógica
- `RecordingButtons.css` - Estilos com animações de pulsação e indicadores
- `/public/gif.worker.js` - Worker script necessário para processar GIFs

## Dependências

```json
{
  "gif.js": "^0.2.0"
}
```

## Uso

Já está integrado na Toolbar do app. Basta usar os botões na barra superior.
