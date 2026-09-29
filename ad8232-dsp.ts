/**
 * ad8232-dsp.ts
 * -------------
 * Procesador de señal ECG: la "cara TypeScript" del algoritmo.
 *
 * Cada función de este archivo tiene DOS implementaciones:
 *   - la anotación `//% shim=ad8232cpp::xxx` hace que en el micro:bit REAL se
 *     ejecute la función C++ del mismo nombre en `ad8232.cpp` (rápida, sin
 *     recolector de basura);
 *   - el cuerpo TypeScript escrito acá se usa SOLO en el SIMULADOR del
 *     navegador, que no puede ejecutar C++.
 *
 * Es el mismo mecanismo que usa el núcleo de micro:bit (ver `control.ramSize`
 * en pxt_modules/core/control.ts). Mantener las dos versiones con la misma
 * lógica es la regla número uno: si cambiás el algoritmo acá, cambialo allá.
 * Ver docs/07-cpp.md, sección "Simulador vs. hardware".
 *
 * Toda la aritmética es entera (punto fijo). El micro:bit V1 no tiene unidad
 * de punto flotante y los enteros son mucho más rápidos.
 */
namespace ad8232dsp {

    // --- Parámetros que dependen de la frecuencia de muestreo -------------
    // Se recalculan en setSampleRate(); los valores iniciales son para 200 Hz.
    let alfaBits = 6;             // pasa-altos: alfa = 1/64  (~0,32 s)
    let lpN = 5;                  // pasa-bajos: 5 muestras   (~25 ms)
    let intN = 8;                 // integración: 8 muestras  (~40 ms)
    let decaimientoBits = 8;      // envolvente: 1/256 por muestra (~1,3 s)
    let energiaMinimaEfectiva = 400;
    let hzActual = 200;

    // --- Filtro ---------------------------------------------------------
    let lineaDeBase = new biomarcadores.LineaDeBase(alfaBits);
    let pasaBajos = new biomarcadores.PromedioMovil(lpN);

    // --- Detector de latidos (estilo Pan-Tompkins simplificado) ---------
    // 1) derivada, 2) cuadrado, 3) integración en ventana, 4) umbral adaptativo.
    let ventanaEnergia = new biomarcadores.PromedioMovil(intN);
    let filtradoAnterior = 0;
    let envolvente = 0;
    let sensibilidad = 35;        // porcentaje de la envolvente usado como umbral
    let energiaMinima = 400;      // rechazo de ruido, referido a 200 Hz
    let ultimoLatidoMs = -100000; // instante del último latido detectado
    let porEncima = false;        // estado: ¿la energía ya cruzó el umbral?
    let ultimaEnergia = 0;
    const REFRACTARIO_MS = 250;   // no puede haber dos latidos en menos de 250 ms

    /** log2 entero redondeado (para elegir desplazamientos de bits). */
    function log2Redondeado(x: number): number {
        let bits = 0;
        while ((1 << (bits + 1)) <= x) bits++;
        // redondeo: si x está más cerca de la potencia siguiente, subir un bit
        if (x - (1 << bits) > (1 << (bits + 1)) - x) bits++;
        return bits;
    }

    /**
     * Ajusta las longitudes de los filtros a la frecuencia de muestreo (Hz),
     * para que el algoritmo funcione igual a 100 Hz que a 500 Hz.
     * @param hz muestras por segundo (50..500)
     */
    //% shim=ad8232cpp::setSampleRate
    export function setSampleRate(hz: number): void {
        hz = hz | 0;
        if (hz < 50) hz = 50;
        if (hz > 500) hz = 500;
        hzActual = hz;
        alfaBits = log2Redondeado(Math.idiv(hz * 32, 100));        // ~0,32 s
        lpN = Math.max(1, Math.idiv(hz + 20, 40));                 // ~25 ms
        intN = Math.max(2, Math.idiv(hz + 12, 25));                // ~40 ms
        decaimientoBits = log2Redondeado(Math.idiv(hz * 128, 100)); // ~1,3 s
        // la derivada por muestra crece cuando bajan los Hz: escalar el umbral
        energiaMinimaEfectiva = Math.idiv(energiaMinima * 40000, hz * hz);
        lineaDeBase = new biomarcadores.LineaDeBase(alfaBits);
        pasaBajos = new biomarcadores.PromedioMovil(lpN);
        ventanaEnergia = new biomarcadores.PromedioMovil(intN);
        reset();
    }

    /** Vuelve todo el estado del procesador a cero. */
    //% shim=ad8232cpp::reset
    export function reset(): void {
        lineaDeBase.reiniciar();
        pasaBajos.reiniciar();
        ventanaEnergia.reiniciar();
        filtradoAnterior = 0;
        envolvente = 0;
        ultimoLatidoMs = -100000;
        porEncima = false;
        ultimaEnergia = 0;
    }

    /** Umbral relativo a la envolvente, en porcentaje (5..95). */
    //% shim=ad8232cpp::setSensitivity
    export function setSensitivity(percent: number): void {
        percent = percent | 0;
        if (percent < 5) percent = 5;
        if (percent > 95) percent = 95;
        sensibilidad = percent;
    }

    /** Energía mínima para aceptar un latido (rechazo de ruido). */
    //% shim=ad8232cpp::setMinEnergy
    export function setMinEnergy(value: number): void {
        value = value | 0;
        if (value < 0) value = 0;
        if (value > 50000) value = 50000;
        energiaMinima = value;
        energiaMinimaEfectiva = Math.idiv(energiaMinima * 40000, hzActual * hzActual);
    }

    /**
     * Filtra una muestra cruda del conversor (0..1023) y devuelve la señal ECG
     * centrada en 0, sin deriva de línea de base y sin ruido de alta frecuencia.
     */
    //% shim=ad8232cpp::filterStep
    export function filterStep(raw: number): number {
        const sinBase = lineaDeBase.quitar(raw | 0);
        return pasaBajos.agregar(sinBase);
    }

    /**
     * Procesa una muestra ya filtrada y devuelve 1 si en esta muestra se
     * detectó un latido (complejo QRS), 0 en caso contrario.
     * @param filtered muestra devuelta por filterStep
     * @param nowMs tiempo actual en milisegundos (para el período refractario)
     */
    //% shim=ad8232cpp::detectStep
    export function detectStep(filtered: number, nowMs: number): number {
        filtered = filtered | 0;
        nowMs = nowMs | 0;

        // 1) derivada: resalta las pendientes bruscas del QRS
        const derivada = filtered - filtradoAnterior;
        filtradoAnterior = filtered;

        // 2) cuadrado: todo positivo (no importa la polaridad de los electrodos)
        //    y se amplifican los picos grandes frente al ruido chico.
        //    Se divide por 4 para mantener los números lejos del límite de 32 bits.
        const cuadrado = (derivada * derivada) >> 2;

        // 3) integración: ventana móvil que "ensancha" el pico
        const energia = ventanaEnergia.agregar(cuadrado);
        ultimaEnergia = energia;

        // 4) envolvente adaptativa: sigue los picos y decae lentamente
        //    (constante de tiempo ~1,3 s: 256 muestras a 200 Hz)
        if (energia > envolvente) {
            envolvente = energia;
        } else {
            envolvente -= envolvente >> decaimientoBits;
        }
        const umbral = Math.idiv(envolvente * sensibilidad, 100);

        let latido = 0;
        if (!porEncima) {
            if (energia > umbral && energia > energiaMinimaEfectiva
                && (nowMs - ultimoLatidoMs) > REFRACTARIO_MS) {
                porEncima = true;
                ultimoLatidoMs = nowMs;
                latido = 1;
            }
        } else if (energia < (umbral >> 1)) {
            // histéresis: recién volvemos a "armar" el detector cuando la
            // energía cae por debajo de la mitad del umbral
            porEncima = false;
        }
        return latido;
    }

    /** Última energía calculada (útil para calibrar la sensibilidad). */
    //% shim=ad8232cpp::energy
    export function energy(): number {
        return ultimaEnergia;
    }

    /** Envolvente actual de la energía. */
    //% shim=ad8232cpp::envelopeValue
    export function envelopeValue(): number {
        return envolvente;
    }
}
