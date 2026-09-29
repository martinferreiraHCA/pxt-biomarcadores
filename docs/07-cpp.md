# 07 — Agregar código C++

## Cuándo conviene C++

- Procesamiento por muestra a cientos de Hz (filtros, detección de picos): esta extensión.
- Acceso a hardware que MakeCode no expone (registros del nRF, periféricos, DMA).
- Bibliotecas existentes en C/C++ (drivers de fabricantes).

Cuándo **no**: para lógica simple, C++ solo agrega complejidad y una compilación en la nube.
Si el mismo algoritmo en TypeScript alcanza (probalo en V1, que es la placa lenta), quedate en TypeScript.

## El mecanismo en 5 pasos

### 1. Escribir la función con `//%`

```cpp
// ad8232.cpp
#include "pxt.h"                 // siempre; trae el DAL/CODAL y los tipos de pxt

namespace ad8232cpp {            // el namespace es el "módulo" visible desde TS

    static int envolvente = 0;   // estado privado: variables static

    /**
     * Comentario de documentación: se copia a shims.d.ts y es el tooltip.
     * @param raw muestra cruda del ADC
     */
    //%                          // ← sin esto, la función NO es visible desde TypeScript
    int filterStep(int raw) {
        ...
        return resultado;
    }
}
```

### 2. Listar el archivo en `pxt.json`

`"files": [..., "ad8232.cpp", "shims.d.ts", "enums.d.ts"]`. Los `.h` se listan antes que
los `.cpp` que los usan. También se aceptan `.c`, `.s` y `.S` (pero esos **no** se analizan
en busca de `//%`; ver doc 08).

### 3. Generar `shims.d.ts` con `pxt build`

`pxt build` (o `pxt buildshims`) lee los `//%` y escribe:

```ts
// shims.d.ts (GENERADO)
declare namespace ad8232cpp {
    /** ... */
    //% shim=ad8232cpp::filterStep
    function filterStep(raw: int32): int32;
}
```

Commiteá `shims.d.ts` y `enums.d.ts`: MakeCode no los regenera al importar la extensión
desde GitHub. Si cambiás una firma en C++ y te olvidás de regenerarlos, el programa del
usuario llama a la función con los tipos viejos.

### 4. Compilar el C++ en la nube

`pxt build --cloud` manda **todos** los `.cpp/.h/.c/.s` de tu extensión más los del núcleo
al servicio de MakeCode, que compila dos firmwares (V1 con GCC 4.x + yotta, V2 con GCC
moderno + CMake). El resultado se cachea por hash de los fuentes: los usuarios nunca esperan.
Un error de compilación se muestra en la consola local con la salida completa de gcc.

El editor web hace exactamente lo mismo cuando alguien agrega la extensión: por eso es
importante que el C++ compile antes de publicar (doc 11: CI).

### 5. Dar una versión para el simulador

**El simulador no puede ejecutar C++.** Hay que decirle qué hacer. La forma oficial (la
misma que usa el núcleo de micro:bit) es declarar en TypeScript una función con
`//% shim=` **y cuerpo**:

```ts
// ad8232-dsp.ts
namespace ad8232dsp {
    //% shim=ad8232cpp::filterStep          // en el micro:bit real llama al C++
    export function filterStep(raw: number): number {
        // este cuerpo SOLO se usa en el simulador
        ...misma lógica en TypeScript...
    }
}
```

Regla de pxt: si una función tiene `shim=` y un cuerpo no vacío, el compilador nativo ignora
el cuerpo y llama al C++; el compilador del simulador ignora el `shim=` y usa el cuerpo.
Fijate en `pxt_modules/core/control.ts` después de un `pxt install`: `control.ramSize()` está
hecho así (`//% shim=control::_ramSize` + `return 32 * 1024 * 1024`).

Ojo: la función TS y la declaración de `shims.d.ts` **no pueden tener el mismo nombre
completo** (sería una declaración duplicada). Por eso usamos namespaces distintos:
`ad8232cpp.filterStep` (C++, en shims.d.ts) y `ad8232dsp.filterStep` (TS con cuerpo).
El núcleo lo resuelve con un guion bajo: `control::_ramSize` vs `control.ramSize`.

Otra opción es detectar en tiempo de ejecución dónde corre el programa:
`biomarcadores.esSimulador()` (que compara `control.ramSize()` con 1 MB) y elegir una u
otra implementación con un `if`. Es útil cuando el comportamiento debe ser distinto (por
ejemplo, esta extensión enciende la señal ECG simulada solo en el simulador).

## Tipos permitidos en la frontera TS ↔ C++

| C++ | TypeScript | Notas |
|---|---|---|
| `int` | `int32` / `number` | El más rápido y seguro. Usalo siempre que puedas |
| `bool` | `boolean` | |
| `TNumber` | `number` | Puede ser double; hay que convertir con `toDouble()` / `fromDouble()` |
| `String` | `string` | Cadena de pxt (`String` es `pxt::String`), no `std::string` |
| `Buffer` | `Buffer` | Bytes crudos; `buf->data`, `buf->length` |
| `Action` | `() => void` | Callback; se invoca con `pxt::runAction0(a)` |
| `void` | `void` | |

No se pueden pasar arrays de TS ni objetos de clases directamente. Si necesitás muchos
datos, usá `Buffer`.

## Acceso al hardware desde C++

`pxt.h` da acceso al objeto global `uBit` (DAL/CODAL). Ejemplos:

```cpp
uBit.io.P0.getAnalogValue();          // leer analógico (0..1023)
uBit.io.P1.getDigitalValue();         // leer digital
uBit.display.image.setPixelValue(2, 2, 255);
uBit.sleep(10);                        // pausa cooperativa (cede a otras fibers)
system_timer_current_time();          // milisegundos desde el arranque
```

Como V1 (DAL) y V2 (CODAL) tienen APIs parecidas pero no idénticas, se usa `#if MICROBIT_CODAL`
para separar código por placa. Mirá `pxt_modules/core/*.cpp` tras `pxt install`: es la
mejor referencia de "cómo se hace en las dos".

En esta extensión el C++ es **puro cálculo** a propósito: no toca `uBit`. Así compila igual
en las dos placas, se puede probar en la PC con `g++` (`herramientas/equivalencia-cpp/`)
y la parte de hardware (pines, tiempos, eventos) queda en TypeScript, donde el simulador la
entiende.

## Limitaciones y trampas

- **Nada de excepciones ni RTTI ni STL pesada** (`std::vector`, `std::string`): el runtime
  se compila con `-fno-exceptions -fno-rtti`, y la memoria es mínima (16 KB en V1).
- Las variables `static` viven para siempre: son el estado del driver. No hay destructores.
- Nunca bloquees (bucle esperando): usá `uBit.sleep()` o mejor, hacé el bucle en TS.
- `int` es de 32 bits. `int * int` desborda a partir de ±2 147 483 647: por eso
  `(derivada * derivada) >> 2` en el detector reduce el rango.
- Los comentarios `/** */` que estén **justo antes** de una función con `//%` van a
  `shims.d.ts`; un comentario de cabecera de archivo con `/** */` también se copia (por eso
  las cabeceras de los `.cpp` acá usan `/* */`).
- Cambiar el cuerpo de una función C++ = nueva compilación en la nube (~1-2 minutos la
  primera vez). Cambiar solo TypeScript = instantáneo.
- Errores típicos: olvidar `//%` (la función "no existe"), olvidar listar el `.cpp` en
  `pxt.json`, usar `float` en V1 sin saber que es software, usar sintaxis unificada de
  ensamblador en V1 (doc 08).

## Depurar

- `pxt build --cloud` muestra la salida de gcc si algo falla (buscá "error:" en el log).
- En el micro:bit no hay `printf`; el equivalente es `uBit.serial.printf(...)` en C++ o,
  mejor, devolver valores a TS y usar `serial.writeValue`. Así se calibró el detector:
  el bloque "energía del detector" existe para eso.
- Probá el algoritmo en la PC primero: `herramientas/equivalencia-cpp/probar.sh` compila
  `ad8232.cpp` con `g++` (con un `pxt.h` vacío) y compara la salida con la de TypeScript,
  muestra por muestra. Si son iguales en la PC, son iguales en el micro:bit.
