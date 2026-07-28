"use client"

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import './curved-input.css'

const DEG = 180 / Math.PI

const round2 = (n: number) => Math.round(n * 100) / 100

const hexToRgba = (hex: string, alpha: number) => {
  let h = String(hex).replace('#', '')
  if (h.length === 3)
    h = h.split('').map(c => c + c).join('')
  const n = parseInt(h.slice(0, 6), 16)
  if (Number.isNaN(n)) return hex
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

const buildGeometry = (width: number, bend: number, thickness: number, pad: number) => {
  const W = width
  const T = thickness
  const s = Math.max(-W * 0.35, Math.min(bend, W * 0.35))
  const a = Math.abs(s)
  const dir = s >= 0 ? 1 : -1
  const svgH = T + a + pad * 2

  if (a < 0.75) {
    const midY = pad + T / 2
    return {
      straight: true,
      W, T, svgH, uPerLen: 1,
      point: (u: number, v: number) => [u, midY + v] as [number, number],
      angleAt: () => 0,
      uFromPoint: (x: number) => x
    }
  }

  const R = (W * W * 0.25 + a * a) / (2 * a)
  const cx = W / 2
  const apexY = pad + T / 2 + (dir > 0 ? 0 : a)
  const cy = apexY + dir * R
  const phi = Math.asin(Math.min(1, W / (2 * R)))

  return {
    straight: false,
    W, T, svgH, R, dir, uPerLen: W / (2 * R * phi),
    point: (u: number, v: number) => {
      const th = ((u - cx) / cx) * phi
      const rho = R - dir * v
      return [cx + rho * Math.sin(th), cy - dir * rho * Math.cos(th)] as [number, number]
    },
    angleAt: (u: number) => dir * ((u - cx) / cx) * phi * DEG,
    uFromPoint: (x: number) => cx + ((Math.atan2(x - cx, dir * (cy - 0)) / phi) * cx)
  }
}

const fmt = (g: NonNullable<ReturnType<typeof buildGeometry>>, u: number, v: number) => {
  const [x, y] = g.point(u, v)
  return `${round2(x)} ${round2(y)}`
}

const edgeSeg = (g: NonNullable<ReturnType<typeof buildGeometry>>, uTo: number, v: number, ltr: boolean) => {
  if (g.straight) return `L ${fmt(g, uTo, v)}`
  const R = g.R ?? 0
  const dir = g.dir ?? 1
  const rho = round2(R - dir * v)
  const sweep = ltr === (dir > 0) ? 1 : 0
  return `A ${rho} ${rho} 0 0 ${sweep} ${fmt(g, uTo, v)}`
}

const bentRectPath = (g: NonNullable<ReturnType<typeof buildGeometry>>, u0: number, u1: number, vTop: number, vBot: number, radius: number) => {
  const rc = Math.max(0, Math.min(radius, (vBot - vTop) / 2, (u1 - u0) / 2))
  return [
    `M ${fmt(g, u0 + rc, vTop)}`,
    edgeSeg(g, u1 - rc, vTop, true),
    `Q ${fmt(g, u1, vTop)} ${fmt(g, u1, vTop + rc)}`,
    `L ${fmt(g, u1, vBot - rc)}`,
    `Q ${fmt(g, u1, vBot)} ${fmt(g, u1 - rc, vBot)}`,
    edgeSeg(g, u0 + rc, vBot, false),
    `Q ${fmt(g, u0, vBot)} ${fmt(g, u0, vBot - rc)}`,
    `L ${fmt(g, u0, vTop + rc)}`,
    `Q ${fmt(g, u0, vTop)} ${fmt(g, u0 + rc, vTop)}`,
    'Z'
  ].join(' ')
}

const bentLinePath = (g: NonNullable<ReturnType<typeof buildGeometry>>, u0: number, u1: number, v: number) =>
  `M ${fmt(g, u0, v)} ${edgeSeg(g, u1, v, true)}`

interface CurvedInputProps {
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  onSubmit?: (value: string) => void
  placeholder?: string
  buttonText?: string
  type?: string
  name?: string
  ariaLabel?: string
  width?: number | string
  bend?: number
  height?: number
  cornerRadius?: number
  borderWidth?: number
  fontSize?: number
  backgroundColor?: string
  textColor?: string
  placeholderColor?: string
  borderColor?: string
  buttonColor?: string
  buttonTextColor?: string
  shadowColor?: string
  showButton?: boolean
  className?: string
}

export default function CurvedInput({
  value,
  defaultValue = '',
  onChange,
  onSubmit,
  placeholder = 'Enter text',
  buttonText = 'Submit',
  type = 'text',
  name,
  ariaLabel,
  width = 400,
  bend = 20,
  height = 56,
  cornerRadius = 16,
  borderWidth = 1.5,
  fontSize = 15,
  backgroundColor = '#ffffff',
  textColor = '#111111',
  placeholderColor = '#9aa0b6',
  borderColor = '#e0e0e0',
  buttonColor = '#FF7A59',
  buttonTextColor = '#ffffff',
  shadowColor = '#000000',
  showButton = true,
  className = '',
}: CurvedInputProps) {
  const uid = useId().replace(/:/g, '')
  const layoutPathId = `ci-text-${uid}`
  const buttonPathId = `ci-btn-${uid}`
  const clipId = `ci-clip-${uid}`

  const rootRef = useRef<HTMLFormElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const textRef = useRef<SVGTextElement>(null)
  const btnMeasureRef = useRef<SVGTextElement>(null)
  const scrollRef = useRef(0)

  const [w, setW] = useState(0)
  const [innerValue, setInnerValue] = useState(defaultValue)
  const [caretIndex, setCaretIndex] = useState(defaultValue.length)
  const [focused, setFocused] = useState(false)
  const [caretU, setCaretU] = useState(0)
  const [scrollLen, setScrollLen] = useState(0)
  const [btnTextW, setBtnTextW] = useState(0)

  const val = value !== undefined ? value : innerValue
  const display = type === 'password' ? '•'.repeat(val.length) : val

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const cw = entries[0]?.contentRect?.width ?? el.clientWidth
      setW(Math.round(cw))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    let alive = true
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (alive) setW(prev => prev)
      })
    }
    return () => { alive = false }
  }, [])

  const pad = Math.ceil(borderWidth / 2) + 6
  const geom = useMemo(() => (w > 2 ? buildGeometry(w, bend, height, pad) : null), [w, bend, height, pad])

  const layout = useMemo(() => {
    if (!geom) return null
    const T = height
    const btnInset = Math.max(5, borderWidth + 4)
    const textStartU = 24
    const btnW = showButton ? Math.max(btnTextW + fontSize * 2.7, T * 1.35) : 0
    const btnU1 = geom.W - btnInset
    const btnU0 = btnU1 - btnW
    const textEndU = Math.max(textStartU + 20, showButton ? btnU0 - 14 : geom.W - 24)
    const winLen = (textEndU - textStartU) / geom.uPerLen
    return { btnInset, textStartU, textEndU, btnU0, btnU1, winLen }
  }, [geom, height, borderWidth, btnTextW, fontSize, showButton])

  useLayoutEffect(() => {
    if (btnMeasureRef.current) {
      const bw = btnMeasureRef.current.getComputedTextLength()
      setBtnTextW(prev => (Math.abs(prev - bw) > 0.5 ? bw : prev))
    }
    if (!geom || !layout) return
    const textEl = textRef.current
    const caret = Math.min(caretIndex, display.length)
    let caretLen = 0
    let totalLen = 0
    if (textEl && display.length) {
      try {
        totalLen = textEl.getSubStringLength(0, display.length)
        caretLen = caret > 0 ? textEl.getSubStringLength(0, caret) : 0
      } catch {
        totalLen = 0
        caretLen = 0
      }
    }
    let next = scrollRef.current
    if (caretLen - next > layout.winLen - 2) next = caretLen - layout.winLen + 2
    if (caretLen - next < 0) next = caretLen
    if (totalLen - next < layout.winLen) next = Math.max(0, totalLen - layout.winLen)
    next = Math.max(0, next)
    if (Math.abs(next - scrollRef.current) > 0.5) {
      scrollRef.current = next
      setScrollLen(next)
    }
    setCaretU(layout.textStartU + (caretLen - next) * geom.uPerLen)
  })

  const commitValue = (v: string) => {
    if (value === undefined) setInnerValue(v)
    onChange?.(v)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    commitValue(e.target.value)
    setCaretIndex(e.target.selectionStart ?? e.target.value.length)
  }

  const handleSelect = (e: React.SyntheticEvent<HTMLInputElement>) => {
    setCaretIndex((e.target as HTMLInputElement).selectionStart ?? val.length)
  }

  const handleSubmit = (e?: React.FormEvent) => {
    if (e?.preventDefault) e.preventDefault()
    onSubmit?.(val)
  }

  const handleSurfaceClick = (e: React.MouseEvent) => {
    const input = inputRef.current
    if (!input) return
    let idx = display.length
    const svg = svgRef.current
    const textEl = textRef.current
    if (svg && geom && layout && textEl && display.length) {
      try {
        const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM()!.inverse())
        const target = scrollRef.current + (geom.uFromPoint(pt.x) - layout.textStartU) / geom.uPerLen
        let best = 0
        let bestDist = Infinity
        for (let i = 0; i <= display.length; i++) {
          const li = i === 0 ? 0 : textEl.getSubStringLength(0, i)
          const d = Math.abs(li - target)
          if (d < bestDist) {
            bestDist = d
            best = i
          }
        }
        idx = best
      } catch {
        idx = display.length
      }
    }
    input.focus()
    try {
      input.setSelectionRange(idx, idx)
    } catch {}
    setCaretIndex(idx)
  }

  const safeType = ['text', 'search', 'tel', 'url', 'password'].includes(type) ? type : 'text'
  const inputMode = type === 'email' ? 'email' : type === 'number' ? 'decimal' : undefined

  const shadow = [5, 12, 0.3]
  const svgStyle = shadow
    ? { filter: `drop-shadow(0 ${shadow[0]}px ${shadow[1]}px ${hexToRgba(shadowColor, shadow[2])})` }
    : undefined

  let content = null
  if (geom && layout) {
    const T = height
    const vBase = fontSize * 0.34
    const scrollU = scrollLen * geom.uPerLen
    const bandPath = bentRectPath(geom, 0, geom.W, -T / 2, T / 2, cornerRadius)
    const layoutPath = bentLinePath(geom, layout.textStartU - scrollU, geom.W, vBase)
    const clipPath = bentRectPath(geom, layout.textStartU - 6, layout.textEndU + 8, -T / 2, T / 2, 0)

    const btnH = T - layout.btnInset * 2
    const buttonPath = showButton
      ? bentRectPath(geom, layout.btnU0, layout.btnU1, -T / 2 + layout.btnInset, T / 2 - layout.btnInset, Math.min(cornerRadius * 0.72, btnH / 2))
      : ''
    const buttonTextPath = showButton ? bentLinePath(geom, layout.btnU0, layout.btnU1, vBase) : ''

    const [caretX, caretY] = geom.point(caretU, 0)
    const caretAngle = geom.angleAt(caretU)
    const caretH = Math.min(T * 0.58, fontSize * 1.45)

    content = (
      <svg
        ref={svgRef}
        className="curved-input__svg"
        width={geom.W}
        height={round2(geom.svgH)}
        viewBox={`0 0 ${geom.W} ${round2(geom.svgH)}`}
        style={svgStyle}
        onPointerDown={e => e.preventDefault()}
        onClick={handleSurfaceClick}
      >
        <defs>
          <clipPath id={clipId}>
            <path d={clipPath} />
          </clipPath>
        </defs>

        <path className="curved-input__ring" d={bandPath} fill="none" stroke={buttonColor} strokeWidth={borderWidth + 6} />
        <path d={bandPath} fill={backgroundColor} stroke={borderColor} strokeWidth={borderWidth} />

        <path id={layoutPathId} d={layoutPath} fill="none" />

        <g clipPath={`url(#${clipId})`}>
          <text ref={textRef} style={{ fontSize: `${fontSize}px`, fontWeight: 500 }} fill={textColor} xmlSpace="preserve" aria-hidden="true">
            <textPath href={`#${layoutPathId}`}>{display}</textPath>
          </text>
          {!display && placeholder && (
            <text style={{ fontSize: `${fontSize}px`, fontWeight: 500 }} fill={placeholderColor} xmlSpace="preserve" aria-hidden="true">
              <textPath href={`#${layoutPathId}`}>{placeholder}</textPath>
            </text>
          )}
          {focused && (
            <g key={`${display}-${Math.min(caretIndex, display.length)}`} transform={`translate(${round2(caretX)} ${round2(caretY)}) rotate(${round2(caretAngle)})`}>
              <line y1={-caretH / 2} y2={caretH / 2} stroke={textColor} strokeWidth="1.5" strokeLinecap="round">
                <animate attributeName="opacity" values="1;0" dur="1.06s" calcMode="discrete" repeatCount="indefinite" />
              </line>
            </g>
          )}
        </g>

        {showButton && (
          <g
            className="curved-input__button"
            role="button"
            tabIndex={0}
            aria-label={buttonText}
            onClick={e => { e.stopPropagation(); handleSubmit() }}
            onPointerDown={e => e.stopPropagation()}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSubmit() } }}
          >
            <path className="curved-input__button-bg" d={buttonPath} fill={buttonColor} />
            <path id={buttonPathId} d={buttonTextPath} fill="none" />
            <text fill={buttonTextColor} textAnchor="middle" style={{ fontSize: `${fontSize}px`, fontWeight: 600, pointerEvents: 'none' }}>
              <textPath href={`#${buttonPathId}`} startOffset="50%">{buttonText}</textPath>
            </text>
          </g>
        )}

        <text ref={btnMeasureRef} style={{ fontSize: `${fontSize}px`, fontWeight: 600 }} x="-9999" y="-9999" visibility="hidden" aria-hidden="true">
          {buttonText}
        </text>
      </svg>
    )
  }

  return (
    <form
      ref={rootRef}
      className={`curved-input ${focused ? 'curved-input--focused' : ''} ${className}`.trim()}
      style={{ width: typeof width === 'number' ? `${width}px` : width }}
      onSubmit={handleSubmit}
      noValidate
    >
      {content}
      <input
        ref={inputRef}
        className="curved-input__field"
        type={safeType}
        inputMode={inputMode}
        name={name}
        value={val}
        onChange={handleInputChange}
        onSelect={handleSelect}
        onKeyUp={handleSelect}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-label={ariaLabel || placeholder || 'Input'}
        autoComplete="off"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
    </form>
  )
}
