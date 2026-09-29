# Plantilla para un sensor nuevo

Copiá estos archivos a la raíz del repo, renombrá `sensorx` por el nombre del chip y seguí
[../10-agregar-un-sensor.md](../10-agregar-un-sensor.md).

| Archivo | Copiar a | Cuándo |
|---|---|---|
| `sensor.ts` | `<sensor>.ts` | Siempre: bloques públicos |
| `sensor-dsp.ts` | `<sensor>-dsp.ts` | Si hay procesamiento (TS con `shim=` para el simulador) |
| `sensor.cpp` | `<sensor>.cpp` | Si el procesamiento va en C++ |
| `sensor.py` | `examples/micropython/<sensor>.py` | Si querés dar una versión MicroPython |

Los archivos de esta carpeta **no** están en `pxt.json`, así que no se compilan.
