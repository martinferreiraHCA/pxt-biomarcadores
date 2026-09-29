# main.py — ejemplo MicroPython: corazón que late y BPM por USB.
# Copiar ad8232.py y este archivo al micro:bit desde python.microbit.org.
from microbit import *
from ad8232 import AD8232

ecg = AD8232(pin0, pin1, pin2, hz=200)
proximo = running_time()
while True:
    if ecg.paso():
        display.show(Image.HEART)
        print("bpm:", ecg.bpm(), "rr:", ecg.ultimo_rr)
    elif running_time() - ecg.ultimo_latido_ms > 100:
        display.show(Image.HEART_SMALL)
    if button_a.was_pressed():
        display.scroll(ecg.bpm())
    proximo += ecg.periodo_ms
    espera = proximo - running_time()
    if espera > 0:
        sleep(espera)
