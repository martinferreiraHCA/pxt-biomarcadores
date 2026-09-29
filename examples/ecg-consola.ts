// Graficar el ECG en la consola de MakeCode ("Mostrar consola Dispositivo").
// Cada muestra filtrada sale como "ecg:valor"; además "energia" y "bpm" 10 veces por segundo.
ad8232.iniciar(200)

basic.forever(function () {
    ad8232.enviarPorSerial()
    serial.writeValue("energia", ad8232.energiaDetector())
    serial.writeValue("bpm", ad8232.frecuenciaCardiaca())
    basic.pause(100)
})
