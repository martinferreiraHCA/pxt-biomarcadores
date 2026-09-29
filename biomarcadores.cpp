/*
 * biomarcadores.cpp
 * -----------------
 * Código C++ COMPARTIDO de la extensión. Se compila en la nube de MakeCode
 * con arm-none-eabi-gcc para micro:bit V1 (Cortex-M0, DAL) y V2 (Cortex-M4,
 * CODAL) y se enlaza con el programa del usuario.
 *
 * Reglas de oro (ver docs/07-cpp.md):
 *   - Toda función que quieras llamar desde TypeScript lleva `//%` justo antes.
 *   - Tipos permitidos en la frontera TS <-> C++: int, bool, double (TNumber),
 *     String, Buffer, Action. Acá usamos solo int para máxima compatibilidad.
 *   - El nombre en TS será `<namespace>::<funcion>` (ver shims.d.ts).
 *   - Nada de esto corre en el simulador: hay que dar una versión TS gemela.
 */
#include "pxt.h"

/*
 * Función escrita 100 % en ensamblador ARM Thumb-1, en un archivo `.s`
 * separado (biomarcadores_asm.s). Thumb-1 es el subconjunto común a
 * Cortex-M0 (micro:bit V1) y Cortex-M4 (micro:bit V2), así que el mismo
 * código sirve para ambos.
 * `extern "C"` evita que C++ "decore" el nombre y así el enlazador encuentra
 * el símbolo `bio_clamp` definido en el .s.
 */
extern "C" int bio_clamp(int x, int minimo, int maximo);

/*
 * Sintaxis del ensamblador inline.
 * El micro:bit V1 se compila con un GCC antiguo (4.x) que escribe su propio
 * código Thumb con la sintaxis "divided" (mov, asr, eor... sin la "s"); el V2
 * usa un GCC moderno que trabaja siempre con la sintaxis "unified" (movs,
 * asrs, eors...). Para escribir el asm una sola vez, activamos la sintaxis
 * unificada al entrar y, si el compilador es antiguo, la restauramos al salir
 * para no romper el código que GCC genera después.
 */
#if __GNUC__ >= 6
#define BIO_ASM_INICIO ".syntax unified\n\t"
#define BIO_ASM_FIN    ""
#else
#define BIO_ASM_INICIO ".syntax unified\n\t"
#define BIO_ASM_FIN    ".syntax divided\n\t"
#endif

namespace biomarcadorescpp {

    /**
     * Valor absoluto usando ensamblador INLINE (dentro de C++).
     *
     * Truco clásico sin saltos:  s = x >> 31  (0 si x >= 0, -1 si x < 0)
     *                            r = (x ^ s) - s
     * Solo usa instrucciones Thumb-1 de 16 bits con registros bajos (r0-r7),
     * por eso compila igual para Cortex-M0 (V1) y Cortex-M4 (V2).
     * @param x valor de entrada
     */
    //%
    int absAsm(int x) {
        int resultado;
        int signo;
        __asm__ volatile(
            BIO_ASM_INICIO
            "movs %0, %2\n\t"        // resultado = x
            "asrs %1, %2, #31\n\t"   // signo = x >> 31 (aritmético)
            "eors %0, %1\n\t"        // resultado ^= signo
            "subs %0, %0, %1\n\t"    // resultado -= signo
            BIO_ASM_FIN
            : "=&l"(resultado), "=&l"(signo)   // salidas en registros bajos
            : "l"(x)                            // entrada en registro bajo
            : "cc");                            // modifica las banderas
        return resultado;
    }

    /**
     * Recorta un valor al rango [minimo, maximo]. La implementación real está
     * en biomarcadores_asm.s; esta función C++ es solo el "puente" que MakeCode
     * puede ver (los archivos .s no se analizan en busca de `//%`).
     * @param x valor a recortar
     * @param minimo límite inferior
     * @param maximo límite superior
     */
    //%
    int clampAsm(int x, int minimo, int maximo) {
        return bio_clamp(x, minimo, maximo);
    }

    /**
     * Versión de referencia en C++ puro de clamp, para comparar con la de
     * ensamblador y para mostrar cómo se ve una función "normal".
     */
    //%
    int clampCpp(int x, int minimo, int maximo) {
        if (x < minimo) return minimo;
        if (x > maximo) return maximo;
        return x;
    }
}
