/**
 * UTILS — funções e constantes compartilhadas.
 *  $(id)          atalho para document.getElementById
 *  clamp(v,a,b)   limita v ao intervalo [a,b]
 *  DESKTOP        true se o dispositivo tem mouse (ativa o modo computador)
 */
(function (FPS) {
  'use strict';
  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const DESKTOP = matchMedia('(hover: hover) and (pointer: fine)').matches || !matchMedia('(pointer: coarse)').matches;
  FPS.utils = { $, clamp, DESKTOP };
  FPS.$ = $; FPS.clamp = clamp; FPS.DESKTOP = DESKTOP;
})(window.FPS = window.FPS || {});
