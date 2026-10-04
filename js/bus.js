/**
 * BUS — barramento de eventos mínimo (desacopla módulos).
 * FPS.bus.on(evento, fn) · FPS.bus.off(evento, fn) · FPS.bus.emit(evento, dados)
 * Eventos usados: 'shot' (Weapon), 'net:status' | 'net:open' | 'net:join' | 'net:left' | 'net:data' | 'net:close' (Network).
 */
(function (FPS) {
  'use strict';
  const L = {};
  FPS.bus = {
    on(e, f)  { (L[e] = L[e] || []).push(f); },
    off(e, f) { L[e] = (L[e] || []).filter(x => x !== f); },
    emit(e, d) { (L[e] || []).slice().forEach(f => f(d)); }
  };
})(window.FPS = window.FPS || {});
