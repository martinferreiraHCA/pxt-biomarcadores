# 02 — Estructura del repositorio

```
pxt-biomarcadores/
│
├── pxt.json                  Manifiesto de la extensión (doc 03)
├── README.md                 Portada: se muestra dentro de MakeCode
├── LICENSE                   MIT
├── tsconfig.json             Solo para que el editor de texto (VS Code) entienda los tipos
├── .gitignore                Ignora built/, pxt_modules/, node_modules/
├── .github/workflows/
│   └── makecode.yml          GitHub Actions: compila la extensión en cada push (doc 11)
│
├── biomarcadores.ts          Código COMPARTIDO por todos los sensores: detección de simulador,
│                             identificadores de eventos, filtros reutilizables, contador de latidos
├── biomarcadores.cpp         C++ compartido: ejemplo de ensamblador inline + puente al .s
├── biomarcadores_asm.s       Función escrita 100 % en ensamblador ARM Thumb
│
├── ad8232.ts                 Bloques públicos del sensor AD8232 (configurar, iniciar, BPM, eventos...)
├── ad8232-dsp.ts             Algoritmo de filtrado y detección de latidos en TypeScript.
│                             Cada función tiene `//% shim=ad8232cpp::...`: en el micro:bit real se
│                             usa la versión C++; el cuerpo TS se usa solo en el simulador.
├── ad8232.cpp                El mismo algoritmo en C++ (corre en el micro:bit real)
│
├── shims.d.ts                GENERADO por `pxt build`: declaraciones TS de las funciones C++
├── enums.d.ts                GENERADO por `pxt build`: enums definidos en C++ (acá está vacío)
├── test.ts                   Programa de prueba; solo se compila cuando este repo es el proyecto
│
├── _locales/en/
│   └── biomarcadores-strings.json   Traducción al inglés de los textos de los bloques
│
├── docs/                     Esta documentación
│   └── plantilla/            Archivos de partida para un sensor nuevo (doc 10)
│
├── examples/                 Programas de ejemplo (MakeCode JS/Python y MicroPython)
│
└── herramientas/             Pruebas automatizadas que corren en la PC, sin micro:bit
    ├── prueba-node/          Ejecuta el TypeScript de la extensión en Node.js con stubs del micro:bit
    └── equivalencia-cpp/     Compila ad8232.cpp con g++ y verifica que da lo mismo que ad8232-dsp.ts
```

## Qué archivos "ve" MakeCode

Solo los listados en `"files"` de `pxt.json`. Todo lo demás (docs, examples, herramientas,
test.ts) es para las personas, no para el compilador. `test.ts` es un caso especial: va en
`"testFiles"` y se compila únicamente cuando este repositorio es el proyecto principal.

## Convención de nombres usada acá

| Cosa | Convención | Ejemplo |
|---|---|---|
| Namespace público de un sensor | minúsculas, nombre del chip | `ad8232` |
| Namespace del algoritmo (TS con shims) | `<sensor>dsp` | `ad8232dsp` |
| Namespace C++ | `<sensor>cpp` | `ad8232cpp` |
| Función pública / bloque | español, camelCase | `frecuenciaCardiaca()` |
| Función de algoritmo (compartida TS/C++) | inglés, camelCase, igual en ambos lados | `filterStep()` |
| Texto del bloque | español, minúsculas | `"frecuencia cardíaca (BPM)"` |
| Archivo | `<sensor>.ts`, `<sensor>-dsp.ts`, `<sensor>.cpp` | `ad8232.ts` |

Los namespaces "dsp" y "cpp" son internos: no tienen `//% block`, así que no aparecen en la
paleta de bloques, pero sí se pueden llamar desde JavaScript/Python si alguien quiere.
