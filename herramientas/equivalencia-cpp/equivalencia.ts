// equivalencia.ts — genera una señal ECG sintética determinista, la procesa
// con la versión TypeScript (ad8232-dsp.ts) y escribe:
//   entrada.txt : "muestraCruda tiempoMs"            (para alimentar main.cpp)
//   salida-ts.txt: "filtrado latido energia"          (para comparar con C++)
declare var require: any;
declare var process: any;
const fs = require("fs");
const hz = parseInt(process.argv[2] || "200");
const bpm = parseInt(process.argv[3] || "72");
const segundos = 20;
const periodoMs = Math.idiv(1000, hz);

// generador pseudoaleatorio determinista (LCG) para el "ruido"
let semilla = 12345;
function ruido(): number {
    semilla = (semilla * 1103515245 + 12345) & 0x7fffffff;
    return (semilla % 7) - 3;
}
function triangulo(t: number, desde: number, hasta: number, alto: number): number {
    if (t < desde || t > hasta) return 0;
    const mitad = (hasta - desde) >> 1;
    const pos = t - desde;
    if (pos <= mitad) return Math.idiv(alto * pos, mitad);
    return Math.idiv(alto * (hasta - t), mitad);
}
function ecg(ms: number): number {
    const periodo = Math.idiv(60000, bpm);
    const t = ms % periodo;
    let v = 512;
    v += triangulo(t, 0, 90, 35);
    v -= triangulo(t, 100, 112, 45);
    v += triangulo(t, 112, 152, 420);
    v -= triangulo(t, 152, 170, 90);
    v += triangulo(t, 250, 400, 110);
    return v + ruido();
}

ad8232dsp.setSampleRate(hz);
let entrada = "";
let salida = "";
let latidos = 0;
for (let ms = 0; ms < segundos * 1000; ms += periodoMs) {
    const raw = ecg(ms);
    entrada += raw + " " + ms + "\n";
    const f = ad8232dsp.filterStep(raw);
    const b = ad8232dsp.detectStep(f, ms);
    latidos += b;
    salida += f + " " + b + " " + ad8232dsp.energy() + "\n";
}
fs.writeFileSync("built/entrada.txt", entrada);
fs.writeFileSync("built/salida-ts.txt", salida);
console.log(`TS: ${hz} Hz, ${bpm} BPM, ${latidos} latidos en ${segundos} s`);
