import { useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '../store/gameStore'
import type { GameState } from '../types'

const WS_URL = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000/ws'

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>()
  const { setGameState, setConnected } = useGameStore()

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      console.log('[WS] Connected')
    }

    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data as string)
        // The backend sends the full GameState JSON directly each tick
        if (data.tick !== undefined) {
          setGameState(data as GameState)
        }
      } catch (e) {
        console.warn('[WS] Parse error', e)
      }
    }

    ws.onclose = () => {
      setConnected(false)
      console.log('[WS] Disconnected — reconnecting in 2s')
      reconnectTimer.current = setTimeout(connect, 2000)
    }

    ws.onerror = (e) => {
      console.error('[WS] Error', e)
      ws.close()
    }
  }, [setConnected, setGameState])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [connect])

  const send = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  return { send }
}
