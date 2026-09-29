// Variabilidad de la frecuencia cardíaca (HRV) simplificada: RMSSD de los últimos 16 RR.
// Envía "bpm" y "rmssd" por radio (grupo 7) para que otro micro:bit los reciba.
radio.setGroup(7)
ad8232.iniciar(200)

let rr: number[] = []

ad8232.alDetectarLatido(function () {
    const intervalo = ad8232.intervaloRR()
    if (intervalo > 0) {
        rr.push(intervalo)
        if (rr.length > 16) rr.shift()
    }
})

function rmssd(): number {
    if (rr.length < 2) return 0
    let suma = 0
    for (let i = 1; i < rr.length; i++) {
        const d = rr[i] - rr[i - 1]
        suma += d * d
    }
    return Math.sqrt(suma / (rr.length - 1))
}

basic.forever(function () {
    radio.sendValue("bpm", ad8232.frecuenciaCardiaca())
    radio.sendValue("rmssd", Math.round(rmssd()))
    basic.pause(1000)
})
