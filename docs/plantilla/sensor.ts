/**
 * sensorx.ts — PLANTILLA de bloques públicos para un sensor.
 * Buscá y reemplazá "sensorx" / "SensorX" por el nombre real.
 */

//% color="#2E8B57" icon="" weight=90 block="SensorX"
//% groups='["Configuración", "Lectura", "Eventos"]'
namespace sensorx {

    // ---------------- estado ----------------
    let pin: AnalogPin = AnalogPin.P1;
    let activo = false;
    let periodoMs = 10;
    let ultimoCrudo = 0;
    let ultimoFiltrado = 0;
    const filtro = new biomarcadores.PromedioMovil(8);

    // ---------------- bucle de muestreo ----------------
    function muestrear(): void {
        ultimoCrudo = pins.analogReadPin(pin);
        // si el algoritmo está en sensorx-dsp.ts (TS/C++), llamalo acá:
        // ultimoFiltrado = sensorxdsp.filterStep(ultimoCrudo);
        ultimoFiltrado = filtro.agregar(ultimoCrudo);

        // ejemplo de evento: cruzar un umbral
        // if (ultimoFiltrado > 800) control.raiseEvent(biomarcadores.EVENT_SOURCE, biomarcadores.EventValue.Xxx);
    }

    // ---------------- bloques ----------------

    /**
     * Indica a qué pin está conectado el sensor.
     * @param p pin analógico, eg: AnalogPin.P1
     */
    //% blockId=sensorx_configurar
    //% block="configurar SensorX en %p"
    //% p.defl=AnalogPin.P1
    //% group="Configuración" weight=100
    export function configurar(p: AnalogPin): void {
        pin = p;
    }

    /**
     * Empieza a leer el sensor en segundo plano.
     * @param frecuenciaHz muestras por segundo, eg: 100
     */
    //% blockId=sensorx_iniciar
    //% block="iniciar SensorX a %frecuenciaHz Hz"
    //% frecuenciaHz.defl=100 frecuenciaHz.min=10 frecuenciaHz.max=500
    //% group="Configuración" weight=90
    export function iniciar(frecuenciaHz: number = 100): void {
        periodoMs = Math.max(1, Math.idiv(1000, frecuenciaHz));
        if (activo) return;
        activo = true;
        filtro.reiniciar();
        control.inBackground(() => {
            while (activo) {
                muestrear();
                basic.pause(periodoMs);
            }
        });
    }

    /**
     * Detiene la lectura en segundo plano.
     */
    //% blockId=sensorx_detener
    //% block="detener SensorX"
    //% group="Configuración" weight=80
    export function detener(): void {
        activo = false;
    }

    /**
     * Último valor crudo (0-1023).
     */
    //% blockId=sensorx_crudo
    //% block="SensorX valor crudo"
    //% group="Lectura" weight=100
    export function valorCrudo(): number {
        if (!activo) ultimoCrudo = pins.analogReadPin(pin);
        return ultimoCrudo;
    }

    /**
     * Último valor filtrado.
     */
    //% blockId=sensorx_filtrado
    //% block="SensorX valor filtrado"
    //% group="Lectura" weight=90
    export function valorFiltrado(): number {
        return ultimoFiltrado;
    }

    /**
     * Ejecuta el código cuando ocurre el evento del sensor.
     */
    //% blockId=sensorx_al_evento
    //% block="al detectar evento de SensorX"
    //% group="Eventos" weight=100
    export function alEvento(handler: () => void): void {
        // reemplazá Beat por el valor de EventValue que corresponda a tu sensor
        control.onEvent(biomarcadores.EVENT_SOURCE, biomarcadores.EventValue.Beat, handler);
    }
}
