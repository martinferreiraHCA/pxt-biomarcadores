# 03 — pxt.json, el manifiesto

Este es el `pxt.json` de la extensión, comentado campo por campo (JSON no admite comentarios;
acá se agregan solo para explicar):

```jsonc
{
    // Nombre interno: minúsculas, sin espacios. Es el que se usa en _locales/<idioma>/<name>-strings.json
    "name": "biomarcadores",

    // Versión semántica. Se sube con `pxt bump` o a mano; MakeCode usa los tags git vX.Y.Z
    "version": "0.1.0",

    // Aparece en el diálogo de Extensiones
    "description": "Sensores de biomarcadores para micro:bit: AD8232 ...",
    "license": "MIT",

    // Otras extensiones de las que dependemos. "core" es la biblioteca base del micro:bit
    // (pins, basic, input, control, serial...). Se puede depender de otros repos de GitHub:
    //   "neopixel": "github:microsoft/pxt-neopixel#v0.7.3"
    "dependencies": {
        "core": "*"
    },

    // Archivos que MakeCode descarga y compila. El orden importa un poco:
    // un archivo puede usar lo definido en otro sin importar el orden (TypeScript resuelve
    // todo junto), pero las inicializaciones de nivel superior (`let x = ...` fuera de
    // funciones) se ejecutan en este orden.
    "files": [
        "README.md",
        "biomarcadores.ts",
        "ad8232-dsp.ts",
        "ad8232.ts",
        "biomarcadores.cpp",
        "biomarcadores_asm.s",
        "ad8232.cpp",
        "shims.d.ts",
        "enums.d.ts"
    ],

    // Se compilan solo cuando este repositorio es el proyecto abierto (nunca como dependencia)
    "testFiles": [
        "test.ts"
    ],

    // Para qué editores sirve. MakeCode rechaza la extensión en otros targets (Arcade, etc.)
    "supportedTargets": [
        "microbit"
    ],

    // Editor con el que se abre el repo: "tsprj" (JavaScript), "blocksprj" o "pyprj"
    "preferredEditor": "tsprj",

    // true = puede aparecer en búsquedas / galería (además hay que pedir aprobación a la
    // Micro:bit Educational Foundation para que salga en el buscador de extensiones)
    "public": true
}
```

## Otros campos útiles

| Campo | Para qué |
|---|---|
| `"icon": "./static/icon.png"` | Ícono de 300×200 px en el diálogo de extensiones |
| `"targetVersions": { "target": "9.1.1" }` | Versión de pxt-microbit con la que se probó; `pxt build` lo rellena |
| `"additionalFilePath": "../otra-carpeta"` | Incluir archivos de otra carpeta del repo |
| `"yotta"` / `"codal"` | Configuración extra del build de C++ (raro; p. ej. habilitar Bluetooth) |
| `"disablesVariant": ["mbdal"]` | Declarar que la extensión NO funciona en V1 (solo V2) |
| `"cppDependencies"` | Dependencias que solo se usan al compilar C++ |
| `"fileDependencies"` | Incluir un archivo solo si existe cierta dependencia |

## Los archivos generados: shims.d.ts y enums.d.ts

Si la extensión tiene C++, **es obligatorio** listar `shims.d.ts` y `enums.d.ts` en `files`.
`pxt build` los regenera a partir de las anotaciones `//%` de los `.cpp`/`.h` (nunca los
edites a mano). Al importar la extensión desde GitHub, MakeCode **no** los regenera: usa
los que están commiteados. Por eso hay que correr `pxt build` y commitear el resultado cada
vez que cambia la firma de una función C++. Detalle completo en [07-cpp.md](07-cpp.md).
