# Documentación — cómo está hecha esta extensión y cómo hacer la tuya

Esta carpeta explica, de principio a fin, cómo funciona una extensión de MakeCode para
micro:bit usando esta misma extensión como ejemplo real. La idea es que puedas **tomar este
repositorio, entender cada archivo y agregar tus propios sensores** con bloques, JavaScript,
Python, C++ y hasta ensamblador.

| # | Documento | Qué vas a aprender |
|---|-----------|--------------------|
| 01 | [Cómo funciona una extensión](01-como-funciona-una-extension.md) | Qué es MakeCode/pxt, qué pasa entre "arrastro un bloque" y "el micro:bit ejecuta código", V1 vs V2 |
| 02 | [Estructura del repositorio](02-estructura-del-repositorio.md) | Para qué sirve cada archivo de este repo |
| 03 | [pxt.json](03-pxt-json.md) | El manifiesto: campos, dependencias, archivos, versiones |
| 04 | [TypeScript y bloques](04-typescript-y-bloques.md) | Cómo se define un bloque con `//%`, parámetros, enums, eventos, grupos, colores |
| 05 | [JavaScript](05-javascript.md) | Qué subconjunto de JavaScript/TypeScript soporta el micro:bit y cómo usar la extensión en texto |
| 06 | [Python](06-python.md) | Cómo aparecen los bloques en MakeCode Python y cómo hacer lo mismo en MicroPython |
| 07 | [C++](07-cpp.md) | Cómo agregar código C++, tipos permitidos, `shims.d.ts`, simulador vs. hardware |
| 08 | [Ensamblador](08-ensamblador.md) | Ensamblador inline, archivos `.s`, convención de llamada, cómo ver el código que genera el compilador |
| 09 | [Sensor AD8232](09-sensor-ad8232.md) | Conexión, electrodos, seguridad, algoritmo de detección, calibración, bloques |
| 10 | [Agregar un sensor nuevo](10-agregar-un-sensor.md) | Paso a paso con la plantilla incluida (`docs/plantilla/`) |
| 11 | [Pruebas, CI y publicación](11-pruebas-ci-y-publicacion.md) | `pxt build`, pruebas en Node, GitHub Actions, versiones, cómo importar la extensión |
| 12 | [Glosario y referencias](12-glosario-y-referencias.md) | Términos y enlaces oficiales |

Sugerencia de lectura: 01 → 02 → 04 → 09 para usar el sensor; después 07 → 08 → 10 para crear
tus propios sensores.
