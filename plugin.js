import { host, useValue } from '@hermes/plugin-sdk'
import { jsx, jsxs } from 'react/jsx-runtime'
import { useEffect, useMemo, useRef, useState } from 'react'

const ID = 'gomoku-while-working'
const SIZE = 15
const DIRECTIONS = [[1, 0], [0, 1], [1, 1], [1, -1]]

function emptyBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
}

function isWin(board, x, y, player) {
  return DIRECTIONS.some(([dx, dy]) => {
    let count = 1
    for (const sign of [-1, 1]) {
      for (let step = 1; step < 5; step++) {
        const xx = x + dx * step * sign
        const yy = y + dy * step * sign
        if (xx < 0 || xx >= SIZE || yy < 0 || yy >= SIZE || board[yy][xx] !== player) break
        count++
      }
    }
    return count >= 5
  })
}

function evaluate(board, x, y, player) {
  let total = 0
  for (const [dx, dy] of DIRECTIONS) {
    let count = 1
    let open = 0
    for (const sign of [-1, 1]) {
      for (let step = 1; step < 5; step++) {
        const xx = x + dx * step * sign
        const yy = y + dy * step * sign
        if (xx < 0 || xx >= SIZE || yy < 0 || yy >= SIZE) break
        if (board[yy][xx] === player) count++
        else {
          if (board[yy][xx] === 0) open++
          break
        }
      }
    }
    total += count >= 5 ? 1000000 : count === 4 ? (open === 2 ? 30000 : 6000) : count === 3 ? (open === 2 ? 1800 : 180) : count === 2 ? (open === 2 ? 90 : 12) : open
  }
  return total
}

function chooseBotMove(board) {
  let best = -Infinity
  let choice = null
  const hasStone = board.some(row => row.some(Boolean))
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (board[y][x]) continue
      if (hasStone) {
        let nearby = false
        for (let yy = Math.max(0, y - 2); yy <= Math.min(SIZE - 1, y + 2) && !nearby; yy++) {
          for (let xx = Math.max(0, x - 2); xx <= Math.min(SIZE - 1, x + 2); xx++) {
            if (board[yy][xx]) { nearby = true; break }
          }
        }
        if (!nearby) continue
      }
      board[y][x] = 2
      const attack = evaluate(board, x, y, 2)
      board[y][x] = 1
      const defense = evaluate(board, x, y, 1)
      board[y][x] = 0
      const score = attack * 1.08 + defense + (7 - Math.abs(7 - x) + 7 - Math.abs(7 - y)) * 0.2 + Math.random() * 0.01
      if (score > best) { best = score; choice = [x, y] }
    }
  }
  return choice || [7, 7]
}

function latticeLineTracks(size) {
  return Array.from({ length: size }, (_, index) => ({
    horizontalRow: index + 1,
    verticalColumn: index + 1
  }))
}

function scorePosition(board, player) {
  let total = 0
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    if (board[y][x] !== player) continue
    for (const [dx, dy] of DIRECTIONS) {
      const beforeX = x - dx
      const beforeY = y - dy
      if (beforeX >= 0 && beforeX < SIZE && beforeY >= 0 && beforeY < SIZE && board[beforeY][beforeX] === player) continue
      let count = 1
      let afterX = x + dx
      let afterY = y + dy
      while (afterX >= 0 && afterX < SIZE && afterY >= 0 && afterY < SIZE && board[afterY][afterX] === player) {
        count++
        afterX += dx
        afterY += dy
      }
      const openBefore = beforeX >= 0 && beforeX < SIZE && beforeY >= 0 && beforeY < SIZE && board[beforeY][beforeX] === 0
      const openAfter = afterX >= 0 && afterX < SIZE && afterY >= 0 && afterY < SIZE && board[afterY][afterX] === 0
      const open = Number(openBefore) + Number(openAfter)
      total += count >= 5 ? 1000000 : count === 4 ? (open === 2 ? 30000 : 6000) : count === 3 ? (open === 2 ? 1800 : 180) : count === 2 ? (open === 2 ? 90 : 12) : open
    }
  }
  return total
}

function finishedOutcome(board) {
  const humanScore = scorePosition(board, 1)
  const botScore = scorePosition(board, 2)
  const margin = humanScore - botScore
  const threshold = Math.max(8, Math.max(humanScore, botScore) * 0.1)
  const detail = margin > threshold
    ? '너 우세 · 승부 미정'
    : margin < -threshold
      ? '봇 우세 · 승부 미정'
      : '박빙 · 승부 미정'
  return { kind: 'expired', title: '응답 완료', detail, humanScore, botScore }
}

function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0')
  const s = String(seconds % 60).padStart(2, '0')
  return `${m}:${s}`
}

function GamePane() {
  const busy = useValue(host.state.busy)
  const sessionId = useValue(host.state.focusedSessionId)
  const [board, setBoard] = useState(emptyBoard)
  const [outcome, setOutcome] = useState(null)
  const [thinking, setThinking] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const startedAt = useRef(null)
  const lastTurn = useRef(null)
  const botTimer = useRef(null)

  useEffect(() => {
    const turnKey = busy ? (sessionId || 'focused-session') : null
    if (turnKey && turnKey !== lastTurn.current) {
      clearTimeout(botTimer.current)
      startedAt.current = Date.now()
      setBoard(emptyBoard())
      setOutcome(null)
      setThinking(false)
      setElapsed(0)
    } else if (!turnKey && lastTurn.current) {
      clearTimeout(botTimer.current)
      setThinking(false)
      setOutcome(current => current || finishedOutcome(board))
    }
    lastTurn.current = turnKey
  }, [busy, sessionId, board])

  useEffect(() => {
    if (!busy) return undefined
    const tick = () => {
      if (startedAt.current) setElapsed(Math.floor((Date.now() - startedAt.current) / 1000))
    }
    tick()
    const timer = setInterval(tick, 500)
    return () => clearInterval(timer)
  }, [busy, sessionId])

  useEffect(() => () => clearTimeout(botTimer.current), [])

  const play = (x, y) => {
    if (!busy || outcome || thinking || board[y][x]) return
    const next = board.map(row => row.slice())
    next[y][x] = 1
    setBoard(next)
    if (isWin(next, x, y, 1)) { setOutcome({ kind: 'win', text: '이겼어. 이번 작업 중 승리!' }); return }
    if (next.every(row => row.every(Boolean))) { setOutcome({ kind: 'draw', text: '무승부야.' }); return }
    setThinking(true)
    botTimer.current = setTimeout(() => {
      const move = chooseBotMove(next)
      const afterBot = next.map(row => row.slice())
      afterBot[move[1]][move[0]] = 2
      setBoard(afterBot)
      setThinking(false)
      if (isWin(afterBot, move[0], move[1], 2)) setOutcome({ kind: 'loss', text: '봇이 이겼어. 에이전트는 아직 작업 중이야.' })
      else if (afterBot.every(row => row.every(Boolean))) setOutcome({ kind: 'draw', text: '무승부야.' })
    }, 180)
  }

  const status = outcome ? (outcome.title || outcome.text) : busy ? (thinking ? '봇이 수를 고르는 중…' : '작업이 끝나기 전에 오목을 완성해봐.') : '에이전트가 작업을 시작하면 게임이 열려.'

  const cells = useMemo(() => {
    const nodes = []
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      const stone = board[y][x]
      nodes.push(jsx('button', {
        type: 'button',
        disabled: !busy || Boolean(outcome) || thinking || Boolean(stone),
        'aria-label': `${y + 1}행 ${x + 1}열${stone ? (stone === 1 ? ' 흑돌' : ' 백돌') : ' 빈자리'}`,
        onClick: () => play(x, y),
        style: {
          position: 'relative', zIndex: 1, minWidth: 0, minHeight: 0, padding: 0, border: 0,
          background: 'transparent', cursor: busy && !outcome && !thinking && !stone ? 'pointer' : 'default',
          display: 'grid', placeItems: 'center'
        },
        children: stone ? jsx('span', { style: {
          display: 'block', width: '76%', aspectRatio: '1', borderRadius: '50%',
          background: stone === 1 ? 'var(--ui-text-primary)' : 'var(--ui-bg-primary)',
          border: '1px solid var(--ui-stroke-secondary)',
          boxShadow: '0 1px 2px var(--ui-shadow, transparent)'
        } }) : null
      }, `${x}-${y}`))
    }
    return nodes
  }, [board, busy, outcome, thinking])

  const lineNodes = useMemo(() => latticeLineTracks(SIZE).flatMap(({ horizontalRow, verticalColumn }) => [
    jsx('span', { 'aria-hidden': true, style: {
      gridColumn: verticalColumn, gridRow: '1 / -1', justifySelf: 'center',
      width: 1, height: '100%', background: 'var(--ui-stroke-secondary)'
    } }, `v-${verticalColumn}`),
    jsx('span', { 'aria-hidden': true, style: {
      gridRow: horizontalRow, gridColumn: '1 / -1', alignSelf: 'center',
      width: '100%', height: 1, background: 'var(--ui-stroke-secondary)'
    } }, `h-${horizontalRow}`)
  ]), [])

  const resultCard = outcome ? jsx('div', {
    role: 'status', 'aria-live': 'polite',
    style: {
      position: 'absolute', inset: 0, zIndex: 2, display: 'grid', placeItems: 'center', padding: 12,
      background: 'color-mix(in srgb, var(--ui-bg-primary) 84%, transparent)', backdropFilter: 'blur(2px)'
    },
    children: jsxs('div', { style: {
      maxWidth: '100%', padding: '12px 16px', borderRadius: 8, textAlign: 'center',
      background: 'var(--ui-bg-primary)', border: '1px solid var(--ui-stroke-secondary)',
      boxShadow: '0 4px 16px var(--ui-shadow, transparent)'
    }, children: [
      jsx('div', { style: { fontWeight: 700, color: outcome.kind === 'win' ? 'var(--ui-success, var(--ui-accent))' : 'var(--ui-text-primary)' }, children:
        outcome.kind === 'win' ? '너 승리' : outcome.kind === 'loss' ? '로컬 봇 승리' : outcome.kind === 'draw' ? '무승부' : '응답 완료'
      }),
      jsx('div', { className: 'mt-1 text-xs text-(--ui-text-secondary)', children:
        outcome.kind === 'expired' ? `5목 완성 전 종료 · ${outcome.detail}` : outcome.text
      })
    ] })
  }) : null

  const tone = outcome?.kind === 'win' ? 'var(--ui-success, var(--ui-accent))' : 'var(--ui-text-secondary)'
  return jsxs('div', {
    className: 'flex h-full min-h-0 flex-col gap-3 overflow-auto p-3 text-sm',
    children: [
      jsxs('div', { className: 'flex items-start justify-between gap-2', children: [
        jsxs('div', { children: [jsx('div', { className: 'font-semibold', children: '작업 중 오목' }), jsx('div', { className: 'text-xs text-(--ui-text-tertiary)', children: '너 대 로컬 게임 봇 · 15×15' })] }),
        jsx('span', { className: 'shrink-0 rounded border border-(--ui-stroke-secondary) px-1.5 py-0.5 font-mono text-[10px]', children: outcome ? 'DONE' : busy ? 'PLAY' : 'LOCKED' })
      ] }),
      jsxs('div', { className: 'rounded-md border border-(--ui-stroke-secondary) p-2', children: [
        jsx('div', { className: 'mb-2 flex items-center justify-between text-xs', children: [jsx('span', { className: 'text-(--ui-text-tertiary)', children: '작업 경과' }), jsx('span', { className: 'font-mono', children: formatTime(elapsed) })] }),
        jsxs('div', { style: { position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${SIZE}, minmax(0, 1fr))`, aspectRatio: '1', background: 'var(--ui-bg-secondary)', borderRadius: 4, overflow: 'hidden', isolation: 'isolate' }, children: [
          jsx('div', { 'aria-hidden': true, style: { position: 'absolute', inset: 0, zIndex: 0, display: 'grid', gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${SIZE}, minmax(0, 1fr))`, pointerEvents: 'none' }, children: lineNodes }),
          ...cells,
          resultCard
        ] })
      ] }),
      jsxs('div', { className: 'flex items-center justify-between gap-2 text-xs', children: [jsx('span', { style: { color: tone }, children: status }), jsx('span', { className: 'shrink-0 text-(--ui-text-tertiary)', children: '● 너  ○ 봇' })] }),
      jsx('div', { className: 'mt-auto border-t border-(--ui-stroke-secondary) pt-2 text-[11px] text-(--ui-text-tertiary)', children: busy ? '에이전트 작업이 끝나면 판이 자동으로 잠겨.' : '게임은 포커스된 대화가 작업 중일 때만 가능해.' })
    ]
  })
}

export default {
  id: ID,
  name: '작업 중 오목',
  register(ctx) {
    ctx.register({
      id: 'gomoku-game-pane-v2',
      area: 'panes',
      title: '작업 중 오목',
      data: { placement: 'main', uncloseable: true, dock: { pane: 'workspace', pos: 'center', enforce: true } },
      render: () => jsx(GamePane, {})
    })
    const busy = host.state.busy
    const revealWhenBusy = isBusy => {
      if (isBusy) host.revealPane(`${ID}:gomoku-game-pane-v2`)
    }
    const unsubscribe = busy.listen(revealWhenBusy)
    ctx.onDispose(unsubscribe)
    revealWhenBusy(busy.get())
  }
}
