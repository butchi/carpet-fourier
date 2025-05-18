import ndarray from "ndarray"
// @ts-ignore
import fft from "ndarray-fft"

import "./style.css"

const initSize = 8
const nest = 4
const size = initSize ** nest
const duration = 5999

let isDark = false
let timeout: number
let prevImageData: ImageData | null = null

const re = new Float32Array(size ** 2)
const im = new Float32Array(size ** 2)

const origCvsElm = document.getElementById("cvsOrig") as HTMLCanvasElement
const fftCurCvsElm = document.getElementById("cvsCur") as HTMLCanvasElement

const cvsRenderCurElm = document.getElementById(
  "cvsRenderCur"
) as HTMLCanvasElement

const dpr = window.devicePixelRatio || 1

if (!(origCvsElm instanceof HTMLCanvasElement))
  throw new Error("cvsOrig is not a canvas element")
if (!(fftCurCvsElm instanceof HTMLCanvasElement))
  throw new Error("cvsCur is not a canvas element")

// 固定サイズのキャンバス初期化
const setFixedCanvasSize = (canvas: HTMLCanvasElement, size: number) => {
  canvas.width = size
  canvas.height = size
  canvas.style.width = `${size}px`
  canvas.style.height = `${size}px`
}

setFixedCanvasSize(origCvsElm, size)
setFixedCanvasSize(fftCurCvsElm, size)

const ctxOrig = origCvsElm.getContext("2d")
const ctxFftCur = fftCurCvsElm.getContext("2d")

if (!ctxOrig) throw new Error("cvsOrig context is null")
if (!ctxFftCur) throw new Error("cvsCur context is null")

// 初期テーブル生成
const initTbl: number[][] = Array.from({ length: initSize }, () =>
  Array(initSize).fill(0)
)

const initialize = () => {
  let total = 0
  for (let y = 0; y < initSize; y++) {
    for (let x = 0; x < initSize; x++) {
      const val = Math.floor(Math.random() * 2)
      initTbl[y][x] = val
      total += val
    }
  }
  if (total <= 5) {
    initialize()
  }
}
initialize()

// レンダリング用Canvasのサイズ設定（ウィンドウサイズに合わせる）
const setRenderCanvasSize = (canvas: HTMLCanvasElement) => {
  const w = window.innerWidth
  const h = window.innerHeight
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`
}

const resizeCanvas = () => {
  setRenderCanvasSize(cvsRenderCurElm)
}

// フラクタルパターンの生成（ランダム要素の更新含む）
const generateFractal = (): number[][] => {
  const fractalTbl: number[][] = Array.from({ length: size }, () =>
    Array(size).fill(0)
  )
  // initTblのランダムなセルを反転
  const randX = Math.floor(Math.random() * initSize)
  const randY = Math.floor(Math.random() * initSize)
  initTbl[randY][randX] = 1 - initTbl[randY][randX]

  let p = 0
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      let val = 1
      for (let n = 0; n < nest; n++) {
        val *=
          initTbl[Math.floor(j / Math.pow(initSize, n)) % initSize][
            Math.floor(i / Math.pow(initSize, n)) % initSize
          ]
      }
      fractalTbl[j][i] = val
      re[p] = val
      im[p] = 0
      p++
    }
  }
  return fractalTbl
}

// FFT実行と正規化
const performFFT = () => {
  const ndR = ndarray(re, [size, size])
  const ndI = ndarray(im, [size, size])
  fft(1, ndR, ndI)
  let fftMaxVal = 0
  for (let i = 0; i < size ** 2; i++) {
    const val = Math.log(Math.sqrt(re[i] ** 2 + im[i] ** 2))
    fftMaxVal = Math.max(fftMaxVal, val)
  }
  for (let i = 0; i < size ** 2; i++) {
    re[i] /= fftMaxVal
    im[i] /= fftMaxVal
  }
}

// 共通のピクセルデータ更新関数
const updateCanvasData = (
  ctx: CanvasRenderingContext2D,
  imageData: ImageData,
  dataFunc: (x: number, y: number, p: number) => number[]
) => {
  let idx = 0
  let p = 0
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const colors = dataFunc(x, y, p)
      for (let c = 0; c < 4; c++) {
        imageData.data[idx++] = colors[c]
      }
      p++
    }
  }
  ctx.putImageData(imageData, 0, 0)
}

// オリジナルのフラクタルパターン描画
const updateOriginalCanvas = (fractalTbl: number[][]) => {
  const imgData = ctxOrig.getImageData(0, 0, size, size)
  updateCanvasData(ctxOrig, imgData, (x, y, _p) => {
    const value = fractalTbl[y][x]
    return [255 - 255 * value, 255 - 255 * value, 255 - 255 * value, 255]
  })
}

// FFT結果描画（明暗モード切替に対応）
const updateFFTCanvas = () => {
  const imgData = ctxFftCur.getImageData(0, 0, size, size)
  const ampLi = [Math.random(), Math.random(), Math.random()]
  updateCanvasData(ctxFftCur, imgData, (_x, _y, p) => {
    const amplitude = Math.sqrt(re[p] ** 2 + im[p] ** 2)
    const base = isDark ? 0 : 255
    const sign = isDark ? 1 : -1
    return [
      base + sign * 255 * ampLi[0] * amplitude,
      base + sign * 255 * ampLi[1] * amplitude,
      base + sign * 255 * ampLi[2] * amplitude,
      255,
    ]
  })
}

// フェードアニメーション
const fadeTransition = (ctx: CanvasRenderingContext2D, from: ImageData, to: ImageData, duration: number, callback: () => void) => {
  const width = from.width
  const height = from.height
  let start: number | null = null
  const temp = ctx.createImageData(width, height)

  function step(ts: number) {
    if (!start) start = ts
    const t = Math.min((ts - start) / duration, 1)
    for (let i = 0; i < from.data.length; i += 4) {
      for (let c = 0; c < 4; c++) {
        temp.data[i + c] = from.data[i + c] * (1 - t) + to.data[i + c] * t
      }
    }
    ctx.putImageData(temp, 0, 0)
    if (t < 1) {
      requestAnimationFrame(step)
    } else {
      callback()
    }
  }
  requestAnimationFrame(step)
}

// レンダリング用CanvasにFFTパターンを適用
const renderPattern = () => {
  resizeCanvas()
  const ctxRenderCur = cvsRenderCurElm.getContext("2d")
  if (!ctxRenderCur) throw new Error("cvsRenderCur context is null")

  const patternCur = ctxRenderCur.createPattern(fftCurCvsElm, "repeat")
  if (!patternCur) throw new Error("Failed to create pattern for fftCurCvsElm")
  ctxRenderCur.fillStyle = patternCur
  ctxRenderCur.fillRect(0, 0, cvsRenderCurElm.width, cvsRenderCurElm.height)
}

// メイン描画処理（再帰的タイマーで更新）
const draw = () => {
  const ctxRenderCur = cvsRenderCurElm.getContext("2d")
  if (!ctxRenderCur) throw new Error("cvsRenderCur context is null")
  // 前回の内容を保存
  if (!prevImageData) {
    prevImageData = ctxRenderCur.getImageData(0, 0, cvsRenderCurElm.width, cvsRenderCurElm.height)
  }
  const fractalTbl = generateFractal()
  performFFT()
  updateOriginalCanvas(fractalTbl)
  updateFFTCanvas()
  renderPattern()
  // 新しい内容を取得
  const newImageData = ctxRenderCur.getImageData(0, 0, cvsRenderCurElm.width, cvsRenderCurElm.height)
  // フェード
  fadeTransition(
    ctxRenderCur,
    prevImageData,
    newImageData,
    800, // フェード時間(ms)
    () => {
      prevImageData = newImageData
      timeout = setTimeout(draw, duration)
    }
  )
}

// クリックイベントは初期化時に一度だけ設定
cvsRenderCurElm.onclick = () => {
  isDark = !isDark
  clearTimeout(timeout)
  draw()
}

globalThis.onresize = () => {
  resizeCanvas()
}
resizeCanvas()
draw()
