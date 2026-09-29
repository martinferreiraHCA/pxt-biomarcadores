/**
 * sensorx-dsp.ts — PLANTILLA del algoritmo de procesamiento.
 *
 * 1) Escribilo primero SOLO en TypeScript (sin las líneas `//% shim=`).
 * 2) Si más adelante lo pasás a C++ (sensorx.cpp), agregá `//% shim=sensorxcpp::nombre`
 *    a cada función: el cuerpo pasa a usarse solo en el simulador.
 */
namespace sensorxdsp {

    let acumulador = 0;

    /** Vuelve el estado a cero. */
    // //% shim=sensorxcpp::reset
    export function reset(): void {
        acumulador = 0;
    }

    /**
     * Procesa una muestra y devuelve el valor filtrado.
     * @param raw muestra cruda
     */
    // //% shim=sensorxcpp::filterStep
    export function filterStep(raw: number): number {
        raw = raw | 0;
        // ejemplo: filtro exponencial alfa = 1/8, en punto fijo con 4 bits fraccionarios
        acumulador += ((raw << 4) - acumulador) >> 3;
        return acumulador >> 4;
    }
}
