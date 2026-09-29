# ad8232.py — módulo MicroPython para el sensor de ECG AD8232.
# NO es parte de la extensión MakeCode: es el mismo algoritmo (ad8232-dsp.ts / ad8232.cpp)
# portado a MicroPython para usar en el editor oficial python.microbit.org.
#
# Conexión: OUTPUT -> pin0, LO+ -> pin1, LO- -> pin2, 3.3V -> 3V, GND -> GND.
from microbit import *
import utime


class AD8232:
    def __init__(self, pin_senal=pin0, pin_lo_mas=pin1, pin_lo_menos=pin2, hz=200):
        self.pin_senal = pin_senal
        self.pin_lo_mas = pin_lo_mas
        self.pin_lo_menos = pin_lo_menos
        self.sensibilidad = 35          # % de la envolvente
        self.energia_minima = 400       # referida a 200 Hz
        self.refractario_ms = 250
        self.set_sample_rate(hz)

    # ---- parámetros dependientes de la frecuencia de muestreo ----
    @staticmethod
    def _log2_redondeado(x):
        bits = 0
        while (1 << (bits + 1)) <= x:
            bits += 1
        if x - (1 << bits) > (1 << (bits + 1)) - x:
            bits += 1
        return bits

    def set_sample_rate(self, hz):
        hz = max(50, min(500, int(hz)))
        self.hz = hz
        self.periodo_ms = 1000 // hz
        self.alfa_bits = self._log2_redondeado(hz * 32 // 100)
        self.lp_n = max(1, (hz + 20) // 40)
        self.int_n = max(2, (hz + 12) // 25)
        self.decaimiento_bits = self._log2_redondeado(hz * 128 // 100)
        self.energia_minima_efectiva = self.energia_minima * 40000 // (hz * hz)
        self.reset()

    def reset(self):
        self.base = 0
        self.base_ok = False
        self.lp_buf = [0] * self.lp_n
        self.lp_i = 0
        self.lp_suma = 0
        self.lp_llenos = 0
        self.int_buf = [0] * self.int_n
        self.int_i = 0
        self.int_suma = 0
        self.int_llenos = 0
        self.filtrado_anterior = 0
        self.envolvente = 0
        self.ultimo_latido_ms = -100000
        self.por_encima = False
        self.energia = 0
        self.filtrado = 0
        self.crudo = 512
        self.rr = []
        self.ultimo_rr = 0
        self.latidos = 0

    # ---- procesamiento ----
    def filter_step(self, raw):
        if not self.base_ok:
            self.base = raw << 8
            self.base_ok = True
        self.base += ((raw << 8) - self.base) >> self.alfa_bits
        sin_base = raw - (self.base >> 8)
        self.lp_suma += sin_base - self.lp_buf[self.lp_i]
        self.lp_buf[self.lp_i] = sin_base
        self.lp_i = (self.lp_i + 1) % self.lp_n
        if self.lp_llenos < self.lp_n:
            self.lp_llenos += 1
        return int(self.lp_suma / self.lp_llenos)   # división truncada como en C

    def detect_step(self, filtrado, ahora_ms):
        derivada = filtrado - self.filtrado_anterior
        self.filtrado_anterior = filtrado
        cuadrado = (derivada * derivada) >> 2
        self.int_suma += cuadrado - self.int_buf[self.int_i]
        self.int_buf[self.int_i] = cuadrado
        self.int_i = (self.int_i + 1) % self.int_n
        if self.int_llenos < self.int_n:
            self.int_llenos += 1
        energia = self.int_suma // self.int_llenos
        self.energia = energia
        if energia > self.envolvente:
            self.envolvente = energia
        else:
            self.envolvente -= self.envolvente >> self.decaimiento_bits
        umbral = self.envolvente * self.sensibilidad // 100
        latido = 0
        if not self.por_encima:
            if (energia > umbral and energia > self.energia_minima_efectiva
                    and ahora_ms - self.ultimo_latido_ms > self.refractario_ms):
                self.por_encima = True
                self.ultimo_latido_ms = ahora_ms
                latido = 1
        elif energia < (umbral >> 1):
            self.por_encima = False
        return latido

    # ---- API de alto nivel ----
    def electrodos_desconectados(self):
        return self.pin_lo_mas.read_digital() == 1 or self.pin_lo_menos.read_digital() == 1

    def paso(self):
        """Tomar una muestra. Llamar cada periodo_ms. Devuelve 1 si hubo latido."""
        ahora = utime.ticks_ms()
        self.crudo = self.pin_senal.read_analog()
        self.filtrado = self.filter_step(self.crudo)
        if self.electrodos_desconectados():
            return 0
        latido = self.detect_step(self.filtrado, ahora)
        if latido:
            self.latidos += 1
            if self.ultimo_latido_ms_registrado is not None:
                rr = ahora - self.ultimo_latido_ms_registrado
                if 300 <= rr <= 2000:
                    self.ultimo_rr = rr
                    self.rr.append(rr)
                    if len(self.rr) > 4:
                        self.rr.pop(0)
            self.ultimo_latido_ms_registrado = ahora
        return latido

    ultimo_latido_ms_registrado = None

    def bpm(self):
        if not self.rr:
            return 0
        return 60000 // (sum(self.rr) // len(self.rr))
