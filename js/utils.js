/**
 * UTILS — funções e constantes compartilhadas.
 *  $(id)          atalho para document.getElementById
 *  clamp(v,a,b)   limita v ao intervalo [a,b]
 *  DESKTOP        true se o dispositivo é um computador (mouse + teclado); false = celular/tablet (controles de toque)
 *                 Para testar: abra com ?mobile (força toque) ou ?desktop (força mouse) na URL.
 */
(function (FPS) {
  'use strict';
  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const detectDesktop = () => {
    const q = location.search;
    if (/[?&]mobile\b/.test(q)) return false;
    if (/[?&]desktop\b/.test(q)) return true;
    const mm = s => matchMedia(s).matches;
    const coarse = mm('(pointer: coarse)'), fine = mm('(pointer: fine)'), hover = mm('(hover: hover)');
    // celular/tablet: user-agent móvel (inclui iPad novo, que se diz Mac) OU ponteiro principal por toque
    const mobileUA = /Android|iPhone|iPad|iPod|Mobile|Silk/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && /Mac/i.test(navigator.platform || ''));
    if (mobileUA) return false;
    if (coarse && !(fine && hover)) return false; // "site para computador" no Android: sem UA móvel, mas ainda é toque
    return true;
  };
  const DESKTOP = detectDesktop();

  FPS.utils = { $, clamp, DESKTOP };
  FPS.$ = $; FPS.clamp = clamp; FPS.DESKTOP = DESKTOP;
})(window.FPS = window.FPS || {});
