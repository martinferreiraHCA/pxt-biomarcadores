// Stubs mínimos del entorno micro:bit para correr la lógica de la extensión en Node.
declare var console: any;
type Action = () => void;
enum AnalogPin { P0 = 7, P1 = 8, P2 = 9 }
enum DigitalPin { P0 = 7, P1 = 8, P2 = 9 }
enum PinPullMode { PullDown = 0, PullUp = 1, PullNone = 2 }
let __clock = 0;
let __loops: Action[] = [];
let __events: { [k: string]: Action[] } = {};
let __analog = 512;
let __digital = 0;
namespace control {
    export function ramSize() { return 32 * 1024 * 1024; }
    export function inBackground(a: Action) { __loops.push(a); }
    export function raiseEvent(src: number, val: number) { (__events[src + ":" + val] || []).forEach(h => h()); }
    export function onEvent(src: number, val: number, h: Action) { (__events[src + ":" + val] = __events[src + ":" + val] || []).push(h); }
}
namespace input { export function runningTime() { return __clock; } }
namespace pins {
    export function analogReadPin(p: AnalogPin) { return __analog; }
    export function digitalReadPin(p: DigitalPin) { return __digital; }
    export function setPull(p: DigitalPin, m: PinPullMode) { }
}
class StopLoop { }
let __budget = 0;
namespace basic { export function pause(ms: number) { __clock += ms; if (--__budget <= 0) throw new StopLoop(); } }
namespace serial { export function writeValue(n: string, v: number) { } }
interface Math { idiv(a: number, b: number): number; randomRange(a: number, b: number): number; }
(Math as any).idiv = (a: number, b: number) => (a / b) | 0;
(Math as any).randomRange = (a: number, b: number) => a + ((Math.random() * (b - a + 1)) | 0);
