# 11 — Pruebas, integración continua y publicación

## Compilar en tu PC con la CLI de pxt

Necesitás Node.js 18 o superior.

```bash
npm install -g pxt          # la línea de comandos de MakeCode
cd pxt-biomarcadores
pxt target microbit         # instala pxt-microbit en ./node_modules (una vez por carpeta)
pxt install                 # descarga las dependencias (core) a ./pxt_modules
pxt build --cloud           # compila TS localmente y el C++ en la nube
```

`pxt build --cloud`:
1. regenera `shims.d.ts` y `enums.d.ts` a partir de los `//%` de C++ (y falla si no están
   listados en `pxt.json`),
2. manda `.cpp/.h/.c/.s` a `makecode.com/api/compile` y espera (se ve "polling C++ build…";
   la primera vez tarda 1-2 minutos, después está cacheado por hash),
3. compila `test.ts` + la extensión a ARM para las dos placas,
4. deja en `built/`: `binary.hex` (universal), `mbdal-binary.hex/.asm` (V1),
   `mbcodal-binary.hex/.asm` (V2).

Otros comandos útiles: `pxt buildshims` (solo regenerar los .d.ts), `pxt deploy` (copiar el
hex a un micro:bit conectado), `pxt serve` (levantar un editor MakeCode local con tu
extensión: ideal para ver los bloques mientras los diseñás), `pxt bump` (subir versión y
crear el tag git).

> Sin `--cloud`, pxt intenta compilar el C++ localmente y necesita las toolchains de yotta
> y CODAL instaladas; para extensiones lo normal es usar siempre `--cloud`.

## Pruebas automáticas sin micro:bit (carpeta herramientas/)

### herramientas/prueba-node: correr la lógica en Node.js

`stubs-microbit.ts` implementa lo mínimo de `pins`, `control`, `basic`, `input` y `serial`
con un reloj falso; `prueba.ts` genera un ECG sintético a varias frecuencias cardíacas y de
muestreo y comprueba que la extensión mide los BPM correctos y no inventa latidos con una
señal plana.

```bash
cd herramientas/prueba-node
npm install          # instala typescript
npm test
```

Salida esperada: una línea `OK` por caso y `TODAS LAS PRUEBAS OK`.

### herramientas/equivalencia-cpp: C++ ≡ TypeScript

Compila `ad8232.cpp` con `g++` (usando un `pxt.h` vacío) y compara su salida con la de
`ad8232-dsp.ts`, muestra por muestra, para 5 frecuencias de muestreo × 3 frecuencias
cardíacas. Si alguien cambia un lado y se olvida del otro, esta prueba lo detecta.

```bash
cd herramientas/equivalencia-cpp
./probar.sh          # requiere g++, node y haber hecho npm install en prueba-node
```

Estas pruebas son la red de seguridad para que futuros sensores no rompan lo existente:
agregá tus casos ahí.

## Integración continua (GitHub Actions)

`.github/workflows/makecode.yml` corre `pxt build --cloud` en cada push y pull request.
Con eso sabés que la extensión compila (TypeScript, C++ para V1 y V2, ensamblador) antes de
que un alumno la importe. Si el badge está en rojo, mirá el log del job "build": los errores
de gcc salen ahí.

## Versiones y publicación

MakeCode busca en el repo los **tags git** con forma `vX.Y.Z` y ofrece la versión más alta;
si no hay tags, usa la rama por defecto. Para publicar una versión:

```bash
pxt bump             # pregunta patch/minor/major, edita pxt.json, commitea y crea el tag
git push --tags
```

Los usuarios agregan la extensión con la URL del repo:
`https://github.com/martinferreiraHCA/pxt-biomarcadores`. Para fijar una versión:
`…/pxt-biomarcadores#v0.1.0`. Para probar una rama en desarrollo:
`…/pxt-biomarcadores#nombre-de-rama`.

Para que aparezca en el **buscador** de extensiones de makecode.microbit.org hay que pedir la
aprobación de la Micro:bit Educational Foundation: <https://makecode.com/extensions/approval>.

## Traducciones (_locales)

Los textos de los bloques están en español en el código. Para otros idiomas se agrega
`_locales/<idioma>/<nombre-en-pxt.json>-strings.json` con las claves que genera pxt:

```json
{
    "{id:category}ad8232": "AD8232 (ECG)",
    "ad8232.iniciar|block": "start ECG monitoring at %frecuenciaHz Hz",
    "ad8232.frecuenciaCardiaca|block": "heart rate (BPM)",
    "{id:group}Lectura": "Reading"
}
```

- `nombre.funcion|block` traduce el texto del bloque (hay que conservar los `%parametros`).
- `{id:category}ns` el nombre de la categoría; `{id:group}Texto` un grupo;
  `nombre.funcion` (sin `|block`) el tooltip; `nombre.funcion|param|x` la descripción de
  un parámetro.
- `pxt gendocs --locs` genera el archivo base con todas las claves en el idioma original.

El inglés está en `_locales/en/biomarcadores-strings.json`. MakeCode elige el archivo según
el idioma del editor; si no hay, muestra el original.

## Lista de control antes de publicar

- [ ] `pxt build --cloud` sin errores (CI verde).
- [ ] `herramientas/prueba-node` y `equivalencia-cpp` en verde.
- [ ] `shims.d.ts` y `enums.d.ts` commiteados después del último cambio de C++.
- [ ] Bloques revisados en el editor (texto, valores por defecto, tooltips).
- [ ] Probado en micro:bit V1 y V2 con sensor real.
- [ ] README y docs actualizados; versión subida con `pxt bump`.
