# 01 — Cómo funciona una extensión de MakeCode

## Qué es MakeCode (pxt)

[MakeCode](https://makecode.microbit.org) es el editor de bloques/JavaScript/Python de micro:bit.
Por dentro se llama **pxt** ("Programming eXperience Toolkit"). Todo lo que ves en el editor
(bloques, simulador, compilador, descarga del `.hex`) lo hace pxt **en tu navegador**, salvo la
compilación de C++, que se hace en un servidor de Microsoft.

Una **extensión** es simplemente un repositorio de GitHub con un archivo `pxt.json` y código.
Cuando alguien la agrega a su proyecto (menú *Extensiones* → pega la URL), MakeCode descarga
los archivos listados en `pxt.json` y los compila junto con el programa del usuario.

## El viaje de un bloque hasta el micro:bit

```
Bloques ──(1)──> TypeScript ──(2)──> Simulador (JavaScript en el navegador)
                      │
                      └────(3)────> Ensamblador ARM Thumb ──(4)──> .hex ──> micro:bit
                                            ▲
        C++ / .s de la extensión ──(5)──> compilado en la nube (una vez, cacheado)
```

1. **Bloques → TypeScript.** Cada bloque es una función TypeScript con anotaciones `//%`.
   El editor genera el texto automáticamente (y al revés: TypeScript → bloques).
2. **TypeScript → simulador.** pxt compila el TypeScript a JavaScript y lo ejecuta en la
   página, con un micro:bit dibujado. El simulador no puede correr C++.
3. **TypeScript → ARM Thumb.** El compilador de pxt (escrito en TypeScript, corre en el
   navegador) traduce tu programa a ensamblador ARM Thumb y lo convierte a código máquina.
   No usa gcc: es un compilador propio, por eso el lenguaje es un *subconjunto* de TypeScript
   ("Static TypeScript", ver [05-javascript.md](05-javascript.md)).
4. **.hex.** El código máquina se "pega" al final de un firmware precompilado (el *runtime*:
   DAL/CODAL + funciones básicas en C++) y se descarga como `.hex`. Para micro:bit se genera
   un *hex universal* que contiene la versión V1 y V2 en el mismo archivo.
5. **C++ y ensamblador.** Si la extensión tiene archivos `.cpp`, `.h`, `.c` o `.s`, pxt los manda
   al servicio de compilación de MakeCode, que compila **todo el runtime + tus archivos** con
   `arm-none-eabi-gcc` y devuelve un nuevo runtime. Eso se cachea por hash, así que solo se
   compila cuando cambia el C++.

## Las dos placas: V1 y V2

| | micro:bit V1 | micro:bit V2 |
|---|---|---|
| CPU | nRF51822, **Cortex-M0** a 16 MHz | nRF52833, **Cortex-M4F** a 64 MHz |
| RAM / Flash | 16 KB / 256 KB | 128 KB / 512 KB |
| Runtime | **DAL** (mbed clásico), compilado con yotta y GCC 4.x | **CODAL**, compilado con CMake y GCC moderno |
| Conjunto de instrucciones | Thumb-1 (16 bits) | Thumb-2 (16/32 bits) + FPU |
| ADC | 10 bits (0..1023) | 12 bits, pero MakeCode lo escala a 0..1023 |

Consecuencias prácticas para tu extensión:
- Tu C++ se compila **dos veces** (una por placa). Tiene que compilar en las dos.
- Si escribís ensamblador, usá solo instrucciones **Thumb-1** para que sirva en ambas
  (ver [08-ensamblador.md](08-ensamblador.md)).
- En V1 no hay unidad de punto flotante: preferí enteros.
- El planificador de tareas ("fibers") tiene un tick de ~6 ms en V1 y ~4 ms en V2, así que
  `basic.pause(5)` no es exacto. Por eso esta extensión mide el tiempo real con
  `input.runningTime()` en lugar de suponerlo.

## Qué contiene una extensión mínima

```
mi-extension/
├── pxt.json        ← manifiesto (nombre, versión, archivos, dependencias)
├── README.md       ← se muestra en MakeCode al agregar la extensión
├── main.ts         ← funciones con //% que se convierten en bloques
└── test.ts         ← programa de prueba (solo se compila dentro de este repo)
```

Con eso ya funciona. C++, ensamblador, traducciones e íconos son opcionales y se agregan
como se describe en los siguientes documentos.

## Cómo probar una extensión sin publicarla

1. Subí el repo a GitHub (público).
2. En MakeCode: *Extensiones* → pegá `https://github.com/usuario/repo`.
3. MakeCode lee `pxt.json` de la rama por defecto (o de un *tag* `vX.Y.Z` si existe;
   ver [11-pruebas-ci-y-publicacion.md](11-pruebas-ci-y-publicacion.md)).

También podés compilar localmente con la línea de comandos `pxt` (mismo documento 11).
