# Mismo programa que latidos-led.ts, en MakeCode Python (pestaña "Python" del editor).
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
