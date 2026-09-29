// El corazón late al ritmo real. Botón A: mostrar BPM. Botón B: señal simulada de 90 BPM.
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
    ad8232.usarSenalSimulada(90)
})
