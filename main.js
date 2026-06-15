(function () {
  "use strict";

  var Abyss =
    window.Abyss || {};

  var requiredModules = [
    {
      name: "State",
      file: "state.js"
    },
    {
      name: "Progression",
      file: "progression.js"
    },
    {
      name: "Combat",
      file: "combat.js"
    },
    {
      name: "Render",
      file: "render.js"
    },
    {
      name: "UI",
      file: "ui.js"
    },
    {
      name: "Strategy",
      file: "strategy.js"
    },
    {
      name: "Missions",
      file: "missions.js"
    }
  ];

  var missingModules =
    requiredModules.filter(
      function (module) {
        return !Abyss[module.name];
      }
    );

  function showStartupError(
    message
  ) {
    var box =
      document.getElementById(
        "startupError"
      );

    if (box) {
      box.hidden = false;
      box.textContent = message;
    }

    console.error(message);
  }

  if (
    missingModules.length > 0
  ) {
    showStartupError(
      "게임 모듈 로드 실패\n\n" +
        "누락된 모듈:\n" +
        missingModules
          .map(
            function (module) {
              return (
                "- " +
                module.name +
                " (" +
                module.file +
                ")"
              );
            }
          )
          .join("\n") +
        "\n\n해당 파일이 없거나 파일 내부 오류로 실행이 중단됐습니다."
    );

    return;
  }

  var State =
    Abyss.State;

  var Progression =
    Abyss.Progression;

  var Combat =
    Abyss.Combat;

  var Render =
    Abyss.Render;

  var UI =
    Abyss.UI;

  var Strategy =
    Abyss.Strategy;

  var Missions =
    Abyss.Missions;

  var lastTime = 0;
  var uiTimer = 0;

  function gameLoop(time) {
    var rawDt;
    var current;

    if (!lastTime) {
      lastTime = time;
    }

    rawDt = Math.min(
      0.06,
      (
        time -
        lastTime
      ) / 1000
    );

    lastTime = time;
    current = State.get();

    Combat.update(
      rawDt *
        current.speed
    );

    Render.render();

    uiTimer += rawDt;

    if (
      uiTimer >= 0.1
    ) {
      uiTimer = 0;
      UI.updateRuntime();
    }

    window.requestAnimationFrame(
      gameLoop
    );
  }

  function init() {
    try {
      State.load();

      /*
       * UI가 먼저 DOM 요소를 저장해야 한다.
       * Render.init()의 resize 과정에서
       * UI 함수를 호출할 수 있기 때문이다.
       */
      UI.init();
      Render.init();

      /*
       * 추가 시스템은 기본 UI와 Canvas가
       * 준비된 이후 초기화한다.
       */
      Progression.init();
      Strategy.init();
      Missions.init();

      console.log(
        "[Abyss] v1.0.0 정상 실행"
      );

      window.requestAnimationFrame(
        gameLoop
      );
    } catch (error) {
      showStartupError(
        "게임 초기화 실패\n\n" +
          error.message +
          (
            error.stack
              ? "\n\n" +
                error.stack
              : ""
          )
      );
    }
  }

  init();
}());
