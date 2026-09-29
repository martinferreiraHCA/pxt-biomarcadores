# 06 — Python

Hay **dos Pythons** distintos para micro:bit y conviene no confundirlos:

| | MakeCode Python | MicroPython |
|---|---|---|
| Dónde | Pestaña "Python" del editor MakeCode | Editor oficial python.microbit.org, Mu, Thonny |
| Qué es | La misma máquina de pxt con sintaxis Python ("Static Python"); compila a ARM igual que los bloques | Un intérprete de Python real que vive en el micro:bit |
| ¿Usa esta extensión? | **Sí**, automáticamente: todos los bloques aparecen como funciones Python | **No** (no hay extensiones MakeCode); ver más abajo un módulo equivalente |
| Velocidad | Compilado, rápido | Interpretado, más lento (pero suficiente para 100-200 Hz) |

## MakeCode Python: la extensión "gratis"

No hay que escribir nada: MakeCode convierte cada función a Python cambiando
`camelCase` por `snake_case`:

| TypeScript / bloques | MakeCode Python |
|---|---|
| `ad8232.iniciar(200)` | `ad8232.iniciar(200)` |
| `ad8232.frecuenciaCardiaca()` | `ad8232.frecuencia_cardiaca()` |
| `ad8232.electrodosDesconectados()` | `ad8232.electrodos_desconectados()` |
| `ad8232.alDetectarLatido(function () {...})` | `ad8232.al_detectar_latido(funcion)` |
| `biomarcadores.PromedioMovil` | `biomarcadores.PromedioMovil` (las clases no cambian) |

Ejemplo completo (es el mismo programa que `test.ts`; también está en `examples/`):

```python
ad8232.configurar(AnalogPin.P0, DigitalPin.P1, DigitalPin.P2)
ad8232.iniciar(200)

def al_latido():
    basic.show_icon(IconNames.HEART)
    basic.pause(80)
    basic.show_icon(IconNames.SMALL_HEART)
ad8232.al_detectar_latido(al_latido)

def al_cambiar(desconectados: bool):
    if desconectados:
        basic.show_icon(IconNames.NO)
    else:
        basic.show_icon(IconNames.YES)
ad8232.al_cambiar_electrodos(al_cambiar)

def al_boton_a():
    basic.show_number(ad8232.frecuencia_cardiaca())
input.on_button_pressed(Button.A, al_boton_a)

def para_siempre():
    ad8232.enviar_por_serial()
    serial.write_value("bpm", ad8232.frecuencia_cardiaca())
    basic.pause(100)
basic.forever(para_siempre)
```

### Qué tener en cuenta al diseñar bloques pensando en Python

- Los nombres de función deben leerse bien en snake_case: `frecuenciaCardiaca` →
  `frecuencia_cardiaca` ✔; `getBPM` → `get_bpm` (feo pero funciona).
- Los enums se usan igual: `AnalogPin.P0`, `IconNames.HEART` (las constantes van en
  MAYÚSCULAS en Python).
- Los handlers se pasan como funciones normales; no hay decoradores.
- Los valores por defecto (`= 200` en TypeScript) funcionan igual en Python.
- Si querés un nombre distinto solo para Python: `//% pyName=nombre_python` sobre la función. Casi nunca hace falta.

## MicroPython: el mismo sensor sin MakeCode

Si trabajás con el editor oficial de Python (MicroPython), no se pueden usar extensiones
de MakeCode. Pero el algoritmo es el mismo y está portado en
[`examples/micropython/ad8232.py`](../examples/micropython/ad8232.py): un módulo con la
clase `AD8232` que lee `pin0.read_analog()`, filtra y detecta latidos. Uso:

```python
from microbit import *
from ad8232 import AD8232

ecg = AD8232(pin0, pin1, pin2, hz=200)
while True:
    latido = ecg.paso()          # llamar 200 veces por segundo
    if latido:
        display.show(Image.HEART)
        print("bpm:", ecg.bpm())
    sleep(5)
```

Copiá `ad8232.py` al micro:bit con el botón "Proyecto → Agregar archivo" del editor Python
(o `uflash`/`microfs`). MicroPython es interpretado: a 200 Hz el micro:bit V1 anda justo;
V2 va sobrado.
