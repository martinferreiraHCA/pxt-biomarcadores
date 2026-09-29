// prueba.ts — corre la lógica de la extensión en Node con stubs de micro:bit (ver docs/11-pruebas-ci-y-publicacion.md).
// Ejecuta el muestreo simulado durante N segundos y compara BPM medidos vs. esperados.
function correr(bpmEsperado: number, segundos: number, periodoMs: number): number {
    __clock = 0; __loops = []; __events = {};
    ad8232.detener();
    ad8232.usarSenalSimulada(bpmEsperado);
    let latidos = 0;
    ad8232.alDetectarLatido(() => { latidos++; });
    ad8232.iniciar(Math.idiv(1000, periodoMs));
    __budget = Math.idiv(segundos * 1000, periodoMs);
    try { __loops[0](); } catch (e) { if (!(e instanceof StopLoop)) throw e; }
    const bpm = ad8232.frecuenciaCardiaca();
    const esperadosLatidos = Math.idiv(segundos * 1000 * bpmEsperado, 60000);
    const ok = Math.abs(bpm - bpmEsperado) <= 2 && Math.abs(latidos - esperadosLatidos) <= 2;
    console.log(`sim ${bpmEsperado} BPM @ ${Math.idiv(1000, periodoMs)} Hz: medido=${bpm} BPM, latidos=${latidos} (esperados ~${esperadosLatidos}), RR=${ad8232.intervaloRR()} ms -> ${ok ? "OK" : "FALLO"}`);
    return ok ? 0 : 1;
}
let fallos = 0;
fallos += correr(60, 20, 5);
fallos += correr(72, 20, 5);
fallos += correr(100, 20, 5);
fallos += correr(150, 20, 5);
fallos += correr(72, 20, 6);   // V1: basic.pause(5) suele redondear a ~6 ms
fallos += correr(72, 20, 10);  // 100 Hz
fallos += correr(72, 20, 4);   // 250 Hz
fallos += correr(72, 20, 2);   // 500 Hz
fallos += correr(45, 30, 5);   // bradicardia
fallos += correr(180, 20, 5);  // taquicardia
// señal plana (sin sensor, sin simulación): no debe detectar latidos
__clock = 0; __loops = []; __events = {};
ad8232.detener(); ad8232.usarSenalSimulada(0);
let falsos = 0; ad8232.alDetectarLatido(() => { falsos++; });
ad8232.iniciar(200); __budget = 4000;
try { __loops[0](); } catch (e) { if (!(e instanceof StopLoop)) throw e; }
console.log(`señal plana: latidos falsos=${falsos}, bpm=${ad8232.frecuenciaCardiaca()} -> ${falsos == 0 ? "OK" : "FALLO"}`);
if (falsos != 0) fallos++;
// utilidades compartidas
console.log("abs(-42)=", biomarcadores.valorAbsoluto(-42), "clamp(500,0,255)=", biomarcadores.recortar(500, 0, 255));
console.log(fallos == 0 ? "TODAS LAS PRUEBAS OK" : `${fallos} PRUEBAS FALLARON`);
declare var process: any; process.exit(fallos == 0 ? 0 : 1);
