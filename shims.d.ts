// Auto-generated. Do not edit.
declare namespace biomarcadorescpp {

    /**
     * Valor absoluto usando ensamblador INLINE (dentro de C++).
     *
     * Truco clásico sin saltos:  s = x >> 31  (0 si x >= 0, -1 si x < 0)
     *                            r = (x ^ s) - s
     * Solo usa instrucciones Thumb-1 de 16 bits con registros bajos (r0-r7),
     * por eso compila igual para Cortex-M0 (V1) y Cortex-M4 (V2).
     * @param x valor de entrada
     */
    //% shim=biomarcadorescpp::absAsm
    function absAsm(x: int32): int32;

    /**
     * Recorta un valor al rango [minimo, maximo]. La implementación real está
     * en biomarcadores_asm.s; esta función C++ es solo el "puente" que MakeCode
     * puede ver (los archivos .s no se analizan en busca de `//%`).
     * @param x valor a recortar
     * @param minimo límite inferior
     * @param maximo límite superior
     */
    //% shim=biomarcadorescpp::clampAsm
    function clampAsm(x: int32, minimo: int32, maximo: int32): int32;

    /**
     * Versión de referencia en C++ puro de clamp, para comparar con la de
     * ensamblador y para mostrar cómo se ve una función "normal".
     */
    //% shim=biomarcadorescpp::clampCpp
    function clampCpp(x: int32, minimo: int32, maximo: int32): int32;
}
declare namespace ad8232cpp {

    /**
     * Vuelve todo el estado del procesador a cero.
     */
    //% shim=ad8232cpp::reset
    function reset(): void;

    /**
     * Ajusta las longitudes de los filtros a la frecuencia de muestreo (Hz),
     * para que el algoritmo funcione igual a 100 Hz que a 500 Hz.
     * @param hz muestras por segundo (50..500)
     */
    //% shim=ad8232cpp::setSampleRate
    function setSampleRate(hz: int32): void;

    /**
     * Umbral relativo a la envolvente, en porcentaje (5..95).
     * @param percent porcentaje
     */
    //% shim=ad8232cpp::setSensitivity
    function setSensitivity(percent: int32): void;

    /**
     * Energía mínima para aceptar un latido (rechazo de ruido).
     * @param value energía mínima
     */
    //% shim=ad8232cpp::setMinEnergy
    function setMinEnergy(value: int32): void;

    /**
     * Filtra una muestra cruda del conversor (0..1023) y devuelve la señal ECG
     * centrada en 0, sin deriva de línea de base y sin ruido de alta frecuencia.
     * @param raw muestra cruda del ADC
     */
    //% shim=ad8232cpp::filterStep
    function filterStep(raw: int32): int32;

    /**
     * Procesa una muestra ya filtrada y devuelve 1 si se detectó un latido
     * (complejo QRS) en esta muestra, 0 en caso contrario.
     * @param filtered muestra devuelta por filterStep
     * @param nowMs tiempo actual en milisegundos
     */
    //% shim=ad8232cpp::detectStep
    function detectStep(filtered: int32, nowMs: int32): int32;

    /**
     * Última energía calculada (útil para calibrar la sensibilidad).
     */
    //% shim=ad8232cpp::energy
    function energy(): int32;

    /**
     * Envolvente actual de la energía.
     */
    //% shim=ad8232cpp::envelopeValue
    function envelopeValue(): int32;
}

// Auto-generated. Do not edit. Really.
