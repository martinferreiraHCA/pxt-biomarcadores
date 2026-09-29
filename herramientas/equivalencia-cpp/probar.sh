#!/usr/bin/env bash
# Comprueba que ad8232.cpp (C++) y ad8232-dsp.ts (TypeScript) producen
# EXACTAMENTE la misma salida, muestra por muestra, para varias frecuencias.
# Requiere: g++, node y typescript (npm install en herramientas/prueba-node).
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p built
TSC=../prueba-node/node_modules/.bin/tsc
$TSC -p tsconfig.json
g++ -std=c++11 -O2 -I. -o built/procesador main.cpp
fallos=0
for hz in 100 166 200 250 500; do
    for bpm in 50 72 120; do
        node built/equivalencia.js $hz $bpm
        ./built/procesador $hz < built/entrada.txt > built/salida-cpp.txt
        if diff -q built/salida-ts.txt built/salida-cpp.txt > /dev/null; then
            echo "  C++ == TS a $hz Hz / $bpm BPM: OK"
        else
            echo "  C++ != TS a $hz Hz / $bpm BPM: DIFERENCIAS"; fallos=$((fallos+1))
            diff built/salida-ts.txt built/salida-cpp.txt | head -5
        fi
    done
done
[ $fallos -eq 0 ] && echo "EQUIVALENCIA OK" || { echo "$fallos combinaciones fallaron"; exit 1; }
