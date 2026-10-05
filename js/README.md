# 🎯 Tiro a Tiro

**Tiro a Tiro** é um jogo de tiro em primeira pessoa (**FPS 3D**) com combate **hitscan**, manchas de tinta e suporte para **computador e celular**.

O projeto utiliza **Three.js**, **PeerJS/WebRTC** e uma arquitetura modular baseada em **MVC**, permitindo separar regras do jogo, renderização, controles e funcionalidades.

O jogo possui modo single-player e multiplayer P2P com salas de **2 a 8 jogadores**, além de sistemas de movimentação, corrida, fôlego, agachamento, munição, recarga, vida, respawn, ragdoll, efeitos visuais, sons sintetizados e configurações personalizáveis.

---

## 🎮 Principais recursos

- 🎯 FPS 3D com tiro hitscan.
- 🌐 Multiplayer P2P utilizando PeerJS/WebRTC.
- 👥 Partidas de 2 a 8 jogadores.
- 🏠 Sistema de criação e entrada em salas por código.
- 🎨 Cores diferentes para cada jogador e suas balas.
- 🔫 Sistema de pistola e munição limitada.
- 💥 Sistema de dano e acerto.
- ❤️ Vida individual e privada.
- ☠️ Sistema de morte e respawn.
- 🧍 Personagens 3D em blocos.
- 🤖 Ragdoll ao morrer.
- 🎨 Manchas de tinta nos personagens atingidos.
- 🏃 Sistema de corrida e fôlego.
- 🧎 Sistema de agachamento.
- 📦 Caixas de munição espalhadas pelo mapa.
- 🔄 Sistema de recarga com animação e sons.
- 🔊 Áudio sintetizado com Tone.js.
- 📱 Controles para dispositivos móveis.
- 🖥️ Controles para computador.
- ⚙️ Menu de configurações.
- 🎮 Controles personalizáveis no PC.
- 💾 Configurações salvas com LocalStorage.
- 📊 Contador opcional de FPS.
- 🌎 Mapa compartilhado no multiplayer.
- 🧩 Arquitetura modular com funcionalidades plugáveis.

---

# ▶️ Como rodar

O jogo pode ser executado diretamente pelo navegador.

Basta abrir:

```text
index.html
```

Não é necessário instalar um servidor para jogar localmente no modo básico, pois o projeto utiliza bibliotecas armazenadas localmente em `js/vendor/`.

> **Dica:** abra o arquivo diretamente no navegador, e não dentro de uma pré-visualização ou iframe. Isso permite que a captura do mouse funcione corretamente.

### Multiplayer

O modo multiplayer utiliza **PeerJS/WebRTC** e precisa de internet para estabelecer as conexões entre os jogadores.

A comunicação do jogo é P2P, enquanto o servidor público do PeerJS é utilizado para o processo inicial de conexão.

---

# 🎮 Controles

## Computador

| Ação | Controle |
|---|---|
| Mover | WASD / Setas |
| Olhar | Mouse |
| Atirar | Botão esquerdo / F |
| Pular | Espaço |
| Correr | Shift |
| Agachar | C |
| Recarregar | R |
| Menu | M / Esc |

No modo com captura do mouse, clicar na tela captura o cursor.

Pressionar **Esc** libera o mouse.

### Modo sem captura

| Ação | Controle |
|---|---|
| Mover | WASD |
| Olhar | Arrastar com botão esquerdo |
| Atirar | Botão direito / F |
| Pular | Espaço |
| Correr | Shift |
| Agachar | C |
| Recarregar | R |

---

# 📱 Controles no celular

O jogo foi desenvolvido para funcionar em **modo paisagem**.

| Ação | Controle |
|---|---|
| Mover | Analógico esquerdo (flutuante) |
| Olhar | Arrastar no lado direito (ou arrastar em cima do botão ATIRAR) |
| Atirar | Botão ATIRAR (segurar) |
| Pular | Botão PULAR |
| Correr | Botão CORRER (toque; desliga ao soltar o analógico) |
| Agachar | Botão AGACHAR (toque liga/desliga) |
| Inclinar | Botões ◀ INCL. / INCL. ▶ (segurar) |
| Recarregar | Botão RECARGA |
| Configurações | Botão ⚙ no canto superior direito |

Todos os botões seguem o próprio dedo: escorregar para fora do botão não solta a ação, e vários dedos funcionam ao mesmo tempo.
Para testar o modo celular no computador, abra o jogo com `?mobile` no fim do endereço (e `?desktop` para forçar o modo PC).

---

# ⚙️ Controles configuráveis

No PC, os controles podem ser alterados em:

**⚙ → Controles**

O jogador pode clicar em uma ação e pressionar uma nova tecla.

- `Esc` cancela a alteração.
- `M` e `Esc` são reservadas.
- Se a tecla escolhida já estiver em outra ação, as funções são trocadas.
- As configurações ficam salvas no navegador.
- **Restaurar padrão** retorna às configurações originais.
- As setas continuam funcionando para movimentação.

O agachamento utiliza **C** como tecla padrão.

---

# 🏃 Sistema de corrida e fôlego

Ao segurar **Shift** enquanto anda, o jogador corre.

Durante a corrida:

- A velocidade aumenta em aproximadamente **60%**.
- O campo de visão aumenta um pouco.
- Não é possível correr agachado.
- O fôlego é consumido continuamente.

O jogador consegue correr por aproximadamente **7 segundos** seguidos.

Quando o fôlego chega a zero:

- O jogador fica **cansado**.
- A barra fica vermelha e pisca.
- Não é possível correr.
- A velocidade de caminhada cai para aproximadamente **65%**.

O fôlego precisa voltar a **50%** para a corrida ser liberada novamente.

Depois de correr, existe um pequeno atraso antes de começar a regeneração.

O fôlego também se recupera mais rapidamente quando o jogador está parado.

Ao renascer, o fôlego é restaurado.

Os principais parâmetros ficam em `Model.cfg`:

```text
STAM_DRAIN
STAM_REGEN
STAM_DELAY
STAM_RECOVER
TIRED_MULT
```

---

# 🧎 Sistema de agachamento

Ao agachar:

- A câmera desce.
- A velocidade diminui para aproximadamente 50%.
- O jogador não pode pular.
- O agachamento tem prioridade sobre a corrida.

No multiplayer, o agachamento é sincronizado para os outros jogadores.

Quando outro jogador agacha:

- O quadril desce.
- O corpo recua.
- Os joelhos dobram.
- Os pés permanecem no chão.
- O tronco inclina para frente.
- A cabeça acompanha a direção da mira.

A transição ocorre suavemente.

Como o personagem fica mais baixo, sua área visual como alvo também diminui.

---

# 🔫 Sistema de armas

O jogo utiliza uma pistola com munição limitada.

Configuração padrão:

```text
Pente: 12 balas
Reserva inicial: 24 balas
Reserva máxima: 60 balas
Dano por tiro: 10
Vida máxima: 100
Tempo de recarga: 1,5 segundos
```

O HUD apresenta:

```text
Munição: 12 / 24
```

O primeiro número representa a munição no pente.

O segundo representa a munição disponível na reserva.

Cada tiro consome uma bala.

---

# 🔄 Recarga

A recarga pode ser iniciada com `R` ou pelo botão de recarga no celular.

A recarga dura aproximadamente **1,5 segundos**.

Durante a recarga:

- A arma possui animação.
- O jogador não pode atirar.
- São reproduzidos três sons diferentes:
  - retirar o pente;
  - encaixar o pente;
  - puxar o ferrolho.

Se o pente estiver vazio e existir munição na reserva, a recarga começa automaticamente.

---

# 📦 Caixas de munição

Existem caixas de munição distribuídas pelo mapa.

Características:

- Aparecem em posições livres.
- Existe um mínimo de 5 caixas.
- Uma caixa pode reaparecer a cada 8 segundos.
- O máximo é de 10 caixas.
- As caixas giram lentamente.
- Não possuem efeito de luz.

No multiplayer, as caixas são locais para cada jogador.

### Coleta

Para coletar uma caixa:

- O jogador precisa estar **agachado**.
- Deve estar a até aproximadamente **1,6 metro** da caixa.
- A reserva não pode estar cheia.

Cada caixa adiciona **12 balas**, com limite de reserva de **60 balas**.

---

# 🌐 Multiplayer

O multiplayer utiliza:

```text
PeerJS
WebRTC
```

As partidas suportam **2 a 8 jogadores**.

O modo de jogo é **todos contra todos**.

A comunicação ocorre principalmente de forma P2P.

---

# 🏠 Criando uma sala

Na tela inicial:

**MULTIJOGADOR → Máx. de jogadores → Criar sala**

O criador escolhe o limite da partida entre **2 e 8 jogadores**.

Depois de criar a sala, o jogo gera um código de aproximadamente cinco caracteres.

O jogador pode utilizar **Copiar** e enviar o código para os outros jogadores.

---

# 👥 Entrando em uma sala

Os outros jogadores acessam:

**MULTIJOGADOR**

Depois:

1. Colam o código da sala.
2. Selecionam **Entrar**.
3. A conexão é estabelecida.
4. O jogador entra na partida.

Quando o primeiro jogador entra, a partida começa para todos.

Jogadores também podem entrar depois que a partida já começou, desde que exista uma vaga disponível.

Quando a sala atinge o limite, é exibido:

```text
A sala está cheia.
```

Se alguém sair, a vaga fica disponível novamente.

---

# 🎨 Cores dos jogadores

Cada jogador recebe uma cor fixa de acordo com sua ordem de entrada.

| Jogador | Cor |
|---|---|
| 1 | Azul |
| 2 | Rosa |
| 3 | Verde |
| 4 | Amarelo |
| 5 | Roxo |
| 6 | Laranja |
| 7 | Ciano |
| 8 | Branco |

A cor é utilizada no avatar, pistola, bala, clarão do disparo e manchas de tinta.

As cores ficam configuradas na lista `COLORS` em `js/features/multiplayer.js`.

---

# 🧍 Personagens

Os jogadores utilizam personagens 3D formados por blocos.

O personagem possui:

- Cabeça.
- Corpo.
- Braços.
- Pernas.

O personagem possui animação de caminhada e sistema de mira.

Quando o jogador olha para uma direção, a cabeça acompanha a mira.

---

# 🤖 Ragdoll

Quando um jogador morre, seu personagem entra em estado de **ragdoll**.

O corpo:

1. É separado em partes articuladas.
2. Recebe um impulso relacionado ao ataque.
3. Cai no mapa.
4. Pode bater nos blocos.
5. Permanece caído até o respawn.

A implementação fica principalmente em:

```text
View.startRagdoll()
View.stepRagdoll()
```

---

# 🎨 Manchas de tinta

Os tiros que atingem um jogador deixam uma mancha de tinta.

A mancha:

- Possui a cor da bala.
- Fica presa à parte do corpo atingida.
- Acompanha o movimento do personagem.
- É visível para os outros jogadores.
- Desaparece quando o jogador renasce.

---

# 💥 Sistema de dano

Cada tiro causa **10 de dano**.

A vida máxima é **100**.

Quem realiza o disparo identifica o jogador atingido e envia a informação pela rede.

---

# ❤️ Vida privada

A vida do jogador é mantida apenas no próprio dispositivo.

A barra de vida aparece no HUD, no canto superior esquerdo, junto das informações de abates, mortes e jogadores.

O valor da vida não é enviado aos outros jogadores.

---

# ☠️ Morte e respawn

Quando a vida chega a zero:

- O jogador morre.
- Uma tela vermelha aparece por aproximadamente 3 segundos.
- O jogador renasce.
- Um novo ponto do mapa é escolhido.
- O ponto evita blocos e outros jogadores.
- Vida e munição são restauradas.
- O fôlego é restaurado.

O jogador responsável pelo último tiro recebe **1 abate**.

---

# 🚪 Sair da sala

O jogador pode sair através de:

**⚙ → Sair da sala**

Se um convidado sair:

- Os demais continuam jogando.
- A vaga fica disponível.

Se o anfitrião sair:

- A sala é encerrada.
- Os demais jogadores são desconectados.

Se todos os convidados saírem:

- A partida termina.
- A sala continua aberta aguardando novos jogadores.

---

# 🔗 Arquitetura da rede

O multiplayer utiliza uma topologia em **estrela**.

O anfitrião funciona como ponto central.

Os convidados conectam-se ao anfitrião, que retransmite as informações para os demais jogadores.

O anfitrião possui o ID `0`. Os convidados recebem IDs `1`, `2`, `3` etc.

Com oito jogadores, o anfitrião precisa enviar e receber uma quantidade maior de informações.

---

# 📡 Mensagens de rede

As mensagens são transmitidas em formato JSON.

```text
welcome{id,seed,max,players}
join{id}
left{id}
state{x,y,z,yaw,pitch,cr,tp}
shot{f,to,n,hit}
dead{k}
```

O estado dos jogadores é atualizado aproximadamente 15 vezes por segundo.

---

# ⚠️ Limitações do multiplayer

O servidor público do PeerJS pode apresentar oscilações.

Algumas redes possuem restrições de NAT ou bloqueios que podem impedir uma conexão WebRTC direta.

Em ambientes muito restritivos, pode ser necessário utilizar um servidor **TURN**.

---

# 🔊 Sistema de áudio

Os sons são sintetizados utilizando **Tone.js**.

O sistema está em:

```text
js/features/sound.js
```

Não são necessários arquivos de áudio tradicionais para os efeitos principais.

| Evento | Som |
|---|---|
| Seu tiro | Ruído + grave |
| Tiro de outro jogador | Volume pela distância e posicionamento estéreo |
| Bala no cubo/chão | Som seco de impacto |
| Bala no personagem | Baque + confirmação aguda |
| Receber tiro/morrer | Som grave |
| Arma vazia | Clique |
| Pegar munição | Dois tons ascendentes |
| Recarga | Pente + encaixe + ferrolho |

---

# 🎵 Tone.js

O arquivo local pode ser colocado em:

```text
js/vendor/tone.min.js
```

Caso o arquivo não exista, o jogo tenta utilizar o CDN configurado.

Se o carregamento também falhar, o jogo continua funcionando sem som.

O navegador libera o áudio depois da primeira interação do usuário.

---

# 🔇 Volume

O volume pode ser configurado através de:

**⚙ → Volume**

O intervalo vai de **Mudo a 100%**.

A configuração é salva no navegador.

---

# 🏠 Tela inicial

Ao abrir o jogo, é exibida a tela inicial com:

- **JOGAR**
- **CONFIGURAÇÕES**
- **COMO JOGAR**
- **TELA CHEIA**

Também é possível utilizar `Enter` para iniciar.

No computador, clicar em **JOGAR** captura o mouse.

Durante a partida:

**⚙ / M / Esc → Menu principal**

retorna para a tela inicial.

---

# ⚙️ Configurações

O menu pode ser aberto através de:

```text
⚙
M
Esc
```

As principais configurações são:

| Opção | Valores | Função |
|---|---|---|
| Qualidade geral | Baixa / Média / Alta / Ultra | Ajusta várias configurações |
| Resolução | 50% – 200% | Escala de renderização |
| Sombras | Desligadas – Ultra | Qualidade das sombras |
| Distância de visão | 40 – 200 m | Distância de renderização |
| Campo de visão | 60° – 110° | FOV |
| Sensibilidade | 0,5x – 2,0x | Sensibilidade de mouse/toque |
| Mostrar FPS | Sim / Não | Exibe contador de FPS |
| Controles | Personalizável | Altera teclas |

As configurações são armazenadas usando `localStorage`.

Padrões:

```text
Celular: Média
PC: Alta
```

---

# 🏗️ Arquitetura do projeto

O projeto utiliza uma arquitetura baseada em **MVC** e módulos independentes.

## Model

Responsável por:

- Estado do jogador.
- Física.
- Colisões.
- Regras do jogo.
- Mundo.
- Configurações.

O Model não desenha elementos na tela.

## View

Responsável por:

- Renderização 3D.
- Câmera.
- Céu.
- Iluminação.
- Chão.
- Blocos.
- Personagens.
- Armas.
- Efeitos visuais.
- Ragdoll.

## Controllers

Responsáveis por transformar entradas do jogador em ações.

Incluem:

- Teclado.
- Mouse.
- Touch.
- Orientação.

---

# 📁 Estrutura do projeto

```text
Tiro-a-Tiro/
│
├── index.html
│
├── css/
│   └── style.css
│
└── js/
    │
    ├── vendor/
    │   ├── three.min.js
    │   ├── peerjs.min.js
    │   └── tone.min.js
    │
    ├── bus.js
    ├── game.js
    ├── main.js
    ├── utils.js
    │
    ├── model/
    │   ├── model.js
    │   └── settings.js
    │
    ├── view/
    │   └── view.js
    │
    ├── controllers/
    │   ├── input.js
    │   ├── keyboard.js
    │   ├── mouse.js
    │   ├── touch.js
    │   └── orientation.js
    │
    └── features/
        ├── movement.js
        ├── weapon.js
        ├── effects.js
        ├── title.js
        ├── multiplayer.js
        ├── ammo.js
        ├── stamina.js
        ├── sound.js
        └── menu.js
```

---

# 📦 Bibliotecas

### Three.js

Utilizado para renderização 3D, câmera, objetos, iluminação, cenário, personagens, armas e efeitos.

Versão:

```text
Three.js r128
```

### PeerJS

Utilizado para comunicação através de:

```text
WebRTC
```

### Tone.js

Utilizado para gerar os efeitos sonoros do jogo através de síntese de áudio.

---

# 🔄 Fluxo de execução

A cada frame:

```text
Input.poll()
      ↓
feature.update(dt, input)
      ↓
View.syncCamera()
      ↓
View.render()
```

O `Input.poll()` coleta os comandos.

As funcionalidades processam as entradas.

A câmera é sincronizada.

Por fim, a View renderiza o quadro.

---

# 🧩 Sistema de funcionalidades

As funcionalidades são registradas em:

```text
js/main.js
```

Cada módulo pode ser ativado ou removido.

Exemplo:

```js
.use(FPS.Effects)
```

Caso essa linha seja removida, os efeitos correspondentes deixam de funcionar.

---

# ➕ Adicionando uma funcionalidade

Crie um novo arquivo em:

```text
js/features/
```

Exemplo:

```text
saude.js
```

Estrutura:

```js
(function (FPS) {
  'use strict';

  const { Model, View } = FPS;

  const Health = {
    name: 'saude',

    init() {
      // Inicialização
    },

    update(dt, input) {
      // Atualização por frame
    }
  };

  FPS.Health = Health;

})(window.FPS = window.FPS || {});
```

Depois:

1. Adicione o script no `index.html`.
2. Registre o módulo no `main.js`.
3. Coloque novos dados no `Model`.
4. Coloque novos elementos visuais na `View`.

---

# 🎮 Adicionando Gamepad

Um novo dispositivo de entrada pode utilizar:

```js
Input.add({
  move: { x: 0, y: 0 },
  jump: false,
  fire: false
});
```

Para controlar a câmera:

```js
Model.look(dx, dy);
```

---

# 🔧 Ajustes rápidos

Os principais parâmetros ficam em:

```text
js/model/model.js
```

Exemplos:

```text
SPEED
GRAVITY
JUMP_V
FIRE_RATE
BOXES
SIZE
```

Eles controlam velocidade, gravidade, pulo, intervalo entre tiros, quantidade de blocos e tamanho do mapa.

---

# 🚀 Desempenho

Para melhorar o desempenho, utilize:

**⚙ Configurações**

Principalmente:

- Resolução.
- Sombras.
- Distância de visão.
- Qualidade geral.

---

# 🗂️ Ordem dos scripts

Os arquivos utilizam o namespace global:

```js
FPS
```

Ordem de dependência:

```text
utils
  ↓
model
  ↓
view
  ↓
controllers
  ↓
features
  ↓
game
  ↓
main
```

O projeto não utiliza ES Modules de propósito, permitindo execução direta através de:

```text
file://
```

---

# 🌍 Mapa

O mapa é compartilhado entre os jogadores durante uma partida multiplayer.

O anfitrião sorteia uma semente (`seed`) e essa informação é utilizada para que os jogadores tenham o mesmo mapa.

Os pontos de respawn procuram posições livres, evitando blocos e outros jogadores.

---

# 🧪 Desenvolvimento

O projeto foi estruturado para facilitar a criação e manutenção de novas funcionalidades.

A separação entre:

```text
Model
View
Controllers
Features
Network
```

permite alterar uma parte do jogo sem concentrar toda a lógica em um único arquivo.

---

# 📌 Estado atual

O projeto possui:

- FPS 3D.
- Single-player.
- Multiplayer P2P.
- Salas de 2–8 jogadores.
- PeerJS/WebRTC.
- Sistema de tiro.
- Dano.
- Vida.
- Morte.
- Respawn.
- Ragdoll.
- Manchas de tinta.
- Munição.
- Caixas de munição.
- Recarga.
- Corrida.
- Fôlego.
- Agachamento.
- Sons sintetizados.
- Controles para PC.
- Controles para celular.
- Configurações.
- Controles personalizáveis.
- LocalStorage.
- Arquitetura MVC modular.

---

# 🔮 Possíveis melhorias futuras

- 🏆 Sistema de pontuação.
- 📊 Ranking.
- 🔫 Novas armas.
- 🗺️ Novos mapas.
- 🎮 Novos modos de jogo.
- 👥 Times.
- 🏠 Lobby mais completo.
- 🎨 Personalização dos personagens.
- 💥 Novos efeitos de impacto.
- 🌐 Servidor dedicado.
- 🔗 Servidor TURN.
- 📈 Estatísticas das partidas.
- 👤 Sistema de contas.
- 🏅 Sistema de conquistas.

---

# 📄 Licença

A licença do projeto deve ser definida pelo responsável pelo repositório.

---

# 👨‍💻 Tiro a Tiro

Projeto de FPS 3D desenvolvido com tecnologias web, com foco em multiplayer P2P, modularidade e compatibilidade entre computador e dispositivos móveis.

### Tecnologias principais

```text
HTML5
CSS3
JavaScript
Three.js
PeerJS
WebRTC
Tone.js
LocalStorage
MVC
```

🎯 **Tiro a Tiro — entre na sala, escolha sua cor e comece a partida.**
