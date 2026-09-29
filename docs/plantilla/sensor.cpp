/*
 * sensorx.cpp — PLANTILLA de la versión C++ del algoritmo (opcional).
 * Debe hacer EXACTAMENTE lo mismo que sensorx-dsp.ts.
 * Después de agregarlo a pxt.json: `pxt build --cloud` regenera shims.d.ts.
 */
#include "pxt.h"

namespace sensorxcpp {

    static int acumulador = 0;

    /**
     * Vuelve el estado a cero.
     */
    //%
    void reset() {
        acumulador = 0;
    }

    /**
     * Procesa una muestra y devuelve el valor filtrado.
     * @param raw muestra cruda
     */
    //%
    int filterStep(int raw) {
        acumulador += ((raw << 4) - acumulador) >> 3;
        return acumulador >> 4;
    }
}
