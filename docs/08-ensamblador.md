# 08 — Ensamblador

Hay tres lugares donde aparece ensamblador ARM en una extensión, y esta usa los tres:

1. **El que genera el compilador de pxt** a partir de tu TypeScript (para leer y aprender).
2. **Ensamblador inline** dentro de una función C++ (`__asm__`), en `biomarcadores.cpp`.
3. **Un archivo `.s` completo** escrito a mano, en `biomarcadores_asm.s`.

## Lo mínimo de ARM Cortex-M que hay que saber

- **Registros**: `r0`–`r12` de propósito general, `sp` (r13, pila), `lr` (r14, dirección de
  retorno), `pc` (r15). Las Cortex-M0 (V1) solo pueden usar `r0`–`r7` en la mayoría de las
  instrucciones de 16 bits ("registros bajos").
- **Convención de llamada (AAPCS)**: los primeros 4 argumentos enteros van en `r0`–`r3`, el
  resultado vuelve en `r0`. `r0`–`r3` y `r12` los puede pisar la función llamada; `r4`–`r11`
  hay que guardarlos (`push {r4, lr}` … `pop {r4, pc}`) si se usan.
- **Thumb**: las Cortex-M solo ejecutan el conjunto Thumb. Thumb-1 (V1) son instrucciones de
  16 bits; Thumb-2 (V2) agrega instrucciones de 32 bits, multiplicación larga, división por
  hardware, FPU, `ssat`, etc. **Si escribís Thumb-1, corre en las dos placas.**
- En Thumb-1 casi todas las instrucciones aritméticas actualizan las banderas y llevan el
  sufijo `s`: `movs`, `adds`, `subs`, `lsls`, `asrs`, `eors`.
- Banderas: `cmp` compara; `bge`, `ble`, `beq`, `bne`… saltan según el resultado.

Referencia rápida: <https://developer.arm.com/documentation/dui0497/a/the-cortex-m0-instruction-set>

## 1. Ver el ensamblador que genera el compilador

Después de `pxt build --cloud` quedan `built/mbdal-binary.asm` (V1) y
`built/mbcodal-binary.asm` (V2): **todo tu programa TypeScript traducido**. Por ejemplo, el
bloque "energía del detector" (`ad8232.energiaDetector`) que solo hace
`return ad8232dsp.energy()` queda así en V1:

```asm
; Function ad8232.ts(366,5): ad8232.energiaDetector
ad8232_energiaDetector__P958:
    push {lr}                ; guardar dirección de retorno
    mov r7, sp
    str r7, [r6, #4]         ; contabilidad del recolector de basura de pxt
    bl ad8232cpp::energy     ; ← llamada al C++ (el shim); resultado en r0
    bl _numops_fromInt       ; convertir el int de C++ a "number" de TypeScript
    pop {pc}                 ; volver
```

Se ve claramente cómo el `//% shim=ad8232cpp::energy` se convierte en un `bl` (branch with
link) a la función C++, y cómo cada `number` de TypeScript tiene una representación propia
(entero "etiquetado" o double en el heap) que hay que convertir.

Para ver también el C++ compilado (y el `.s`), hay que desensamblar el `.hex`:

```bash
# convertir hex -> elf no es directo; pero se puede desensamblar bytes crudos:
arm-none-eabi-objcopy -I ihex -O binary built/mbdal-binary.hex built/mbdal.bin
arm-none-eabi-objdump -D -b binary -marm -Mforce-thumb built/mbdal.bin | less
```

(`arm-none-eabi-*` viene con "GNU Arm Embedded Toolchain"). En el repositorio se comprobó
que la rutina `bio_clamp` del `.s` está en el firmware buscando sus bytes exactos
(`88 42 01 da 08 00 70 47 …`) en los dos `.hex`.

## 2. Ensamblador inline en C++

De `biomarcadores.cpp`, el valor absoluto sin saltos:

```cpp
//%
int absAsm(int x) {
    int resultado;
    int signo;
    __asm__ volatile(
        BIO_ASM_INICIO           // ".syntax unified\n\t" — ver más abajo
        "movs %0, %2\n\t"        // resultado = x
        "asrs %1, %2, #31\n\t"   // signo = x >> 31  (0 si x >= 0, -1 si x < 0)
        "eors %0, %1\n\t"        // resultado ^= signo   (invierte bits si negativo)
        "subs %0, %0, %1\n\t"    // resultado -= signo   (suma 1 si negativo)
        BIO_ASM_FIN
        : "=&l"(resultado), "=&l"(signo)   // salidas: registros BAJOS (l), early-clobber (&)
        : "l"(x)                            // entrada: registro bajo
        : "cc");                            // avisamos que tocamos las banderas
    return resultado;
}
```

Cómo leerlo:
- `%0`, `%1`, `%2` son los operandos en el orden en que aparecen tras los `:` (salidas y
  después entradas). GCC elige los registros; nosotros solo pedimos que sean bajos (`l`)
  para que las instrucciones de 16 bits de Thumb-1 sean válidas.
- `=&l` = salida ("=") en registro bajo ("l") que no puede compartir registro con una entrada
  ("&", *early clobber*), porque la escribimos antes de terminar de leer `%2`.
- `"cc"` en la lista de *clobbers* dice que modificamos las banderas.
- `volatile` evita que GCC elimine el bloque si cree que no se usa.

### La trampa de la sintaxis: V1 vs V2

El GCC 4.x con que se compila V1 escribe su propio código Thumb en la sintaxis **divided**
(`mov`, `asr`, `eor`, sin `s`); el GCC moderno de V2 usa la **unified** (`movs`, `asrs`…).
Un `asrs` dentro de un archivo en sintaxis divided da:

```
Error: instruction not supported in Thumb16 mode -- `asrs r2,r3,#31'
```

Solución (en `biomarcadores.cpp`): activar `.syntax unified` al entrar al asm y, si el
compilador es antiguo (`__GNUC__ < 6`), restaurar `.syntax divided` al salir para no romper
el código que GCC genera después. Con GCC ≥ 6 no hace falta restaurar. Es el tipo de detalle
que solo aparece al compilar de verdad para las dos placas: por eso la CI compila con
`--cloud`.

## 3. Un archivo `.s` completo

`biomarcadores_asm.s` define `int bio_clamp(int x, int minimo, int maximo)`:

```asm
    .syntax unified          @ sintaxis moderna
    .cpu cortex-m0           @ subconjunto Thumb-1: sirve para V1 y V2
    .thumb
    .text
    .global bio_clamp        @ visible para el enlazador
    .type   bio_clamp, %function
    .thumb_func              @ ¡imprescindible! marca la dirección con bit 0 = 1 (modo Thumb)
bio_clamp:                   @ r0 = x, r1 = minimo, r2 = maximo
    cmp     r0, r1           @ ¿x < minimo?
    bge     1f               @ si no, saltar a la etiqueta "1" hacia adelante (f)
    movs    r0, r1           @ x = minimo
    bx      lr               @ return
1:
    cmp     r0, r2           @ ¿x > maximo?
    ble     2f
    movs    r0, r2           @ x = maximo
2:
    bx      lr               @ return (el resultado ya está en r0)
```

Para que MakeCode lo vea hacen falta dos cosas más, porque **los `.s` no se analizan en
busca de `//%`**:

1. Listar `biomarcadores_asm.s` en `pxt.json` → pxt lo manda a la nube junto con los `.cpp`
   (se aceptan `.s` y `.S`; `.S` pasa por el preprocesador de C).
2. Un "puente" en C++ con `extern "C"` (para que el nombre no se decore al estilo C++) y `//%`:

```cpp
extern "C" int bio_clamp(int x, int minimo, int maximo);

namespace biomarcadorescpp {
    //%
    int clampAsm(int x, int minimo, int maximo) { return bio_clamp(x, minimo, maximo); }
}
```

Y del lado TypeScript, como siempre, la función con `shim=` y cuerpo para el simulador
(`biomarcadores.recortar` en `biomarcadores.ts`). Cadena completa:

```
bloque "recortar %x entre %minimo y %maximo"
   → biomarcadores.recortar()   (TS; el cuerpo corre en el simulador)
   → biomarcadorescpp::clampAsm (C++, puente)
   → bio_clamp                  (ensamblador puro)
```

## ¿Cuándo vale la pena?

Casi nunca por velocidad: GCC con `-O2` genera código excelente, y el cuello de botella en
micro:bit suele ser el ADC o el intérprete, no la aritmética. Vale la pena para:
- instrucciones que C no expresa (`clz`, `rev`, saturación en V2, acceso a registros
  especiales del CPU, `wfi` para dormir),
- rutinas con tiempos exactos (bit-banging de protocolos),
- y sobre todo para **aprender** cómo funciona el procesador. Por eso están acá.

Si escribís asm que solo existe en Thumb-2 (por ejemplo `ssat`, `udiv`, `smull`), envolvelo
en `#if MICROBIT_CODAL` y dá una versión en C para V1, o declarará la extensión como
solo-V2 con `"disablesVariant": ["mbdal"]` en `pxt.json`.
