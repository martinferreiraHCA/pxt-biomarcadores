// main.cpp — ejecuta el procesador C++ (ad8232.cpp) en la PC.
// Lee por stdin líneas "muestraCruda tiempoMs" y escribe "filtrado latido energia".
// Se compara su salida con la del mismo algoritmo en TypeScript (equivalencia.ts).
#include <cstdio>
#include <cstdlib>
#include "../../ad8232.cpp"

int main(int argc, char **argv) {
    int hz = argc > 1 ? atoi(argv[1]) : 200;
    ad8232cpp::setSampleRate(hz);
    int raw, ms;
    while (scanf("%d %d", &raw, &ms) == 2) {
        int f = ad8232cpp::filterStep(raw);
        int b = ad8232cpp::detectStep(f, ms);
        printf("%d %d %d\n", f, b, ad8232cpp::energy());
    }
    return 0;
}
