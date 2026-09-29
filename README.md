# biomarcadores — sensores de biomarcadores para micro:bit

Extensión de [MakeCode](https://makecode.microbit.org) para micro:bit (V1 y V2) con soporte
para el sensor de electrocardiograma **AD8232** (señal ECG, detección de latidos, frecuencia
cardíaca, intervalos RR, electrodos desconectados) y una base común para agregar futuros
sensores (pulso óptico, GSR, temperatura…).

Además de funcionar, este repositorio está pensado como **guía completa para aprender a hacer
extensiones**: cada archivo está comentado y la carpeta [`docs/`](docs/README.md) explica
cómo crear bloques, cómo agregar código en JavaScript/TypeScript, Python, C++ y ensamblador,
cómo probar sin hardware y cómo publicar.

## Usar como extensión

1. Abrí [makecode.microbit.org](https://makecode.microbit.org) y creá un proyecto.
2. Menú ⚙ → **Extensiones** (o clic en *Extensiones* al final de la lista de categorías).
3. Pegá la URL de este repositorio: `https://github.com/martinferreiraHCA/pxt-biomarcadores`.
4. Aparecen dos categorías nuevas: **AD8232 (ECG)** y **Biomarcadores**.

## Conexión del AD8232

| AD8232 | micro:bit |
|---|---|
| GND | GND |
| 3.3V | 3V |
| OUTPUT | P0 |
| LO- | P2 |
| LO+ | P1 |
| SDN | sin conectar |

> ⚠️ Usá el micro:bit **a pilas** mientras alguien tenga los electrodos puestos. Nunca lo
> conectes a la red eléctrica (cargador, PC enchufada). Es un dispositivo educativo, **no**
> un equipo médico.

## Ejemplo: corazón que late al ritmo real

```blocks
ad8232.iniciar(200)
ad8232.alDetectarLatido(function () {
    basic.showIcon(IconNames.Heart)
    basic.pause(80)
    basic.showIcon(IconNames.SmallHeart)
})
input.onButtonPressed(Button.A, function () {
    basic.showNumber(ad8232.frecuenciaCardiaca())
})
```

## Ejemplo: graficar el ECG en la consola de MakeCode

```blocks
ad8232.iniciar(200)
basic.forever(function () {
    ad8232.enviarPorSerial()
    serial.writeValue("bpm", ad8232.frecuenciaCardiaca())
    basic.pause(100)
})
```

En el simulador no hay sensor: la extensión genera automáticamente una señal ECG de 72 BPM
para que se pueda probar el programa. En el micro:bit real, el bloque
**usar señal ECG simulada a … BPM** hace lo mismo (útil para probar sin electrodos).

## Bloques

| Categoría | Bloques |
|---|---|
| AD8232 › Configuración | configurar pines · iniciar monitoreo a N Hz · detener · usar señal simulada |
| AD8232 › Lectura | valor crudo · valor filtrado · ¿electrodos desconectados? · enviar muestras por serial |
| AD8232 › Latidos | frecuencia cardíaca (BPM) · intervalo RR · cantidad de latidos · ms desde el último latido |
| AD8232 › Eventos | al detectar latido · al cambiar electrodos |
| AD8232 › Avanzado | ajustar umbral · ajustar energía mínima · energía del detector · ¿monitoreo activo? |
| Biomarcadores | ¿está en el simulador? · valor absoluto (C++/asm) · recortar (asm) · clases reutilizables `PromedioMovil`, `LineaDeBase`, `ContadorDeLatidos` |

También se puede usar desde JavaScript y Python (MakeCode): ver [`examples/`](examples/).

## Cómo está hecha (y cómo hacer la tuya)

| Quiero… | Leer |
|---|---|
| Entender qué pasa desde el bloque hasta el micro:bit | [docs/01](docs/01-como-funciona-una-extension.md) |
| Saber para qué sirve cada archivo | [docs/02](docs/02-estructura-del-repositorio.md), [docs/03](docs/03-pxt-json.md) |
| Crear bloques nuevos | [docs/04](docs/04-typescript-y-bloques.md) |
| Programar en JavaScript / Python | [docs/05](docs/05-javascript.md), [docs/06](docs/06-python.md) |
| Agregar código C++ | [docs/07](docs/07-cpp.md) |
| Escribir o leer ensamblador ARM | [docs/08](docs/08-ensamblador.md) |
| Conectar y calibrar el AD8232 | [docs/09](docs/09-sensor-ad8232.md) |
| Agregar otro sensor | [docs/10](docs/10-agregar-un-sensor.md) + [`docs/plantilla/`](docs/plantilla/) |
| Compilar, probar sin hardware, publicar | [docs/11](docs/11-pruebas-ci-y-publicacion.md) |

Resumen de la arquitectura:

```
ad8232.ts        bloques y bucle de muestreo (TypeScript)
ad8232-dsp.ts    filtro + detector de latidos en TypeScript  ─┐  misma lógica,
ad8232.cpp       filtro + detector de latidos en C++          ─┘  probada como idéntica
biomarcadores.ts utilidades compartidas (filtros, contador de latidos, eventos)
biomarcadores.cpp / biomarcadores_asm.s   ejemplos de C++ con ensamblador inline y .s puro
```

En el micro:bit real corre el C++ (`//% shim=`); en el simulador corre el TypeScript.

## Desarrollo

```bash
npm install -g pxt && pxt target microbit && pxt install
pxt build --cloud                       # compila TS + C++ (V1 y V2)
cd herramientas/prueba-node && npm install && npm test   # pruebas en Node sin micro:bit
cd ../equivalencia-cpp && ./probar.sh   # C++ == TypeScript, muestra por muestra
```

## Licencia

MIT. Hecho para las clases de biomarcadores del HCA.

## Supported targets

* for PXT/microbit

<script src="https://makecode.com/gh-pages-embed.js"></script><script>makeCodeRender("{{ site.makecode.home_url }}", "{{ site.github.owner_name }}/{{ site.github.repository_name }}");</script>
