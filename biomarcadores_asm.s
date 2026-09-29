@ biomarcadores_asm.s
@ ---------------------
@ Ejemplo de función escrita completamente en ensamblador ARM Thumb-1.
@ Se compila con `arm-none-eabi-gcc` en la nube de MakeCode junto con el C++.
@
@ Convención de llamada AAPCS (la que usa GCC en ARM):
@   - argumentos enteros: r0, r1, r2, r3 (el resto va por la pila)
@   - valor de retorno:   r0
@   - r0-r3 y r12 se pueden pisar libremente ("caller-saved")
@   - r4-r11 hay que preservarlos (push/pop) si se usan ("callee-saved")
@   - lr contiene la dirección de retorno; `bx lr` vuelve al llamador
@
@ int bio_clamp(int x, int minimo, int maximo)
@   r0 = x, r1 = minimo, r2 = maximo  ->  devuelve en r0 el valor recortado
@
@ Ver docs/08-ensamblador.md para una explicación línea por línea.

    .syntax unified          @ sintaxis unificada ARM/Thumb (la moderna)
    .cpu cortex-m0           @ el subconjunto más chico: sirve para V1 y V2
    .thumb                   @ las Cortex-M solo ejecutan Thumb
    .text                    @ sección de código
    .align 2

    .global bio_clamp        @ visible para el enlazador
    .type   bio_clamp, %function
    .thumb_func              @ marca el símbolo como código Thumb (bit 0 = 1)
bio_clamp:
    cmp     r0, r1           @ ¿x < minimo?
    bge     1f               @ si no, saltar a la etiqueta 1 (hacia adelante)
    movs    r0, r1           @ x = minimo
    bx      lr               @ return
1:
    cmp     r0, r2           @ ¿x > maximo?
    ble     2f               @ si no, saltar a 2
    movs    r0, r2           @ x = maximo
2:
    bx      lr               @ return (r0 ya tiene el resultado)

    .size bio_clamp, . - bio_clamp
