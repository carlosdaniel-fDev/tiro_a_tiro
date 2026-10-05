/**
 * MAIN — ponto de entrada. Liga/desliga funcionalidades aqui.
 * ORDEM importa (entradas primeiro, depois lógica, depois efeitos).
 * Para REMOVER uma funcionalidade, apague/comente a linha .use(...) dela.
 * Para ADICIONAR, crie js/features/minha.js, registre em index.html e adicione .use(FPS.Minha).
 */
(function (FPS) {
  'use strict';
  FPS.Game
    .use(FPS.KeyboardInput)     // entrada: teclado
    .use(FPS.MouseInput)        // entrada: mouse (PC)
    .use(FPS.TouchInput)        // entrada: toque (celular)
    .use(FPS.OrientationGuard)  // aviso de orientação (celular)
    .use(FPS.Movement)          // andar, pular, colisão
    .use(FPS.Weapon)            // arma e tiro
    .use(FPS.Ammo)              // caixas de munição, coleta agachado e HUD de munição
    .use(FPS.Stamina)           // barra de fôlego (correr gasta; zerou = cansado e mais lento)
    .use(FPS.Effects)           // balas e manchas
    .use(FPS.Sound)             // sons com Tone.js (tiro, impacto no cubo e no personagem)
    .use(FPS.Menu)              // menu de configurações (⚙ / M)
    .use(FPS.Multiplayer)       // multijogador PeerJS/WebRTC (sala por código)
    .use(FPS.TitleScreen)       // tela inicial "Tiro a Tiro" (remova para iniciar direto no jogo)
    .start();
})(window.FPS);
