# 05 — JavaScript (en realidad, TypeScript estático)

> Nota: cuando en MakeCode se habla de "JavaScript" se refiere a **TypeScript** (JavaScript
> con tipos). No tiene nada que ver con **Java**. Esta extensión está escrita en TypeScript.

## Qué subconjunto se puede usar

El compilador de pxt convierte TypeScript directamente a código ARM. Para lograrlo
soporta un subconjunto llamado **Static TypeScript (STS)**. Lo importante:

| Sí funciona | No funciona (o funciona distinto) |
|---|---|
| `let`, `const`, funciones, arrow functions, closures | `var` con hoisting raro (usá `let`) |
| `number` (entero de 31 bits o double según haga falta), `boolean`, `string` | `any`, `unknown` (evitalos) |
| Clases con campos, métodos, constructores, herencia simple | `interface` con implementación dinámica, `instanceof` complejo |
| Arrays (`number[]`), `push`, `pop`, `shift`, `indexOf`, `length` | Métodos con callbacks tipo `map` en V1 (existen pero son lentos) |
| `enum`, `const enum` | Expresiones regulares, `JSON.parse` (existe en V2 con `JSON`) |
| `Math.idiv`, `Math.abs`, `Math.min`, `Math.max`, `Math.randomRange` | `try/catch` en V1 (recién desde pxt-microbit v5 en V2) |
| Operadores de bits `<<`, `>>`, `|`, `&`, `^` | `eval`, `new Function`, prototipos |
| Template strings `` `ecg:${v}` `` | `undefined` vs `null` sutilezas (tratalos igual) |

### Enteros y decimales

`number` es un entero de 31 bits mientras el valor "quepa"; si hacés `7 / 2` pasa a ser
`3.5` (double, mucho más lento en V1). Para trabajar en enteros, que es lo que quiere el
procesamiento de señal:

```ts
const promedio = Math.idiv(suma, cantidad);   // división entera
const mitad = x >> 1;                         // división por 2 (con signo)
const truncado = valor | 0;                   // fuerza entero
```

En `ad8232-dsp.ts` todo el algoritmo está escrito así (punto fijo) para que el mismo código
sirva de referencia para la versión C++ y para que corra rápido en V1.

## Usar la extensión desde JavaScript

Todo bloque es una función. El nombre es `namespace.funcion`:

```ts
ad8232.configurar(AnalogPin.P0, DigitalPin.P1, DigitalPin.P2)
ad8232.iniciar(200)

ad8232.alDetectarLatido(function () {
    basic.showIcon(IconNames.Heart)
    basic.pause(80)
    basic.showIcon(IconNames.SmallHeart)
})

basic.forever(function () {
    // enviar la señal filtrada y los BPM por USB para graficar en la consola de MakeCode
    ad8232.enviarPorSerial()
    serial.writeValue("bpm", ad8232.frecuenciaCardiaca())
    basic.pause(100)
})
```

Las funciones internas (sin bloque) también son públicas desde JavaScript, por ejemplo
`ad8232dsp.filterStep(valor)` si querés procesar tus propias muestras, o
`biomarcadores.PromedioMovil` para armar tu propio filtro:

```ts
const filtro = new biomarcadores.PromedioMovil(8)
basic.forever(function () {
    const luz = filtro.agregar(input.lightLevel())
    led.plotBarGraph(luz, 255)
    basic.pause(20)
})
```

## Cómo pasar de bloques a texto y volver

En el editor, el botón "JavaScript" muestra el texto generado por los bloques. Al volver a
"Bloques", MakeCode intenta reconstruirlos; si escribiste algo que no tiene bloque (una
clase, por ejemplo) se envuelve en un bloque gris "JavaScript". Es normal.

## Estructura del código de un driver (patrón usado en ad8232.ts)

1. **Estado** en variables de nivel superior del namespace (`let activo = false; ...`).
2. **Bucle de muestreo** privado (`function muestrear()`), que corre en segundo plano.
3. **Bloques** públicos que solo leen/escriben ese estado: así los bloques son instantáneos
   y el usuario no tiene que preocuparse por el tiempo.
4. **Eventos** para las cosas que "pasan" (latido, electrodo desconectado).

Este patrón es el que conviene replicar para cualquier sensor nuevo (doc 10).
