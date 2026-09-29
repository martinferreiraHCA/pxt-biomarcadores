# 04 — TypeScript y bloques: cómo se define un bloque

Un bloque de MakeCode es **una función TypeScript exportada dentro de un namespace, con
comentarios `//%`** justo antes. El editor lee esas anotaciones para dibujar el bloque.
Esta es la anatomía de uno de los bloques de la extensión:

```ts
//% color="#E5373A" icon="" weight=100 block="AD8232 (ECG)"     // ← la CATEGORÍA
//% groups='["Configuración", "Lectura", "Latidos", "Eventos", "Avanzado"]'
namespace ad8232 {

    /**
     * Empieza a muestrear el ECG en segundo plano a la frecuencia indicada.   ← tooltip
     * @param frecuenciaHz muestras por segundo, eg: 200                       ← valor de ejemplo
     */
    //% blockId=ad8232_iniciar                            ← id único (nunca lo cambies después)
    //% block="iniciar monitoreo ECG a %frecuenciaHz Hz"  ← texto del bloque; %param = ranura
    //% frecuenciaHz.defl=200 frecuenciaHz.min=50 frecuenciaHz.max=500
    //% group="Configuración" weight=90                   ← grupo y orden dentro de la categoría
    export function iniciar(frecuenciaHz: number = 200): void {
        ...
    }
}
```

## La categoría (namespace)

| Atributo | Significado |
|---|---|
| `color="#E5373A"` | Color de la categoría y de todos sus bloques |
| `icon=""` | Ícono de [Font Awesome 5](https://fontawesome.com/v5/search?m=free) en unicode (`` = heartbeat, `` = stethoscope, `` = thermometer) |
| `weight=100` | Orden en la barra de categorías (más alto = más arriba) |
| `block="AD8232 (ECG)"` | Nombre visible (si no, se usa el nombre del namespace) |
| `groups='[...]'` | Subtítulos dentro de la categoría, en ese orden |
| `advanced=true` | La categoría aparece bajo "Avanzado" |

Varias extensiones (o varios archivos) pueden aportar al **mismo** namespace: por eso
`biomarcadores.ts` y un futuro `max30102.ts` pueden compartir la categoría "Biomarcadores"
si así lo querés. En esta extensión cada sensor tiene su categoría propia y "Biomarcadores"
tiene lo común.

## Tipos de bloque según la función

| Firma de la función | Bloque que genera |
|---|---|
| `function f(): void` | Bloque de **acción** (con muescas arriba/abajo) |
| `function f(): number` | Bloque **reportero** redondeado |
| `function f(): boolean` | Bloque reportero **hexagonal** (condición) |
| `function f(handler: () => void)` | Bloque **evento** (sombrero) con un hueco adentro |
| `function f(handler: (x: number) => void)` + `draggableParameters="reporter"` | Evento con variables arrastrables |

Ejemplo del evento con parámetro (de `ad8232.ts`):

```ts
//% blockId=ad8232_al_cambiar_electrodos
//% block="al cambiar electrodos $desconectados"      // $param = variable del handler
//% draggableParameters="reporter"
export function alCambiarElectrodos(handler: (desconectados: boolean) => void): void {
    control.onEvent(biomarcadores.EVENT_SOURCE, biomarcadores.EventValue.LeadsOff, () => handler(true));
    control.onEvent(biomarcadores.EVENT_SOURCE, biomarcadores.EventValue.LeadsOn, () => handler(false));
}
```

## Parámetros

- `%nombre` en `block=` crea la ranura; `$nombre` hace lo mismo y además sirve para
  parámetros de handlers.
- `nombre.defl=valor` valor por defecto en el bloque (para enums: `senal.defl=AnalogPin.P0`).
- `nombre.min=` / `nombre.max=` limita el número y muestra un deslizador con
  `nombre.fieldEditor="numberdropdown"` o directamente un slider si hay min y max.
- `nombre.shadow=` fuerza un bloque sombra, p. ej. `"timePicker"` o `"colorNumberPicker"`.
- `eg:` en el `@param` del comentario da el valor de ejemplo en JavaScript/Python.
- `expandableArgumentMode="toggle"` esconde parámetros opcionales detrás de un "+".
- Los **enums** de TypeScript generan menús desplegables automáticamente. Cada valor puede
  tener su texto con `//% block="..."`:

```ts
export const enum EventValue {
    //% block="latido detectado"
    Beat = 1,
    //% block="electrodos desconectados"
    LeadsOff = 2,
}
```

`const enum` se reemplaza por números al compilar (no ocupa memoria). Si querés usar el
enum desde C++, definilo en un `.h` con `//%` para que quede en `enums.d.ts` (doc 07).

## Eventos: cómo se implementa "al detectar latido"

El micro:bit tiene un bus de eventos. Un evento es un par `(fuente, valor)`:

```ts
// biomarcadores.ts: elegimos un número de fuente que no choque con el sistema (1..1023)
export const EVENT_SOURCE = 7801;

// ad8232.ts: cuando el detector encuentra un latido...
control.raiseEvent(biomarcadores.EVENT_SOURCE, biomarcadores.EventValue.Beat);

// ...y el bloque "al detectar latido" simplemente registra el handler:
export function alDetectarLatido(handler: () => void): void {
    control.onEvent(biomarcadores.EVENT_SOURCE, biomarcadores.EventValue.Beat, handler);
}
```

`control.onEvent` crea una *fiber* (hilo cooperativo) que ejecuta el handler cada vez que
llega el evento, sin bloquear el resto del programa.

## Trabajo en segundo plano

`control.inBackground(() => { while (activo) { muestrear(); basic.pause(periodoMs); } })`
lanza una fiber que muestrea el sensor sin que el usuario tenga que poner nada en su
`forever`. Es la forma correcta de hacer un "driver" que corre solo. Reglas:

- Siempre hay que ceder el control (`basic.pause`, `control.waitMicros` bloquea sin ceder).
- Un `while (true)` sin pausa congela el micro:bit.
- Las fibers comparten variables globales sin problema (no hay verdadero paralelismo).

## Estilo y detalles que evitan dolores de cabeza

- **`blockId` es para siempre.** Los proyectos de los usuarios guardan el `blockId`; si lo
  cambiás, sus bloques desaparecen. Podés cambiar `block=` (el texto) cuando quieras.
- Los nombres de funciones y parámetros también viajan al JavaScript/Python de los
  usuarios: cambiarlos rompe programas. Si necesitás renombrar, dejá la función vieja
  marcada con `//% deprecated=true`.
- Usá `export function` para lo público; lo que no tiene `export` queda privado al archivo.
- Un `//% block` sin `blockId` funciona, pero el id generado automáticamente puede cambiar.
- La documentación `/** ... */` justo antes es el *tooltip* del bloque. Vale la pena.
- Comprobá que cada bloque aparece bien: abrí el repo en MakeCode (Importar → GitHub) y
  mirá la paleta. `pxt build` no detecta textos feos, solo errores de compilación.
- Para que el bloque tenga texto en otros idiomas ver `_locales/` en el doc 11.

## Referencia oficial

Todas las anotaciones posibles: <https://makecode.com/defining-blocks>. Ejemplos de
enums, sombras, campos personalizados y más: <https://makecode.com/playground>.
