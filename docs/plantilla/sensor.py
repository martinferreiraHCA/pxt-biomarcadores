# sensorx.py — PLANTILLA de módulo MicroPython (NO es parte de la extensión MakeCode).
# Copiar al micro:bit junto con main.py desde el editor python.microbit.org.
from microbit import *


class SensorX:
    def __init__(self, pin_senal=pin1, hz=100):
        self.pin = pin_senal
        self.periodo_ms = 1000 // hz
        self.acumulador = 0
        self.crudo = 0
        self.filtrado = 0

    def paso(self):
        """Leer una muestra y filtrarla. Llamar cada periodo_ms."""
        self.crudo = self.pin.read_analog()
        self.acumulador += ((self.crudo << 4) - self.acumulador) >> 3
        self.filtrado = self.acumulador >> 4
        return self.filtrado


if __name__ == "__main__":
    s = SensorX(pin1, hz=100)
    while True:
        print(s.paso())
        sleep(s.periodo_ms)
