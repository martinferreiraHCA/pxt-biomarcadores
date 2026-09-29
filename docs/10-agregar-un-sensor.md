# 10 — Agregar un sensor nuevo, paso a paso

Vamos a suponer que querés agregar un sensor de pulso óptico (por ejemplo un **MAX30102** por
I2C o un **PulseSensor** analógico) o uno de respuesta galvánica de la piel (**GSR**). El
procedimiento es el mismo para cualquiera. En `docs/plantilla/` hay archivos de partida.

## Paso 0: decidir qué necesita el sensor

| Pregunta | Si la respuesta es… | Entonces |
|---|---|---|
| ¿Cómo se lee? | Analógico (`pins.analogReadPin`) | Solo TypeScript |
| | I2C / SPI (`pins.i2cReadBuffer`, `pins.spiWrite`) | TypeScript alcanza; C++ solo si el timing es crítico |
| ¿Hay que procesar a > 100 Hz? | Sí (detección de picos, filtros) | TypeScript primero; C++ si V1 no llega |
| ¿Produce "eventos"? | Sí (latido, umbral cruzado) | Usar `biomarcadores.EVENT_SOURCE` + un `EventValue` nuevo |
| ¿Hay que calcular una frecuencia? | Sí | Reutilizar `biomarcadores.ContadorDeLatidos` |

## Paso 1: copiar la plantilla

```bash
cp docs/plantilla/sensor.ts       mi-sensor.ts
cp docs/plantilla/sensor-dsp.ts   mi-sensor-dsp.ts     # solo si va a tener C++
cp docs/plantilla/sensor.cpp      mi-sensor.cpp        # solo si va a tener C++
```

Reemplazá `sensorx` por el nombre del chip en minúsculas (namespace `max30102`, archivos
`max30102.ts`…). Elegí un color y un ícono distintos para la categoría.

## Paso 2: registrarlo en pxt.json

```json
"files": [
    "README.md",
    "biomarcadores.ts",
    "ad8232-dsp.ts", "ad8232.ts", "ad8232.cpp",
    "mi-sensor-dsp.ts", "mi-sensor.ts", "mi-sensor.cpp",
    "biomarcadores.cpp", "biomarcadores_asm.s",
    "shims.d.ts", "enums.d.ts"
]
```

## Paso 3: escribir los bloques (mi-sensor.ts)

Seguí el mismo patrón de `ad8232.ts`:
1. estado en variables del namespace,
2. `configurar(...)` para los pines / dirección I2C,
3. `iniciar(hz)` que lanza `control.inBackground` con el bucle de muestreo,
4. bloques de lectura que devuelven el último valor,
5. eventos con `control.raiseEvent(biomarcadores.EVENT_SOURCE, biomarcadores.EventValue.Xxx)`.

Agregá los valores nuevos al enum `EventValue` en `biomarcadores.ts`:

```ts
export const enum EventValue {
    Beat = 1, LeadsOff = 2, LeadsOn = 3,
    //% block="dedo detectado"
    FingerOn = 4,
    //% block="dedo retirado"
    FingerOff = 5,
}
```

Si tu sensor también detecta latidos (PPG), reutilizá `Beat` y `ContadorDeLatidos`: así el
bloque "al detectar latido" de cualquier sensor se comporta igual.

## Paso 4: el algoritmo (mi-sensor-dsp.ts y, si hace falta, mi-sensor.cpp)

- Escribilo **primero en TypeScript**, en enteros, en `mi-sensor-dsp.ts`, sin `shim=`.
- Probalo en Node con `herramientas/prueba-node/` (agregá tu caso a `prueba.ts`).
- Si en el micro:bit V1 se queda corto (medí con `input.runningTime()` cuánto tarda cada
  muestra), pasá el algoritmo a `mi-sensor.cpp` copiándolo línea por línea, agregá
  `//% shim=misensorcpp::funcion` a cada función TS, corré `pxt build --cloud` y agregá tu
  caso a `herramientas/equivalencia-cpp/` para comprobar que las dos versiones coinciden.

## Paso 5: probar

1. `test.ts`: agregá un par de bloques del sensor nuevo para que se compile.
2. `pxt build --cloud` (doc 11) tiene que terminar sin errores.
3. Abrí el repo en MakeCode (Importar → GitHub → URL de tu rama) y revisá que los bloques
   se vean bien y funcionen en el simulador (poné `usarSenalSimulada`-equivalente si tu
   sensor no puede simularse con el deslizador del pin).
4. Probá en un micro:bit V1 y en uno V2.

## Paso 6: documentar y traducir

- `docs/13-sensor-mi-sensor.md` con conexión, bloques y algoritmo (copiá la estructura de
  [09-sensor-ad8232.md](09-sensor-ad8232.md)).
- Ejemplo en `examples/`.
- Textos en inglés en `_locales/en/biomarcadores-strings.json`.
- Sección en el README principal.

## Ejemplo resumido: sensor analógico simple (GSR)

Un GSR (conductancia de la piel) es solo `pins.analogReadPin` suavizado. Cabe entero en
TypeScript:

```ts
//% color="#2E8B57" icon="" block="GSR"
namespace gsr {
    let pin = AnalogPin.P1;
    const filtro = new biomarcadores.PromedioMovil(16);
    let ultimo = 0;
    let activo = false;

    //% block="configurar GSR en %p" p.defl=AnalogPin.P1
    export function configurar(p: AnalogPin) { pin = p; }

    //% block="iniciar GSR"
    export function iniciar() {
        if (activo) return;
        activo = true;
        control.inBackground(() => {
            while (activo) { ultimo = filtro.agregar(pins.analogReadPin(pin)); basic.pause(20); }
        });
    }

    //% block="conductancia (0-1023)"
    export function valor(): number { return ultimo; }
}
```

Fijate cómo reutiliza `biomarcadores.PromedioMovil`: la extensión crece sin duplicar código.
