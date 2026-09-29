# 12 — Glosario y referencias

## Glosario

| Término | Significado |
|---|---|
| **pxt** | Motor de MakeCode (compilador, editor, simulador). "Extensión pxt" = extensión MakeCode |
| **Target** | Una plataforma de MakeCode: `microbit`, `arcade`, `maker`… Esta extensión es para `microbit` |
| **DAL** | *Device Abstraction Layer*: runtime C++ del micro:bit V1 (sobre mbed) |
| **CODAL** | *Component Oriented Device Abstraction Layer*: runtime del micro:bit V2 (y de Arcade) |
| **Static TypeScript (STS)** | Subconjunto de TypeScript que pxt compila directo a ARM |
| **Shim** | Función C++ expuesta a TypeScript mediante `//%`; su declaración vive en `shims.d.ts` |
| **Fiber** | Hilo cooperativo del micro:bit; `control.inBackground`, `basic.forever` y los eventos crean fibers |
| **Evento** | Par (fuente, valor) que viaja por el bus de mensajes del micro:bit; `control.raiseEvent` / `control.onEvent` |
| **Hex universal** | Archivo `.hex` que contiene el firmware V1 y V2 juntos |
| **Thumb / Thumb-2** | Conjuntos de instrucciones de 16 (y 32) bits de ARM Cortex-M |
| **AAPCS** | Convención de llamada de ARM: argumentos en r0-r3, resultado en r0 |
| **Punto fijo** | Representar decimales con enteros desplazados (p. ej. `x << 8` = 8 bits de fracción) |
| **ECG** | Electrocardiograma: actividad eléctrica del corazón |
| **QRS** | El pico grande de cada latido en el ECG; lo que detecta el algoritmo |
| **Intervalo RR** | Tiempo entre dos picos R consecutivos; 60000 / RR(ms) = BPM |
| **HRV** | Variabilidad de la frecuencia cardíaca: cuánto cambian los RR |
| **Lead-off** | Detección del AD8232 de que un electrodo está suelto (pines LO+ / LO-) |
| **PPG** | Fotopletismografía: pulso medido con luz (MAX30102, PulseSensor) |
| **GSR / EDA** | Respuesta galvánica de la piel: conductancia relacionada con el estrés |

## Referencias oficiales

- Extensiones MakeCode: <https://makecode.com/extensions>
- Definir bloques (`//%`): <https://makecode.com/defining-blocks>
- Playground de bloques (probar anotaciones en vivo): <https://makecode.com/playground>
- pxt.json: <https://makecode.com/extensions/pxt-json>
- Localización: <https://makecode.com/extensions/localization>
- Aprobación de extensiones: <https://makecode.com/extensions/approval>
- Código fuente de pxt: <https://github.com/microsoft/pxt>
- Código fuente del target micro:bit (con el C++ del núcleo en `libs/core`): <https://github.com/microsoft/pxt-microbit>
- CODAL micro:bit: <https://github.com/lancaster-university/codal-microbit-v2>
- DAL micro:bit (V1): <https://github.com/lancaster-university/microbit-dal>
- Instrucciones Cortex-M0: <https://developer.arm.com/documentation/dui0497/a>
- GCC inline assembly: <https://gcc.gnu.org/onlinedocs/gcc/Extended-Asm.html>
- AD8232 hoja de datos: <https://www.analog.com/en/products/ad8232.html>
- Guía SparkFun del AD8232: <https://learn.sparkfun.com/tutorials/ad8232-heart-rate-monitor-hookup-guide>
- Pan, J. & Tompkins, W. J. (1985). *A Real-Time QRS Detection Algorithm*. IEEE Trans. Biomed. Eng.
- MicroPython para micro:bit: <https://microbit-micropython.readthedocs.io>
