# 09 — El sensor AD8232 (ECG)

## Qué es

El **AD8232** (Analog Devices) es un "front-end" analógico para electrocardiograma: amplifica
(~1100×) y filtra la diferencia de potencial de ~1 mV que generan los latidos entre dos
puntos del cuerpo, y entrega una señal de 0 a 3,3 V centrada en ~1,65 V lista para un
conversor analógico-digital. Los módulos comunes (SparkFun, clones) traen un conector de 3,5 mm
para el cable de electrodos y estos pines:

| Pin del módulo | Función | micro:bit |
|---|---|---|
| `GND` | tierra | `GND` |
| `3.3V` | alimentación (2,0–3,5 V) | `3V` |
| `OUTPUT` | señal ECG analógica | `P0` (analógico) |
| `LO-` | "lead off" negativo: alto si el electrodo RA se soltó | `P2` |
| `LO+` | "lead off" positivo: alto si el electrodo LA se soltó | `P1` |
| `SDN` | shutdown (bajo = apagado) | sin conectar (o `3V`) |

Los pines son configurables con el bloque **configurar AD8232**; los valores de arriba son
los que se usan si no lo llamás.

> ⚠️ **Seguridad.** Nunca conectes el micro:bit ni el AD8232 a la red eléctrica (cargador,
> PC enchufada, etc.) mientras alguien tiene los electrodos puestos. Usá **pilas** para el
> micro:bit y, si querés ver la señal en la PC, una **notebook con batería** o un aislador
> USB. El AD8232 es un dispositivo educativo: **no es un equipo médico** y no sirve para
> diagnóstico.

## Electrodos

Tres electrodos adhesivos (de gel, tipo Ag/AgCl) con broche. Colocación clásica
"triángulo de Einthoven" simplificado:

```
         RA (rojo/negro) ──●        ●── LA (amarillo/azul)
            debajo de la clavícula derecha / izquierda

                          ●── RL (verde) referencia,
                             costado inferior izquierdo (o pierna)
```

Alternativa cómoda para el aula: RA en el antebrazo derecho, LA en el antebrazo izquierdo,
RL en el antebrazo derecho o pierna. La señal es más chica pero funciona. Consejos:
piel limpia y seca, sin moverse, cable de electrodos lejos de la fuente/USB, y los
electrodos no se reutilizan bien (el gel se seca).

## Los bloques

| Bloque | Qué hace |
|---|---|
| **configurar AD8232 salida … LO+ … LO- …** | Elegir pines (opcional; por defecto P0/P1/P2) |
| **iniciar monitoreo ECG a … Hz** | Empieza a muestrear en segundo plano. 200 Hz es un buen valor; 100–250 en V1 |
| **detener monitoreo ECG** | Para el muestreo |
| **usar señal ECG simulada a … BPM** | Reemplaza el sensor por un ECG generado por software (0 = volver al sensor). En el simulador está activa por defecto a 72 BPM |
| **ECG valor crudo (0-1023)** | Última lectura del ADC |
| **ECG valor filtrado** | Señal centrada en 0, sin deriva ni ruido: la que conviene graficar |
| **¿electrodos desconectados?** | Verdadero si LO+ o LO- están en alto |
| **enviar muestras ECG por serial** | Manda todas las muestras filtradas pendientes como `ecg:valor` |
| **frecuencia cardíaca (BPM)** | Promedio de los últimos 4 intervalos RR |
| **intervalo RR (ms)** | Tiempo entre los dos últimos latidos |
| **cantidad de latidos** | Contador desde el inicio |
| **ms desde el último latido** | Para animaciones sincronizadas |
| **al detectar latido** | Evento por cada complejo QRS |
| **al cambiar electrodos (desconectados)** | Evento al soltar/poner un electrodo |
| **ajustar umbral de latido a … %** | Sensibilidad del detector (35 por defecto) |
| **ajustar energía mínima de latido a …** | Rechazo de ruido (400 por defecto) |
| **energía del detector** | Señal interna, para calibrar |

## Cómo funciona la detección (lo que hay en ad8232-dsp.ts / ad8232.cpp)

Es una versión simplificada del algoritmo clásico de **Pan–Tompkins** (1985), todo en
enteros:

```
ADC (0..1023)
  │
  ├─ 1. Pasa-altos: seguidor de línea de base (alfa ≈ 1/64 a 200 Hz)  → quita la deriva lenta
  ├─ 2. Pasa-bajos: promedio móvil de ~25 ms                          → quita ruido de 50 Hz y más
  │     = "ECG valor filtrado"
  ├─ 3. Derivada  (x[n] - x[n-1])                                     → resalta pendientes bruscas
  ├─ 4. Cuadrado  (÷4 para no desbordar)                              → siempre positivo, amplifica picos
  ├─ 5. Integración: promedio móvil de ~40 ms                         → un "bulto" por QRS
  │     = "energía del detector"
  └─ 6. Umbral adaptativo:
        envolvente = máximo reciente de la energía, decae ~1,3 s
        umbral = envolvente × 35 %
        latido si energía > umbral  y  energía > energía mínima  y  pasaron > 250 ms del último
        (histéresis: se "rearma" cuando la energía baja de umbral/2)
```

Los tiempos están en segundos, no en muestras: `setSampleRate()` recalcula las longitudes
para que funcione igual de 100 a 500 Hz. La frecuencia se obtiene de los intervalos entre
latidos medidos con el reloj del micro:bit (`input.runningTime()`), no de la cantidad de
muestras, así que no importa que `basic.pause` no sea exacto.

Se probó con una señal ECG sintética a 45, 60, 72, 100, 150 y 180 BPM y a 100, 166, 200, 250
y 500 Hz (`herramientas/prueba-node/`), y se verificó que C++ y TypeScript dan resultados
idénticos muestra por muestra (`herramientas/equivalencia-cpp/`).

## Calibración con una persona real

1. Cargá `examples/ecg-consola.ts` (o el `test.ts`) y abrí la consola de MakeCode
   ("Mostrar consola Dispositivo") para ver el gráfico.
2. Mirá `ecg` (señal filtrada): tiene que verse el pico R claramente. Si es chico
   (< 100), mejorá los electrodos; si satura (±500), están demasiado cerca del corazón.
3. Mirá `energia` y `bpm`. Si hay latidos de más (bpm demasiado alto):
   subí el umbral (**ajustar umbral a 50 %**) o la energía mínima.
   Si faltan latidos: bajá el umbral a 25 %.
4. Los movimientos y el cable generan artefactos: quedate quieto durante la prueba.

## Ideas de proyectos

- Medidor de pulso con el corazón parpadeando en la matriz de LEDs.
- Variabilidad de la frecuencia cardíaca (HRV): guardar los `intervalo RR` y calcular
  la desviación estándar (relajación vs. esfuerzo).
- Enviar `bpm` por radio a otro micro:bit que lo muestre.
- Registrar la señal con la extensión *datalogger* (V2) y analizarla en la PC.
