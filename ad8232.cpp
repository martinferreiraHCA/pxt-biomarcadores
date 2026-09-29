/*
 * ad8232.cpp
 * ----------
 * Procesador de señal ECG en C++ para el micro:bit real.
 * Es la copia exacta de `ad8232-sim.ts` (que corre en el simulador).
 *
 * ¿Por qué C++ acá? El procesamiento se ejecuta 200 veces por segundo; en C++
 * cada paso cuesta unos pocos microsegundos y no crea objetos en el heap, lo
 * que deja libre al intérprete de TypeScript para el programa del usuario.
 *
 * Solo se usan enteros de 32 bits y desplazamientos: nada de float (el
 * micro:bit V1 no tiene FPU) y nada de memoria dinámica.
 */
#include "pxt.h"

namespace ad8232cpp {

    // ------------------------------------------------------------------
    // Parámetros que dependen de la frecuencia de muestreo
    // (se recalculan en setSampleRate; valores iniciales para 200 Hz)
    // ------------------------------------------------------------------
    static int  hzActual = 200;
    static int  alfaBits = 6;            // pasa-altos: alfa = 1/64 (~0,32 s)
    static int  lpN = 5;                 // pasa-bajos: 5 muestras (~25 ms)
    static int  intN = 8;                // integración: 8 muestras (~40 ms)
    static int  decaimientoBits = 8;     // envolvente: 1/256 por muestra (~1,3 s)
    static int  energiaMinimaEfectiva = 400;

    // ------------------------------------------------------------------
    // Estado del filtro
    // ------------------------------------------------------------------
    static int  baseAcumulador = 0;          // línea de base con 8 bits fraccionarios
    static bool baseInicializada = false;

    static const int LP_MAX = 16;            // buffer máximo del pasa-bajos
    static int  lpBuffer[LP_MAX];
    static int  lpIndice = 0;
    static int  lpSuma = 0;
    static int  lpLlenos = 0;

    // ------------------------------------------------------------------
    // Estado del detector de latidos
    // ------------------------------------------------------------------
    static const int INT_MAX_N = 32;         // buffer máximo de integración
    static int  intBuffer[INT_MAX_N];
    static int  intIndice = 0;
    static int  intSuma = 0;
    static int  intLlenos = 0;

    static int  filtradoAnterior = 0;
    static int  envolvente = 0;
    static int  sensibilidad = 35;           // % de la envolvente usado como umbral
    static int  energiaMinima = 400;         // referido a 200 Hz
    static int  ultimoLatidoMs = -100000;
    static bool porEncima = false;
    static int  ultimaEnergia = 0;
    static const int REFRACTARIO_MS = 250;

    // log2 entero redondeado (para elegir desplazamientos de bits)
    static int log2Redondeado(int x) {
        int bits = 0;
        while ((1 << (bits + 1)) <= x) bits++;
        if (x - (1 << bits) > (1 << (bits + 1)) - x) bits++;
        return bits;
    }

    /**
     * Vuelve todo el estado del procesador a cero.
     */
    //%
    void reset() {
        baseAcumulador = 0;
        baseInicializada = false;
        for (int i = 0; i < LP_MAX; i++) lpBuffer[i] = 0;
        lpIndice = 0; lpSuma = 0; lpLlenos = 0;
        for (int i = 0; i < INT_MAX_N; i++) intBuffer[i] = 0;
        intIndice = 0; intSuma = 0; intLlenos = 0;
        filtradoAnterior = 0;
        envolvente = 0;
        ultimoLatidoMs = -100000;
        porEncima = false;
        ultimaEnergia = 0;
    }

    /**
     * Ajusta las longitudes de los filtros a la frecuencia de muestreo (Hz),
     * para que el algoritmo funcione igual a 100 Hz que a 500 Hz.
     * @param hz muestras por segundo (50..500)
     */
    //%
    void setSampleRate(int hz) {
        if (hz < 50) hz = 50;
        if (hz > 500) hz = 500;
        hzActual = hz;
        alfaBits = log2Redondeado(hz * 32 / 100);          // ~0,32 s
        lpN = (hz + 20) / 40; if (lpN < 1) lpN = 1;        // ~25 ms
        if (lpN > LP_MAX) lpN = LP_MAX;
        intN = (hz + 12) / 25; if (intN < 2) intN = 2;     // ~40 ms
        if (intN > INT_MAX_N) intN = INT_MAX_N;
        decaimientoBits = log2Redondeado(hz * 128 / 100);  // ~1,3 s
        energiaMinimaEfectiva = (energiaMinima * 40000) / (hz * hz);
        reset();
    }

    /**
     * Umbral relativo a la envolvente, en porcentaje (5..95).
     * @param percent porcentaje
     */
    //%
    void setSensitivity(int percent) {
        if (percent < 5) percent = 5;
        if (percent > 95) percent = 95;
        sensibilidad = percent;
    }

    /**
     * Energía mínima para aceptar un latido (rechazo de ruido).
     * @param value energía mínima
     */
    //%
    void setMinEnergy(int value) {
        if (value < 0) value = 0;
        if (value > 50000) value = 50000;
        energiaMinima = value;
        energiaMinimaEfectiva = (energiaMinima * 40000) / (hzActual * hzActual);
    }

    /**
     * Filtra una muestra cruda del conversor (0..1023) y devuelve la señal ECG
     * centrada en 0, sin deriva de línea de base y sin ruido de alta frecuencia.
     * @param raw muestra cruda del ADC
     */
    //%
    int filterStep(int raw) {
        // pasa-altos (seguidor de línea de base en punto fijo)
        if (!baseInicializada) {
            baseAcumulador = raw << 8;
            baseInicializada = true;
        }
        baseAcumulador += ((raw << 8) - baseAcumulador) >> alfaBits;
        int sinBase = raw - (baseAcumulador >> 8);

        // pasa-bajos (promedio móvil con suma acumulada, O(1) por muestra)
        lpSuma += sinBase - lpBuffer[lpIndice];
        lpBuffer[lpIndice] = sinBase;
        lpIndice = (lpIndice + 1) % lpN;
        if (lpLlenos < lpN) lpLlenos++;
        return lpSuma / lpLlenos;
    }

    /**
     * Procesa una muestra ya filtrada y devuelve 1 si se detectó un latido
     * (complejo QRS) en esta muestra, 0 en caso contrario.
     * @param filtered muestra devuelta por filterStep
     * @param nowMs tiempo actual en milisegundos
     */
    //%
    int detectStep(int filtered, int nowMs) {
        // 1) derivada
        int derivada = filtered - filtradoAnterior;
        filtradoAnterior = filtered;

        // 2) cuadrado (independiente de la polaridad), reducido para no desbordar
        int cuadrado = (derivada * derivada) >> 2;

        // 3) integración en ventana móvil
        intSuma += cuadrado - intBuffer[intIndice];
        intBuffer[intIndice] = cuadrado;
        intIndice = (intIndice + 1) % intN;
        if (intLlenos < intN) intLlenos++;
        int energia = intSuma / intLlenos;
        ultimaEnergia = energia;

        // 4) envolvente adaptativa con decaimiento lento
        if (energia > envolvente) {
            envolvente = energia;
        } else {
            envolvente -= envolvente >> decaimientoBits;
        }
        int umbral = (envolvente * sensibilidad) / 100;

        int latido = 0;
        if (!porEncima) {
            if (energia > umbral && energia > energiaMinimaEfectiva
                && (nowMs - ultimoLatidoMs) > REFRACTARIO_MS) {
                porEncima = true;
                ultimoLatidoMs = nowMs;
                latido = 1;
            }
        } else if (energia < (umbral >> 1)) {
            porEncima = false;
        }
        return latido;
    }

    /**
     * Última energía calculada (útil para calibrar la sensibilidad).
     */
    //%
    int energy() {
        return ultimaEnergia;
    }

    /**
     * Envolvente actual de la energía.
     */
    //%
    int envelopeValue() {
        return envolvente;
    }
}
