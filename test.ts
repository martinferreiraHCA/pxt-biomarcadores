/**
 * test.ts
 * -------
 * Programa de prueba. Se compila SOLO cuando este repositorio se abre como
 * proyecto principal (pxt build / MakeCode), nunca cuando alguien usa la
 * extensión desde otro proyecto. Sirve para verificar que los bloques
 * compilan y para probar rápido en el simulador o en un micro:bit.
 */

// Conexión: OUTPUT -> P0, LO+ -> P1, LO- -> P2
ad8232.configurar(AnalogPin.P0, DigitalPin.P1, DigitalPin.P2)
ad8232.iniciar(200)

ad8232.alDetectarLatido(function () {
    basic.showIcon(IconNames.Heart)
    basic.pause(80)
    basic.showIcon(IconNames.SmallHeart)
})

ad8232.alCambiarElectrodos(function (desconectados: boolean) {
    if (desconectados) {
        basic.showIcon(IconNames.No)
    } else {
        basic.showIcon(IconNames.Yes)
    }
})

input.onButtonPressed(Button.A, function () {
    basic.showNumber(ad8232.frecuenciaCardiaca())
})

input.onButtonPressed(Button.B, function () {
    // alterna entre el sensor real y la señal simulada
    if (ad8232.valorCrudo() >= 0) {
        ad8232.usarSenalSimulada(90)
    }
})

basic.forever(function () {
    ad8232.enviarPorSerial()
    serial.writeValue("bpm", ad8232.frecuenciaCardiaca())
    serial.writeValue("energia", ad8232.energiaDetector())
    // pruebas de las funciones compartidas (C++/ensamblador en hardware)
    serial.writeValue("abs", biomarcadores.valorAbsoluto(-42))
    serial.writeValue("recorte", biomarcadores.recortar(ad8232.valorFiltrado(), -300, 300))
    basic.pause(100)
})
