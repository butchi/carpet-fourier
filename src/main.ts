import ndarray from "ndarray"
// @ts-ignore
import fft from "ndarray-fft"

import "./style.css"

const initSize = 4
const nest = 4
const size = initSize ** nest

const duration = 5999

let isDark = false

let timeout: number

const re = new Float32Array(size ** 2)
const im = new Float32Array(size ** 2)

const origCvsElm = document.getElementById("cvsOrig")
const fftCurCvsElm = document.getElementById("cvsCur")

if (!(origCvsElm instanceof HTMLCanvasElement)) {
  throw new Error("cvsOrig is not a canvas element")
}
if (!(fftCurCvsElm instanceof HTMLCanvasElement)) {
  throw new Error("cvsCur is not a canvas element")
}

origCvsElm.width = size
origCvsElm.height = size
fftCurCvsElm.width = size
fftCurCvsElm.height = size


const ctxOrig = origCvsElm.getContext("2d")
const ctxFftCur = fftCurCvsElm.getContext("2d")

if (!ctxOrig) {
  throw new Error("cvsOrig context is null")
}
if (!ctxFftCur) {
  throw new Error("cvsCur context is null")
}


const initTbl = [...Array(initSize)].map(_ => {
  return Array(initSize).fill(0)
})

const initialize = () => {
  let total = 0

  initTbl.forEach((row, y) => {
    row.forEach((_col, x) => {
      const val = Math.floor(Math.random() * 2)
      initTbl[y][x] = val
      total += val
    })
  })

  if (total <= 5) {
    initialize()
  }
}

initialize()

const resizeCanvas = () => {
  const w = globalThis.innerWidth
  const h = globalThis.innerHeight
  const cvsRenderCurElm = document.getElementById(
    "cvsRenderCur"
  ) as HTMLCanvasElement
  const cvsRenderPrevElm = document.getElementById(
    "cvsRenderPrev"
  ) as HTMLCanvasElement
  if (cvsRenderCurElm) {
    cvsRenderCurElm.width = w
    cvsRenderCurElm.height = h
  }
  if (cvsRenderPrevElm) {
    cvsRenderPrevElm.width = w
    cvsRenderPrevElm.height = h
  }
}

const draw = () => {
  const x = Math.floor(Math.random() * 4)
  const y = Math.floor(Math.random() * 4)

  initTbl[y][x] = 1 - initTbl[y][x]

  const fractalTbl = [...Array(size)].map(_ => Array(size).fill(0))

  let p = 0

  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      fractalTbl[j][i] = 1
      for (let n = 0; n < nest; n++) {
        fractalTbl[j][i] *=
          initTbl[Math.floor(j / Math.pow(initSize, n)) % initSize][
            Math.floor(i / Math.pow(initSize, n)) % initSize
          ]

        re[p] = fractalTbl[j][i]
        im[p] = 0

        p++
      }
    }
  }

  const ndR = ndarray(re, [size, size])
  const ndI = ndarray(im, [size, size])

  // 2D FFT (インプレース)
  fft(1, ndR, ndI)

  let fftMaxVal = 0
  for (let i = 0; i < size ** 2; i++) {
    const val = Math.log(Math.sqrt(re[i] ** 2 + im[i] ** 2))
    fftMaxVal = Math.max(fftMaxVal, val)
  }

  re.forEach((val, i) => {
    re[i] = val / fftMaxVal
  })
  im.forEach((val, i) => {
    im[i] = val / fftMaxVal
  })

  const imgDataOrig = ctxOrig.getImageData(0, 0, size, size)
  const imgDataFftCur = ctxFftCur.getImageData(0, 0, size, size)

  const ampLi = [Math.random(), Math.random(), Math.random()]

  let i = 0
  p = 0
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      for (let c = 0; c < 4; c++) {
        if (c < 3) {
          imgDataOrig.data[i] = 255 - 255 * fractalTbl[y][x]
          imgDataFftCur.data[i] =
            (isDark ? 0 : 255) +
            (isDark ? 1 : -1) *
              255 *
              ampLi[c] *
              (re[p] * re[p] + im[p] * im[p]) ** 0.5
        } else {
          imgDataOrig.data[i] = 255
          imgDataFftCur.data[i] = 255
        }

        i++
      }

      p++
    }
  }

  ctxOrig.putImageData(imgDataOrig, 0, 0)
  ctxFftCur.putImageData(imgDataFftCur, 0, 0)

  const cvsRenderCurElm = document.getElementById("cvsRenderCur")

  if (!(cvsRenderCurElm instanceof HTMLCanvasElement)) {
    throw new Error("cvsRenderCur is not a canvas element")
  }

  cvsRenderCurElm.width = window.innerWidth
  cvsRenderCurElm.height = window.innerHeight

  if (!(cvsRenderCurElm instanceof HTMLCanvasElement)) {
    throw new Error("cvsRenderCur is not a canvas element")
  }
  const cvsRenderPrevElm = document.getElementById("cvsRenderPrev")
  if (!(cvsRenderPrevElm instanceof HTMLCanvasElement)) {
    throw new Error("cvsRenderPrev is not a canvas element")
  }

  const ctxRenderCur = cvsRenderCurElm.getContext("2d")
  if (!ctxRenderCur) {
    throw new Error("cvsRenderCur context is null")
  }

  const patternCur = ctxRenderCur.createPattern(fftCurCvsElm, "repeat")
  if (!patternCur) {
      throw new Error("Failed to create pattern for fftCurCvsElm");
  }
  ctxRenderCur.fillStyle = patternCur
  ctxRenderCur.fillRect(0, 0, cvsRenderCurElm.width, cvsRenderCurElm.height)

  timeout = setTimeout(draw, duration)

  cvsRenderCurElm.onclick = () => {
    isDark = !isDark
    clearTimeout(timeout)
    draw()
  }
}

globalThis.onresize = () => {
  resizeCanvas()
}
resizeCanvas()

draw()
