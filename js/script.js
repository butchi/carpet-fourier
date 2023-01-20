const initSize = 4
const nest = 4
const size = initSize ** nest

const duration = 2999

let isDark = false

let timeout

const $cvsOrig = $(".orig")
$cvsOrig.get(0).width = size
$cvsOrig.get(0).height = size
const ctxOrig = $cvsOrig.get(0).getContext("2d")

const $cvsFftCur = $(".cur")
$cvsFftCur.get(0).width = size
$cvsFftCur.get(0).height = size
const ctxFftCur = $cvsFftCur.get(0).getContext("2d")

const $cvsFftPrev = $(".prev")
$cvsFftPrev.get(0).width = size
$cvsFftPrev.get(0).height = size
const ctxFftPrev = $cvsFftPrev.get(0).getContext("2d")

const $cvsRenderCur = $(".render-cur")
$cvsRenderCur.get(0).width = 1920
$cvsRenderCur.get(0).height = 1080

const $cvsRenderPrev = $(".render-prev")
$cvsRenderPrev.get(0).width = 1920
$cvsRenderPrev.get(0).height = 1080

const initTbl = [...Array(initSize)].map(_ => {
    return Array(initSize).fill(0)
})

$(".render-cur").click(_ => {
    isDark = !isDark

    clearTimeout(timeout)
    draw()
})

const initialize = _ => {
    let total = 0

    initTbl.forEach((row, y) => {
        row.forEach((col, x) => {
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

const draw = _ => {
    const x = Math.floor(Math.random() * 4)
    const y = Math.floor(Math.random() * 4)

    initTbl[y][x] = 1 - initTbl[y][x]

    $cvsRenderCur.fadeOut(11)
    $cvsRenderCur.fadeIn(599)

    const fractalTbl = [...Array(size)].map(_ => Array(size).fill(0))

    ctxFftPrev.drawImage($cvsFftCur.get(0), 0, 0)

    for (let j = 0; j < size; j++) {
        for (let i = 0; i < size; i++) {
            fractalTbl[j][i] = 1
            for (let n = 0; n < nest; n++) {
                fractalTbl[j][i] *=
                    initTbl[Math.floor(j / Math.pow(initSize, n)) % initSize][
                    Math.floor(i / Math.pow(initSize, n)) % initSize
                    ]
            }
        }
    }

    let fftMaxVal = 0
    fftTbl = math.fft(fractalTbl).map((row, y) => {
        return row.map((col, x) => {
            const val = Math.log(Math.sqrt(col.re ** 2 + col.im ** 2))
            fftMaxVal = Math.max(fftMaxVal, val)
            return val
        })
    })

    fftTbl = fftTbl.map((row) =>
        row.map((col) => {
            return col / fftMaxVal
        })
    )

    imgDataOrig = ctxOrig.getImageData(0, 0, size, size)
    imgDataFftCur = ctxFftCur.getImageData(0, 0, size, size)

    const ampLi = [Math.random(), Math.random(), Math.random()]

    let i = 0
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
                        fftTbl[Math.floor(y + size / 2) % size][
                        Math.floor(x + size / 2) % size
                        ]
                } else {
                    imgDataOrig.data[i] = 255
                    imgDataFftCur.data[i] = 255
                }

                i++
            }
        }
    }

    ctxOrig.putImageData(imgDataOrig, 0, 0)
    ctxFftCur.putImageData(imgDataFftCur, 0, 0)

    const ctxRenderCur = $cvsRenderCur.get(0).getContext("2d")
    patternCur = ctxRenderCur.createPattern($cvsFftCur.get(0), "repeat")
    ctxRenderCur.fillStyle = patternCur
    ctxRenderCur.fillRect(0, 0, 1920, 1080)

    const ctxRenderPrev = $cvsRenderPrev.get(0).getContext("2d")
    patternPrev = ctxRenderPrev.createPattern($cvsFftPrev.get(0), "repeat")
    ctxRenderPrev.fillStyle = patternPrev
    ctxRenderPrev.fillRect(0, 0, 1920, 1080)

    timeout = setTimeout(draw, duration)
}

draw()

$(globalThis).resize(_ => {
    const w = $(globalThis).width()
    const h = $(globalThis).height()
    $cvsRenderCur.get(0).width = w
    $cvsRenderCur.get(0).height = h
    $cvsRenderPrev.get(0).width = w
    $cvsRenderPrev.get(0).height = h
})
