import React, { useState, useRef, useCallback } from 'react'
import './RecordingButtons.css'

export default function RecordingButtons() {
  const [isRecordingVideo, setIsRecordingVideo] = useState(false)
  const [isRecordingGif, setIsRecordingGif] = useState(false)
  const [isProcessingGif, setIsProcessingGif] = useState(false)
  
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const gifMediaRecorderRef = useRef(null)
  const gifChunksRef = useRef([])

  // Função auxiliar para obter o canvas
  const getCanvas = useCallback(() => {
    return document.querySelector('canvas')
  }, [])

  // Iniciar gravação de vídeo
  const startVideoRecording = useCallback(async () => {
    const canvas = getCanvas()
    if (!canvas) {
      alert('Canvas não encontrado!')
      return
    }

    try {
      // Captura o stream do canvas
      const stream = canvas.captureStream(30) // 30 FPS
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2500000 // 2.5 Mbps
      })

      recordedChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
        const url = URL.createObjectURL(blob)
        
        // Cria link para download
        const a = document.createElement('a')
        a.href = url
        a.download = `faralab-recording-${Date.now()}.webm`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        
        // Limpa
        URL.revokeObjectURL(url)
        recordedChunksRef.current = []
      }

      mediaRecorder.start()
      mediaRecorderRef.current = mediaRecorder
      setIsRecordingVideo(true)
    } catch (err) {
      console.error('Erro ao iniciar gravação de vídeo:', err)
      alert('Erro ao iniciar gravação de vídeo. Verifique as permissões.')
    }
  }, [getCanvas])

  // Parar gravação de vídeo
  const stopVideoRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
      setIsRecordingVideo(false)
    }
  }, [])

  // Iniciar gravação de GIF (grava como vídeo)
  const startGifRecording = useCallback(async () => {
    const canvas = getCanvas()
    if (!canvas) {
      alert('Canvas não encontrado!')
      return
    }

    try {
      // Captura o stream do canvas a 15 FPS
      const stream = canvas.captureStream(15)
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 2000000 // 2 Mbps para melhor qualidade
      })

      gifChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          gifChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        setIsProcessingGif(true)
        try {
          const blob = new Blob(gifChunksRef.current, { type: 'video/webm' })
          
          // Converte vídeo para GIF usando canvas
          await convertVideoToGif(blob)
          
          gifChunksRef.current = []
        } catch (err) {
          console.error('Erro ao processar:', err)
          alert('Erro ao processar GIF: ' + err.message)
        }
        setIsProcessingGif(false)
      }

      mediaRecorder.start()
      gifMediaRecorderRef.current = mediaRecorder
      setIsRecordingGif(true)
    } catch (err) {
      console.error('Erro ao iniciar gravação:', err)
      alert('Erro ao iniciar gravação.')
    }
  }, [getCanvas])

  // Converte vídeo para GIF
  const convertVideoToGif = useCallback(async (videoBlob) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.src = URL.createObjectURL(videoBlob)
      video.muted = true
      
      video.onloadedmetadata = async () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        // Melhor resolução - limita a 1200px ao invés de 800
        const scale = Math.min(1, 1200 / Math.max(video.videoWidth, video.videoHeight))
        canvas.width = Math.floor(video.videoWidth * scale)
        canvas.height = Math.floor(video.videoHeight * scale)
        
        // Carrega gif.js
        if (!window.GIF) {
          const script = document.createElement('script')
          script.src = '/faralab-app/gif.js'
          await new Promise((res, rej) => {
            script.onload = res
            script.onerror = rej
            document.head.appendChild(script)
          })
        }
        
        const gif = new window.GIF({
          workers: 4, // Mais workers = mais rápido
          quality: 5, // Melhor qualidade (1-30, menor = melhor)
          width: canvas.width,
          height: canvas.height,
          workerScript: '/faralab-app/gif.worker.js'
        })
        
        // Captura frames do vídeo - mais FPS para melhor qualidade
        const duration = video.duration
        const fps = 15 // Aumentado de 10 para 15 FPS
        const frameCount = Math.min(Math.floor(duration * fps), 150) // Limita a 150 frames para não travar
        const frameDelay = 1 / fps
        
        let currentFrame = 0
        
        const captureFrame = () => {
          if (currentFrame >= frameCount) {
            gif.render()
            return
          }
          
          video.currentTime = currentFrame * frameDelay
        }
        
        video.onseeked = () => {
          // Renderização com melhor qualidade
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          gif.addFrame(canvas, { copy: true, delay: Math.round(1000 / fps) })
          currentFrame++
          captureFrame()
        }
        
        gif.on('finished', (blob) => {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `faralab-animation-${Date.now()}.gif`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
          URL.revokeObjectURL(video.src)
          resolve()
        })
        
        gif.on('error', reject)
        
        // Inicia captura
        video.play().then(() => {
          video.pause()
          captureFrame()
        })
      }
      
      video.onerror = reject
    })
  }, [])

  // Parar gravação de GIF
  const stopGifRecording = useCallback(() => {
    if (gifMediaRecorderRef.current && gifMediaRecorderRef.current.state !== 'inactive') {
      gifMediaRecorderRef.current.stop()
      gifMediaRecorderRef.current = null
      setIsRecordingGif(false)
    }
  }, [])

  return (
    <div className="recording-buttons">
      {/* Botão de Vídeo */}
      <button
        className={`rec-btn ${isRecordingVideo ? 'recording' : ''}`}
        onClick={isRecordingVideo ? stopVideoRecording : startVideoRecording}
        title={isRecordingVideo ? 'Parar gravação de vídeo' : 'Gravar vídeo'}
      >
        <span className="rec-icon">{isRecordingVideo ? '⏹' : '🎥'}</span>
        <span className="rec-label">
          {isRecordingVideo ? 'Parar' : 'Vídeo'}
        </span>
        {isRecordingVideo && <span className="rec-indicator" />}
      </button>

      {/* Botão de GIF */}
      <button
        className={`rec-btn ${isRecordingGif ? 'recording' : ''} ${isProcessingGif ? 'processing' : ''}`}
        onClick={isRecordingGif ? stopGifRecording : startGifRecording}
        disabled={isProcessingGif}
        title={
          isProcessingGif
            ? 'Processando GIF...'
            : isRecordingGif
            ? 'Parar gravação de GIF'
            : 'Gravar GIF'
        }
      >
        <span className="rec-icon">
          {isProcessingGif ? '⏳' : isRecordingGif ? '⏹' : '📸'}
        </span>
        <span className="rec-label">
          {isProcessingGif ? 'Processando...' : isRecordingGif ? 'Parar' : 'GIF'}
        </span>
        {isRecordingGif && <span className="rec-indicator" />}
      </button>
    </div>
  )
}
