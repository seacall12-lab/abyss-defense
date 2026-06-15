(function () {
  "use strict";

  window.Abyss =
    window.Abyss || {};

  var State =
    window.Abyss.State;

  var Combat =
    window.Abyss.Combat;

  var Render =
    window.Abyss.Render;

  var UI =
    window.Abyss.UI;

  var lastTime = 0;
  var uiTimer = 0;

  if (
    !State ||
    !Combat ||
    !Render ||
    !UI
  ) {
    throw new Error(
      "main.js: 필수 게임 모듈을 찾을 수 없습니다."
    );
  }

  function gameLoop(time) {
    var rawDt;
    var current;

    if (!lastTime) {
      lastTime = time;
    }

    rawDt =
      Math.min(
        0.06,
        (
          time -
          lastTime
        ) /
        1000
      );

    lastTime = time;
    current = State.get();

    Combat.update(
      rawDt *
      current.speed
    );

    Render.render();

    uiTimer += rawDt;

    if (uiTimer >= 0.1) {
      uiTimer = 0;
      UI.updateRuntime();
    }

    window.requestAnimationFrame(
      gameLoop
    );
  }

  function init() {
    State.load();
    Render.init();
    UI.init();

    window.requestAnimationFrame(
      gameLoop
    );
  }

  init();
}());
