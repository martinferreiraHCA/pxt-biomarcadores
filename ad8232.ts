/**
 * ad8232.ts
 * ---------
 * API pública (bloques, JavaScript y Python) del sensor de ECG AD8232.
 *
 * Este archivo es el "frente" del sensor: define los bloques que ve el usuario
 * y organiza el trabajo. El procesamiento pesado está en:
 *   - ad8232-dsp.ts   -> declara las funciones y da la versión para el simulador
 *   - ad8232.cpp      -> la misma lógica en C++, corre en el micro:bit real
 * y las piezas reutilizables (contador de latidos, filtros) en biomarcadores.ts.
 *
 * Conexión típica (ver docs/09-sensor-ad8232.md):
 *   AD8232 OUTPUT -> P0 (analógico)     AD8232 3.3V -> 3V
 *   AD8232 LO+    -> P1 (digital)       AD8232 GND  -> GND
 *   AD8232 LO-    -> P2 (digital)       AD8232 SDN  -> sin conectar (o 3V)
 */

//% color="#E5373A" icon="" weight=100 block="AD8232 (ECG)"
//% groups='["Configuración", "Lectura", "Latidos", "Eventos", "Avanzado"]'
namespace ad8232 {

    // ------------------------------------------------------------------
    // Estado interno
    // ------------------------------------------------------------------
    let pinSenal: AnalogPin = AnalogPin.P0;
    let pinLoMas: DigitalPin = DigitalPin.P1;
    let pinLoMenos: DigitalPin = DigitalPin.P2;
    let configurado = false;

    let activo = false;
    let periodoMs = 5;
    let ultimoCrudo = 512;
    let ultimoFiltrado = 0;
    let desconectados = false;

    // señal simulada: 0 = desactivada, >0 = frecuencia en BPM
    let bpmSimulado = 0;
    let simuladoDecidido = false;

    // muestras filtradas pendientes de enviar por serial
    const PENDIENTES_MAX = 64;
    let pendientes: number[] = [];

    const latidos = new biomarcadores.ContadorDeLatidos(4);

    // ------------------------------------------------------------------
    // Señal ECG sintética (para probar sin sensor y para el simulador)
    // ------------------------------------------------------------------
    /** Forma triangular: sube de 0 a `alto` y baja a 0 entre `desde` y `hasta` ms. */
    function triangulo(t: number, desde: number, hasta: number, alto: number): number {
        if (t < desde || t > hasta) return 0;
        const mitad = (hasta - desde) >> 1;
        const pos = t - desde;
        if (pos <= mitad) return Math.idiv(alto * pos, mitad);
        return Math.idiv(alto * (hasta - t), mitad);
    }

    /** Genera un valor "crudo" (0..1023) de un ECG idealizado en el instante dado. */
    function senalSintetica(ahoraMs: number): number {
        const periodo = Math.idiv(60000, bpmSimulado);
        const t = ahoraMs % periodo;
        let v = 512;                              // línea de base (1,65 V)
        v += triangulo(t, 0, 90, 35);             // onda P (~90 ms)
        v -= triangulo(t, 100, 112, 45);          // Q
        v += triangulo(t, 112, 152, 420);         // R (el pico grande, ~40 ms)
        v -= triangulo(t, 152, 170, 90);          // S
        v += triangulo(t, 250, 400, 110);         // onda T (~150 ms)
        v += Math.randomRange(-3, 3);             // un poco de ruido
        return v;
    }

    function usarSintetica(): boolean {
        if (!simuladoDecidido) {
            simuladoDecidido = true;
            // en el simulador no hay sensor: encendemos la señal simulada
            if (biomarcadores.esSimulador() && bpmSimulado == 0) bpmSimulado = 72;
        }
        return bpmSimulado > 0;
    }

    function leerPinCrudo(): number {
        if (usarSintetica()) return senalSintetica(input.runningTime());
        return pins.analogReadPin(pinSenal);
    }

    // ------------------------------------------------------------------
    // Bucle de muestreo (corre en segundo plano)
    // ------------------------------------------------------------------
    function muestrear(): void {
        const ahora = input.runningTime();

        // 1) detección de electrodos desconectados (LO+ / LO- en alto)
        let sinContacto = false;
        if (!usarSintetica()) {
            sinContacto = pins.digitalReadPin(pinLoMas) == 1
                || pins.digitalReadPin(pinLoMenos) == 1;
        }
        if (sinContacto != desconectados) {
            desconectados = sinContacto;
            if (desconectados) {
                ad8232dsp.reset();
                latidos.reiniciar();
                control.raiseEvent(biomarcadores.EVENT_SOURCE, biomarcadores.EventValue.LeadsOff);
            } else {
                control.raiseEvent(biomarcadores.EVENT_SOURCE, biomarcadores.EventValue.LeadsOn);
            }
        }

        // 2) muestra cruda -> filtro -> detector
        ultimoCrudo = leerPinCrudo();
        ultimoFiltrado = ad8232dsp.filterStep(ultimoCrudo);
        if (pendientes.length < PENDIENTES_MAX) pendientes.push(ultimoFiltrado);

        if (!desconectados) {
            if (ad8232dsp.detectStep(ultimoFiltrado, ahora) == 1) {
                latidos.registrar(ahora);
                control.raiseEvent(biomarcadores.EVENT_SOURCE, biomarcadores.EventValue.Beat);
            }
        }
    }

    // ------------------------------------------------------------------
    // Bloques: Configuración
    // ------------------------------------------------------------------

    /**
     * Indica a qué pines está conectado el AD8232.
     * @param senal pin analógico conectado a OUTPUT, eg: AnalogPin.P0
     * @param loMas pin digital conectado a LO+, eg: DigitalPin.P1
     * @param loMenos pin digital conectado a LO-, eg: DigitalPin.P2
     */
    //% blockId=ad8232_configurar
    //% block="configurar AD8232 salida %senal LO+ %loMas LO- %loMenos"
    //% senal.defl=AnalogPin.P0 loMas.defl=DigitalPin.P1 loMenos.defl=DigitalPin.P2
    //% group="Configuración" weight=100
    export function configurar(senal: AnalogPin, loMas: DigitalPin, loMenos: DigitalPin): void {
        pinSenal = senal;
        pinLoMas = loMas;
        pinLoMenos = loMenos;
        pins.setPull(pinLoMas, PinPullMode.PullDown);
        pins.setPull(pinLoMenos, PinPullMode.PullDown);
        configurado = true;
    }

    /**
     * Empieza a muestrear el ECG en segundo plano a la frecuencia indicada.
     * A partir de este momento funcionan los bloques de lectura y latidos.
     * @param frecuenciaHz muestras por segundo, eg: 200
     */
    //% blockId=ad8232_iniciar
    //% block="iniciar monitoreo ECG a %frecuenciaHz Hz"
    //% frecuenciaHz.defl=200 frecuenciaHz.min=50 frecuenciaHz.max=500
    //% group="Configuración" weight=90
    export function iniciar(frecuenciaHz: number = 200): void {
        if (!configurado) configurar(AnalogPin.P0, DigitalPin.P1, DigitalPin.P2);
        if (frecuenciaHz < 50) frecuenciaHz = 50;
        if (frecuenciaHz > 500) frecuenciaHz = 500;
        periodoMs = Math.max(1, Math.idiv(1000, frecuenciaHz));
        if (activo) return;
        activo = true;
        // adapta los filtros a la frecuencia real: 1000 / periodo (p. ej. 200 Hz)
        ad8232dsp.setSampleRate(Math.idiv(1000, periodoMs));
        latidos.reiniciar();
        control.inBackground(() => {
            while (activo) {
                muestrear();
                basic.pause(periodoMs);
            }
        });
    }

    /**
     * Detiene el muestreo en segundo plano.
     */
    //% blockId=ad8232_detener
    //% block="detener monitoreo ECG"
    //% group="Configuración" weight=80
    export function detener(): void {
        activo = false;
    }

    /**
     * Usa una señal de ECG generada por software en lugar del sensor.
     * Sirve para probar el programa sin hardware. Con 0 BPM se vuelve al sensor.
     * En el simulador la señal simulada está activa por defecto (72 BPM).
     * @param bpm frecuencia cardíaca simulada, eg: 72
     */
    //% blockId=ad8232_senal_simulada
    //% block="usar señal ECG simulada a %bpm BPM"
    //% bpm.defl=72 bpm.min=0 bpm.max=220
    //% group="Configuración" weight=70
    export function usarSenalSimulada(bpm: number): void {
        simuladoDecidido = true;
        bpmSimulado = bpm < 0 ? 0 : (bpm | 0);
        desconectados = false;
        ad8232dsp.reset();
        latidos.reiniciar();
    }

    // ------------------------------------------------------------------
    // Bloques: Lectura
    // ------------------------------------------------------------------

    /**
     * Última muestra cruda del conversor analógico (0 a 1023).
     * Si el monitoreo no está iniciado, lee el pin en este momento.
     */
    //% blockId=ad8232_crudo
    //% block="ECG valor crudo (0-1023)"
    //% group="Lectura" weight=100
    export function valorCrudo(): number {
        if (!activo) ultimoCrudo = leerPinCrudo();
        return ultimoCrudo;
    }

    /**
     * Última muestra filtrada: señal ECG centrada en 0, sin deriva ni ruido.
     * Requiere haber iniciado el monitoreo.
     */
    //% blockId=ad8232_filtrado
    //% block="ECG valor filtrado"
    //% group="Lectura" weight=90
    export function valorFiltrado(): number {
        return ultimoFiltrado;
    }

    /**
     * Verdadero si el sensor informa que algún electrodo está desconectado
     * (pines LO+ o LO- en alto).
     */
    //% blockId=ad8232_desconectados
    //% block="¿electrodos desconectados?"
    //% group="Lectura" weight=80
    export function electrodosDesconectados(): boolean {
        if (!activo && !usarSintetica()) {
            return pins.digitalReadPin(pinLoMas) == 1 || pins.digitalReadPin(pinLoMenos) == 1;
        }
        return desconectados;
    }

    /**
     * Envía por el puerto serie todas las muestras filtradas que todavía no se
     * enviaron, en el formato "ecg:valor" (una por línea). Ponelo dentro de un
     * bloque "para siempre" y abrí la consola de MakeCode para ver el gráfico.
     */
    //% blockId=ad8232_serial
    //% block="enviar muestras ECG por serial"
    //% group="Lectura" weight=70
    export function enviarPorSerial(): void {
        while (pendientes.length > 0) {
            serial.writeValue("ecg", pendientes.shift());
        }
    }

    // ------------------------------------------------------------------
    // Bloques: Latidos
    // ------------------------------------------------------------------

    /**
     * Frecuencia cardíaca en latidos por minuto (promedio de los últimos
     * latidos). Devuelve 0 hasta que se detectan dos latidos seguidos.
     */
    //% blockId=ad8232_bpm
    //% block="frecuencia cardíaca (BPM)"
    //% group="Latidos" weight=100
    export function frecuenciaCardiaca(): number {
        return latidos.bpm();
    }

    /**
     * Tiempo en milisegundos entre los dos últimos latidos (intervalo RR).
     * Es la base para medir variabilidad de la frecuencia cardíaca (HRV).
     */
    //% blockId=ad8232_rr
    //% block="intervalo RR (ms)"
    //% group="Latidos" weight=90
    export function intervaloRR(): number {
        return latidos.intervaloRR();
    }

    /**
     * Cantidad de latidos detectados desde que se inició el monitoreo.
     */
    //% blockId=ad8232_cantidad_latidos
    //% block="cantidad de latidos"
    //% group="Latidos" weight=80
    export function cantidadLatidos(): number {
        return latidos.cantidad();
    }

    /**
     * Milisegundos transcurridos desde el último latido (-1 si no hubo ninguno).
     */
    //% blockId=ad8232_desde_ultimo
    //% block="ms desde el último latido"
    //% group="Latidos" weight=70
    export function tiempoDesdeUltimoLatido(): number {
        return latidos.desdeUltimo(input.runningTime());
    }

    // ------------------------------------------------------------------
    // Bloques: Eventos
    // ------------------------------------------------------------------

    /**
     * Ejecuta el código cada vez que se detecta un latido (complejo QRS).
     */
    //% blockId=ad8232_al_latido
    //% block="al detectar latido"
    //% group="Eventos" weight=100
    export function alDetectarLatido(handler: () => void): void {
        control.onEvent(biomarcadores.EVENT_SOURCE, biomarcadores.EventValue.Beat, handler);
    }

    /**
     * Ejecuta el código cuando los electrodos se desconectan o se vuelven a
     * conectar. El parámetro indica el nuevo estado.
     */
    //% blockId=ad8232_al_cambiar_electrodos
    //% block="al cambiar electrodos $desconectados"
    //% draggableParameters="reporter"
    //% group="Eventos" weight=90
    export function alCambiarElectrodos(handler: (desconectados: boolean) => void): void {
        control.onEvent(biomarcadores.EVENT_SOURCE, biomarcadores.EventValue.LeadsOff, () => handler(true));
        control.onEvent(biomarcadores.EVENT_SOURCE, biomarcadores.EventValue.LeadsOn, () => handler(false));
    }

    // ------------------------------------------------------------------
    // Bloques: Avanzado
    // ------------------------------------------------------------------

    /**
     * Ajusta qué tan alto debe ser un pico respecto de los anteriores para
     * contarlo como latido. Menor = más sensible (más falsos positivos);
     * mayor = más estricto (puede perder latidos). Valor inicial: 35.
     * @param porcentaje umbral relativo, eg: 35
     */
    //% blockId=ad8232_sensibilidad
    //% block="ajustar umbral de latido a %porcentaje \\%"
    //% porcentaje.defl=35 porcentaje.min=5 porcentaje.max=95
    //% group="Avanzado" weight=100
    export function ajustarUmbral(porcentaje: number): void {
        ad8232dsp.setSensitivity(porcentaje);
    }

    /**
     * Energía mínima para aceptar un latido. Subilo si hay latidos falsos con
     * la señal "plana"; bajalo si la señal es muy débil. Valor inicial: 400.
     * @param energia energía mínima, eg: 400
     */
    //% blockId=ad8232_energia_minima
    //% block="ajustar energía mínima de latido a %energia"
    //% energia.defl=400 energia.min=0
    //% group="Avanzado" weight=90
    export function ajustarEnergiaMinima(energia: number): void {
        ad8232dsp.setMinEnergy(energia);
    }

    /**
     * Energía instantánea del detector de latidos. Graficala junto con la
     * señal para entender cómo se toma la decisión y calibrar el umbral.
     */
    //% blockId=ad8232_energia
    //% block="energía del detector"
    //% group="Avanzado" weight=80
    export function energiaDetector(): number {
        return ad8232dsp.energy();
    }

    /**
     * Verdadero si el monitoreo está activo.
     */
    //% blockId=ad8232_activo
    //% block="¿monitoreo ECG activo?"
    //% group="Avanzado" weight=70
    export function monitoreoActivo(): boolean {
        return activo;
    }
}
