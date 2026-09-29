/**
 * biomarcadores.ts
 * ----------------
 * Código COMPARTIDO por todos los sensores de la extensión.
 *
 * Aquí vive lo que no depende de un sensor concreto:
 *   - detección de si el programa corre en el simulador o en el micro:bit real,
 *   - identificadores de eventos,
 *   - utilidades de procesamiento de señal (filtros, detección de latidos),
 *   - un contador de intervalos RR para calcular frecuencia (latidos por minuto).
 *
 * Cuando agregues un nuevo sensor (ver docs/10-agregar-un-sensor.md) reutilizá
 * estas piezas en lugar de copiarlas.
 */

//% color="#5C2D91" icon="" weight=90 block="Biomarcadores"
//% groups='["Estado", "Filtros", "Avanzado"]'
namespace biomarcadores {

    /**
     * Fuente de eventos de la extensión. Los sensores publican eventos con
     * `control.raiseEvent(EVENT_SOURCE, valor)` y los usuarios los reciben con
     * `control.onEvent(EVENT_SOURCE, valor, handler)`.
     *
     * micro:bit reserva los identificadores bajos (1..1023) para el sistema; un
     * número grande y "raro" evita choques con otras extensiones.
     */
    export const EVENT_SOURCE = 7801;

    /** Valores de evento que publican los sensores. */
    export const enum EventValue {
        //% block="latido detectado"
        Beat = 1,
        //% block="electrodos desconectados"
        LeadsOff = 2,
        //% block="electrodos conectados"
        LeadsOn = 3,
    }

    let _simulador: boolean = null;

    /**
     * Devuelve verdadero si el programa se está ejecutando en el simulador del
     * navegador (y no en un micro:bit real).
     *
     * Truco: `control.ramSize()` es una función C++ (`control::_ramSize`) cuyo
     * cuerpo TypeScript solo se usa en el simulador y devuelve 32 MB; el
     * micro:bit real devuelve su RAM verdadera (16 KB en V1, 128 KB en V2).
     * El resultado se guarda en caché porque se consulta seguido.
     */
    //% blockId=biomarcadores_es_simulador
    //% block="¿está en el simulador?"
    //% group="Estado" weight=50
    export function esSimulador(): boolean {
        if (_simulador === null) {
            _simulador = control.ramSize() > 1024 * 1024;
        }
        return _simulador;
    }

    /**
     * Valor absoluto de un entero.
     *
     * Ejemplo mínimo del patrón "una función, dos implementaciones":
     *   - `//% shim=biomarcadorescpp::absAsm` hace que en el micro:bit REAL se
     *     llame a la función C++/ensamblador de biomarcadores.cpp,
     *   - el cuerpo TypeScript de abajo se usa SOLO en el simulador.
     * Es el mismo mecanismo que usa el núcleo de micro:bit (por ejemplo en
     * `control.ramSize()`). Ver docs/07-cpp.md.
     * @param x valor de entrada
     */
    //% blockId=biomarcadores_abs
    //% block="valor absoluto de %x"
    //% group="Avanzado" weight=20
    //% shim=biomarcadorescpp::absAsm
    export function valorAbsoluto(x: number): number {
        // solo simulador
        return x < 0 ? -x : x;
    }

    /**
     * Recorta un valor al rango [minimo, maximo]. En el micro:bit real corre
     * la rutina escrita en ensamblador puro (biomarcadores_asm.s) a través del
     * puente C++ `biomarcadorescpp::clampAsm`; en el simulador, este cuerpo.
     * @param x valor a recortar
     * @param minimo límite inferior
     * @param maximo límite superior
     */
    //% blockId=biomarcadores_clamp
    //% block="recortar %x entre %minimo y %maximo"
    //% group="Avanzado" weight=10
    //% shim=biomarcadorescpp::clampAsm
    export function recortar(x: number, minimo: number, maximo: number): number {
        // solo simulador
        if (x < minimo) return minimo;
        if (x > maximo) return maximo;
        return x;
    }

    // ------------------------------------------------------------------
    // Utilidades de procesamiento de señal (100% TypeScript, reutilizables)
    // ------------------------------------------------------------------

    /**
     * Promedio móvil de N muestras con buffer circular y suma acumulada:
     * cada muestra cuesta O(1), sin recorrer el buffer.
     */
    export class PromedioMovil {
        private buffer: number[];
        private indice: number;
        private suma: number;
        private llenos: number;

        constructor(tamano: number) {
            if (tamano < 1) tamano = 1;
            this.buffer = [];
            for (let i = 0; i < tamano; i++) this.buffer.push(0);
            this.indice = 0;
            this.suma = 0;
            this.llenos = 0;
        }

        /** Agrega una muestra y devuelve el promedio actual (entero). */
        agregar(x: number): number {
            x = x | 0;
            this.suma += x - this.buffer[this.indice];
            this.buffer[this.indice] = x;
            this.indice = (this.indice + 1) % this.buffer.length;
            if (this.llenos < this.buffer.length) this.llenos++;
            return Math.idiv(this.suma, this.llenos);
        }

        reiniciar(): void {
            for (let i = 0; i < this.buffer.length; i++) this.buffer[i] = 0;
            this.indice = 0;
            this.suma = 0;
            this.llenos = 0;
        }
    }

    /**
     * Seguidor de línea de base (filtro pasa-altos de primer orden) en punto
     * fijo. `alfaBits = 6` significa alfa = 1/64: a 200 Hz elimina la deriva
     * lenta (< ~0,5 Hz) y conserva la señal cardíaca.
     */
    export class LineaDeBase {
        private acumulador: number;   // valor de base con 8 bits fraccionarios
        private alfaBits: number;
        private inicializado: boolean;

        constructor(alfaBits: number) {
            this.alfaBits = alfaBits;
            this.acumulador = 0;
            this.inicializado = false;
        }

        /** Devuelve la muestra sin componente continua (centrada en 0). */
        quitar(x: number): number {
            x = x | 0;
            if (!this.inicializado) {
                this.acumulador = x << 8;
                this.inicializado = true;
            }
            this.acumulador += ((x << 8) - this.acumulador) >> this.alfaBits;
            return x - (this.acumulador >> 8);
        }

        reiniciar(): void {
            this.inicializado = false;
            this.acumulador = 0;
        }
    }

    /**
     * Convierte marcas de tiempo de latidos en frecuencia (latidos por minuto)
     * a partir del promedio de los últimos intervalos RR válidos.
     * Sirve para ECG (AD8232), pulsioximetría (MAX30102), etc.
     */
    export class ContadorDeLatidos {
        private ultimoLatidoMs: number;
        private intervalos: number[];
        private maxIntervalos: number;
        private ultimoRR: number;
        private total: number;

        constructor(cantidadPromedio: number) {
            this.maxIntervalos = cantidadPromedio > 0 ? cantidadPromedio : 4;
            this.intervalos = [];
            this.ultimoLatidoMs = -1;
            this.ultimoRR = 0;
            this.total = 0;
        }

        /**
         * Registra un latido en el instante `ahoraMs`. Devuelve verdadero si el
         * intervalo fue fisiológicamente plausible (300 ms a 2000 ms, es decir
         * 30 a 200 BPM).
         */
        registrar(ahoraMs: number): boolean {
            this.total++;
            if (this.ultimoLatidoMs < 0) {
                this.ultimoLatidoMs = ahoraMs;
                return false;
            }
            const rr = ahoraMs - this.ultimoLatidoMs;
            this.ultimoLatidoMs = ahoraMs;
            if (rr < 300 || rr > 2000) {
                return false;
            }
            this.ultimoRR = rr;
            this.intervalos.push(rr);
            if (this.intervalos.length > this.maxIntervalos) {
                this.intervalos.shift();
            }
            return true;
        }

        /** Frecuencia en latidos por minuto (0 si todavía no hay datos). */
        bpm(): number {
            if (this.intervalos.length == 0) return 0;
            let suma = 0;
            for (let i = 0; i < this.intervalos.length; i++) suma += this.intervalos[i];
            const promedio = Math.idiv(suma, this.intervalos.length);
            if (promedio <= 0) return 0;
            return Math.idiv(60000, promedio);
        }

        /** Último intervalo RR válido en milisegundos (0 si no hay). */
        intervaloRR(): number {
            return this.ultimoRR;
        }

        /** Cantidad total de latidos registrados desde el reinicio. */
        cantidad(): number {
            return this.total;
        }

        /** Milisegundos desde el último latido (-1 si nunca hubo). */
        desdeUltimo(ahoraMs: number): number {
            if (this.ultimoLatidoMs < 0) return -1;
            return ahoraMs - this.ultimoLatidoMs;
        }

        reiniciar(): void {
            this.intervalos = [];
            this.ultimoLatidoMs = -1;
            this.ultimoRR = 0;
            this.total = 0;
        }
    }
}
