(function () {
  "use strict";

  window.Abyss = window.Abyss || {};

  var Data = window.Abyss.Data;
  var State = window.Abyss.State;
  var Combat = window.Abyss.Combat;

  var canvas;
  var stage;
  var ctx;

  var viewportWidth = 360;
  var viewportHeight = 450;

  var tileSize = 44;
  var boardWidth = 352;
  var boardHeight = 440;

  var boardOffsetX = 0;
  var boardOffsetY = 0;

  if (!Data || !State || !Combat) {
    throw new Error(
      "render.js: data.js, state.js, combat.js가 먼저 로드되어야 합니다."
    );
  }

  function init() {
    canvas = document.getElementById("gameCanvas");
    stage = document.getElementById("gameStage");

    if (!canvas || !stage) {
      throw new Error(
        "render.js: Canvas 요소를 찾을 수 없습니다."
      );
    }

    ctx = canvas.getContext("2d");

    resize();
  }

  function resize() {
    var rect;
    var dpr;

    if (!canvas || !stage) {
      return;
    }

    rect = stage.getBoundingClientRect();

    viewportWidth = Math.max(
      1,
      Math.floor(rect.width)
    );

    viewportHeight = Math.max(
      1,
      Math.floor(rect.height)
    );

    tileSize = Math.min(
      viewportWidth / Data.board.cols,
      viewportHeight / Data.board.rows
    );

    boardWidth =
      tileSize *
      Data.board.cols;

    boardHeight =
      tileSize *
      Data.board.rows;

    boardOffsetX =
      (
        viewportWidth -
        boardWidth
      ) / 2;

    boardOffsetY =
      (
        viewportHeight -
        boardHeight
      ) / 2;

    dpr =
      window.devicePixelRatio ||
      1;

    canvas.width =
      Math.floor(
        viewportWidth * dpr
      );

    canvas.height =
      Math.floor(
        viewportHeight * dpr
      );

    canvas.style.width =
      viewportWidth + "px";

    canvas.style.height =
      viewportHeight + "px";

    ctx.setTransform(
      dpr,
      0,
      0,
      dpr,
      0,
      0
    );

    if (
      window.Abyss.UI &&
      window.Abyss.UI.updateActionMenu
    ) {
      window.Abyss.UI.updateActionMenu();
    }
  }

  function getMetrics() {
    return {
      viewportWidth: viewportWidth,
      viewportHeight: viewportHeight,

      tileSize: tileSize,

      boardWidth: boardWidth,
      boardHeight: boardHeight,

      boardOffsetX: boardOffsetX,
      boardOffsetY: boardOffsetY
    };
  }

  function screenToCell(clientX, clientY) {
    var rect =
      canvas.getBoundingClientRect();

    var screenX =
      (
        (
          clientX -
          rect.left
        ) /
        rect.width
      ) *
      viewportWidth;

    var screenY =
      (
        (
          clientY -
          rect.top
        ) /
        rect.height
      ) *
      viewportHeight;

    var localX =
      screenX -
      boardOffsetX;

    var localY =
      screenY -
      boardOffsetY;

    if (
      localX < 0 ||
      localY < 0 ||
      localX >= boardWidth ||
      localY >= boardHeight
    ) {
      return null;
    }

    return {
      col: clamp(
        Math.floor(
          localX /
          tileSize
        ),
        0,
        Data.board.cols - 1
      ),

      row: clamp(
        Math.floor(
          localY /
          tileSize
        ),
        0,
        Data.board.rows - 1
      )
    };
  }

  function render() {
    var current;
    var shakeX;
    var shakeY;

    if (!ctx) {
      return;
    }

    current = State.get();

    ctx.clearRect(
      0,
      0,
      viewportWidth,
      viewportHeight
    );

    ctx.fillStyle =
      "#020617";

    ctx.fillRect(
      0,
      0,
      viewportWidth,
      viewportHeight
    );

    shakeX =
      current.screenShake > 0
        ? (
            Math.random() -
            0.5
          ) *
          tileSize *
          0.12 *
          current.screenShake
        : 0;

    shakeY =
      current.screenShake > 0
        ? (
            Math.random() -
            0.5
          ) *
          tileSize *
          0.12 *
          current.screenShake
        : 0;

    ctx.save();

    ctx.translate(
      boardOffsetX + shakeX,
      boardOffsetY + shakeY
    );

    drawBackground();
    drawPath();
    drawBlockedTiles();
    drawBuildHighlights();
    drawTowers();
    drawHero();
    drawEnemies();
    drawProjectiles();
    drawEffects();
    drawFloaters();

    ctx.restore();

    drawOverlayText();
  }

  function drawBackground() {
    var map =
      State.getMap();

    var gradient =
      ctx.createLinearGradient(
        0,
        0,
        0,
        boardHeight
      );

    var row;
    var col;

    gradient.addColorStop(
      0,
      map.bgTop
    );

    gradient.addColorStop(
      1,
      map.bgBottom
    );

    ctx.fillStyle =
      gradient;

    ctx.fillRect(
      0,
      0,
      boardWidth,
      boardHeight
    );

    for (
      row = 0;
      row < Data.board.rows;
      row += 1
    ) {
      for (
        col = 0;
        col < Data.board.cols;
        col += 1
      ) {
        ctx.fillStyle =
          (row + col) % 2 === 0
            ? "rgba(255,255,255,0.022)"
            : "rgba(255,255,255,0.038)";

        ctx.fillRect(
          col * tileSize,
          row * tileSize,
          tileSize,
          tileSize
        );

        ctx.strokeStyle =
          "rgba(148,163,184,0.08)";

        ctx.strokeRect(
          col * tileSize + 0.5,
          row * tileSize + 0.5,
          tileSize - 1,
          tileSize - 1
        );
      }
    }

    drawMapDecor();
  }

  function drawMapDecor() {
    var map =
      State.getMap();

    State.get().mapDecor.forEach(
      function (item) {
        var x =
          (
            item.x +
            0.5
          ) *
          tileSize;

        var y =
          (
            item.y +
            0.5
          ) *
          tileSize;

        ctx.save();
        ctx.globalAlpha =
          item.alpha;

        if (map.decor === "rift") {
          ctx.strokeStyle =
            item.color;

          ctx.lineWidth =
            1.5;

          ctx.beginPath();

          ctx.moveTo(
            x -
            item.size *
            tileSize,

            y -
            item.size *
            0.2 *
            tileSize
          );

          ctx.lineTo(
            x +
            item.size *
            0.35 *
            tileSize,

            y +
            item.size *
            0.25 *
            tileSize
          );

          ctx.lineTo(
            x -
            item.size *
            0.1 *
            tileSize,

            y +
            item.size *
            0.7 *
            tileSize
          );

          ctx.stroke();
        } else {
          ctx.fillStyle =
            item.color;

          ctx.beginPath();

          ctx.ellipse(
            x,
            y,

            item.size *
            tileSize,

            item.size *
            (
              map.decor === "swamp"
                ? 0.52
                : 0.72
            ) *
            tileSize,

            item.rotation,

            0,
            Math.PI * 2
          );

          ctx.fill();
        }

        ctx.restore();
      }
    );
  }

  function drawPath() {
    var map =
      State.getMap();

    var points =
      State.getPathPoints();

    var cells =
      State.getPathCells();

    var start =
      cells[0];

    var end =
      cells[
        cells.length - 1
      ];

    ctx.lineCap =
      "round";

    ctx.lineJoin =
      "round";

    drawPolyline(
      points,
      map.pathOuter,
      tileSize * 0.68
    );

    drawPolyline(
      points,
      map.pathInner,
      tileSize * 0.48
    );

    if (map.decor === "rift") {
      drawRiftDetails(points);
    } else if (
      map.decor === "swamp"
    ) {
      drawSwampDetails(points);
    }

    drawPortal(
      start.x,
      start.y,
      "#22c55e",
      false
    );

    drawPortal(
      end.x,
      end.y,
      "#ef4444",
      true
    );
  }

  function drawPolyline(
    points,
    color,
    width
  ) {
    ctx.beginPath();

    points.forEach(
      function (point, index) {
        if (index === 0) {
          ctx.moveTo(
            point.x * tileSize,
            point.y * tileSize
          );
        } else {
          ctx.lineTo(
            point.x * tileSize,
            point.y * tileSize
          );
        }
      }
    );

    ctx.strokeStyle =
      color;

    ctx.lineWidth =
      width;

    ctx.stroke();
  }

  function drawRiftDetails(points) {
    ctx.save();

    ctx.strokeStyle =
      "rgba(216,180,254,0.36)";

    ctx.lineWidth =
      1.4;

    points.forEach(
      function (point, index) {
        var x;
        var y;

        if (index % 2) {
          return;
        }

        x =
          point.x *
          tileSize;

        y =
          point.y *
          tileSize;

        ctx.beginPath();

        ctx.moveTo(
          x -
          tileSize *
          0.18,

          y -
          tileSize *
          0.1
        );

        ctx.lineTo(
          x +
          tileSize *
          0.16,

          y +
          tileSize *
          0.12
        );

        ctx.stroke();
      }
    );

    ctx.restore();
  }

  function drawSwampDetails(points) {
    var time =
      performance.now() /
      600;

    ctx.save();

    ctx.fillStyle =
      "rgba(190,242,100,0.24)";

    points.forEach(
      function (point, index) {
        var radius;

        if (index % 2) {
          return;
        }

        radius =
          tileSize *
          (
            0.04 +
            Math.abs(
              Math.sin(
                time +
                index
              )
            ) *
            0.025
          );

        ctx.beginPath();

        ctx.arc(
          (
            point.x +
            0.16
          ) *
          tileSize,

          (
            point.y -
            0.1
          ) *
          tileSize,

          radius,

          0,
          Math.PI * 2
        );

        ctx.fill();
      }
    );

    ctx.restore();
  }

  function drawPortal(
    col,
    row,
    color,
    isBase
  ) {
    var x =
      (
        col +
        0.5
      ) *
      tileSize;

    var y =
      (
        row +
        0.5
      ) *
      tileSize;

    var pulse =
      1 +
      Math.sin(
        performance.now() /
        240
      ) *
      0.08;

    ctx.save();

    ctx.shadowColor =
      color;

    ctx.shadowBlur =
      14;

    ctx.strokeStyle =
      color;

    ctx.lineWidth =
      3;

    ctx.beginPath();

    ctx.arc(
      x,
      y,

      tileSize *
      0.25 *
      pulse,

      0,
      Math.PI * 2
    );

    ctx.stroke();

    if (isBase) {
      ctx.fillStyle =
        color;

      crystalPath(
        x,
        y,
        tileSize * 0.22,
        tileSize * 0.38
      );

      ctx.fill();
    } else {
      ctx.fillStyle =
        hexToRgba(
          color,
          0.28
        );

      ctx.beginPath();

      ctx.arc(
        x,
        y,
        tileSize * 0.18,
        0,
        Math.PI * 2
      );

      ctx.fill();
    }

    ctx.restore();
  }

  function drawBlockedTiles() {
    (
      State.getMap().blocked ||
      []
    ).forEach(function (point) {
      var x =
        point.x *
        tileSize;

      var y =
        point.y *
        tileSize;

      ctx.fillStyle =
        "rgba(15,23,42,0.72)";

      roundedRectPath(
        x +
        tileSize *
        0.16,

        y +
        tileSize *
        0.16,

        tileSize *
        0.68,

        tileSize *
        0.68,

        8
      );

      ctx.fill();

      ctx.strokeStyle =
        "rgba(148,163,184,0.24)";

      ctx.stroke();

      ctx.fillStyle =
        "rgba(148,163,184,0.22)";

      ctx.beginPath();

      ctx.moveTo(
        x +
        tileSize *
        0.25,

        y +
        tileSize *
        0.68
      );

      ctx.lineTo(
        x +
        tileSize *
        0.46,

        y +
        tileSize *
        0.25
      );

      ctx.lineTo(
        x +
        tileSize *
        0.75,

        y +
        tileSize *
        0.67
      );

      ctx.closePath();
      ctx.fill();
    });
  }

  function drawBuildHighlights() {
    var current =
      State.get();

    var selected =
      State.getSelectedTower();

    var pathSet;
    var blockedSet;
    var row;
    var col;

    if (selected) {
      drawRangeCircle(
        selected.col + 0.5,
        selected.row + 0.5,

        Combat.getTowerStats(
          selected
        ).range,

        Data.towers[
          selected.type
        ].color
      );

      return;
    }

    if (
      !current.selectedBuildType ||
      current.status !== "playing"
    ) {
      return;
    }

    pathSet =
      State.getPathSet();

    blockedSet =
      State.getBlockedSet();

    ctx.save();
    ctx.globalAlpha =
      0.17;

    for (
      row = 0;
      row < Data.board.rows;
      row += 1
    ) {
      for (
        col = 0;
        col < Data.board.cols;
        col += 1
      ) {
        if (
          pathSet.has(
            col + "," + row
          ) ||
          blockedSet.has(
            col + "," + row
          ) ||
          State.getTowerAt(
            col,
            row
          ) ||
          State.isHeroTile(
            col,
            row
          )
        ) {
          continue;
        }

        ctx.fillStyle =
          Data.towers[
            current.selectedBuildType
          ].color;

        roundedRectPath(
          col * tileSize +
          tileSize * 0.3,

          row * tileSize +
          tileSize * 0.3,

          tileSize * 0.4,
          tileSize * 0.4,

          5
        );

        ctx.fill();
      }
    }

    ctx.restore();
  }

  function drawRangeCircle(
    x,
    y,
    range,
    color
  ) {
    ctx.beginPath();

    ctx.arc(
      x * tileSize,
      y * tileSize,
      range * tileSize,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      hexToRgba(
        color,
        0.07
      );

    ctx.strokeStyle =
      hexToRgba(
        color,
        0.4
      );

    ctx.lineWidth =
      2;

    ctx.fill();
    ctx.stroke();
  }

  function drawTowers() {
    var current =
      State.get();

    current.towers.forEach(
      function (tower) {
        var table =
          Data.towers[
            tower.type
          ];

        var x =
          (
            tower.col +
            0.5
          ) *
          tileSize;

        var y =
          (
            tower.row +
            0.5
          ) *
          tileSize;

        var selected =
          tower.id ===
          current.selectedTowerId;

        ctx.save();

        if (selected) {
          ctx.shadowColor =
            table.color;

          ctx.shadowBlur =
            18;
        }

        drawTowerSprite(
          tower,
          x,
          y
        );

        if (selected) {
          ctx.strokeStyle =
            "rgba(255,255,255,0.9)";

          ctx.lineWidth =
            2;

          ctx.beginPath();

          ctx.arc(
            x,
            y,
            tileSize * 0.39,
            0,
            Math.PI * 2
          );

          ctx.stroke();
        }

        ctx.fillStyle =
          "#e5e7eb";

        ctx.font =
          "800 " +
          Math.max(
            8,
            tileSize * 0.16
          ) +
          "px system-ui";

        ctx.textAlign =
          "center";

        ctx.textBaseline =
          "middle";

        ctx.fillText(
          "Lv." + tower.level,
          x,
          y + tileSize * 0.32
        );

        if (tower.trait) {
          ctx.fillStyle =
            "#facc15";

          ctx.beginPath();

          ctx.arc(
            x + tileSize * 0.23,
            y - tileSize * 0.27,
            tileSize * 0.075,
            0,
            Math.PI * 2
          );

          ctx.fill();
        }

        ctx.restore();
      }
    );
  }

  function drawTowerSprite(
    tower,
    x,
    y
  ) {
    var table =
      Data.towers[
        tower.type
      ];

    var color =
      table.color;

    var size =
      tileSize *
      (
        0.25 +
        tower.level * 0.01
      );

    var index;

    ctx.fillStyle =
      "rgba(15,23,42,0.94)";

    roundedRectPath(
      x - size,
      y - size * 0.42,
      size * 2,
      size * 1.32,
      8
    );

    ctx.fill();

    ctx.strokeStyle =
      color;

    ctx.lineWidth =
      2;

    ctx.stroke();

    if (tower.type === "archer") {
      ctx.strokeStyle =
        color;

      ctx.lineWidth =
        3;

      ctx.beginPath();

      ctx.arc(
        x,
        y - size * 0.42,
        size * 0.62,
        -Math.PI * 0.7,
        Math.PI * 0.7
      );

      ctx.stroke();

      ctx.beginPath();

      ctx.moveTo(
        x - size * 0.08,
        y - size * 0.95
      );

      ctx.lineTo(
        x + size * 0.56,
        y - size * 0.42
      );

      ctx.stroke();
    } else if (
      tower.type === "cannon"
    ) {
      ctx.save();

      ctx.translate(
        x,
        y - size * 0.32
      );

      ctx.rotate(-0.32);

      ctx.fillStyle =
        color;

      roundedRectPath(
        0,
        -size * 0.18,
        size,
        size * 0.36,
        4
      );

      ctx.fill();
      ctx.restore();

      ctx.fillStyle =
        "#334155";

      ctx.beginPath();

      ctx.arc(
        x,
        y - size * 0.2,
        size * 0.42,
        0,
        Math.PI * 2
      );

      ctx.fill();

      ctx.strokeStyle =
        color;

      ctx.stroke();
    } else if (
      tower.type === "ice"
    ) {
      ctx.fillStyle =
        color;

      crystalPath(
        x,
        y - size * 0.22,
        size * 0.62,
        size * 0.95
      );

      ctx.fill();

      ctx.fillStyle =
        "rgba(255,255,255,0.48)";

      crystalPath(
        x + size * 0.24,
        y - size * 0.12,
        size * 0.28,
        size * 0.5
      );

      ctx.fill();
    } else if (
      tower.type === "lightning"
    ) {
      ctx.strokeStyle =
        color;

      ctx.lineWidth =
        3;

      ctx.beginPath();

      ctx.moveTo(
        x - size * 0.34,
        y + size * 0.2
      );

      ctx.lineTo(
        x + size * 0.12,
        y - size * 0.2
      );

      ctx.lineTo(
        x - size * 0.04,
        y - size * 0.2
      );

      ctx.lineTo(
        x + size * 0.38,
        y - size * 0.84
      );

      ctx.stroke();

      ctx.fillStyle =
        hexToRgba(
          color,
          0.75
        );

      ctx.beginPath();

      ctx.arc(
        x,
        y - size * 0.72,
        size * 0.28,
        0,
        Math.PI * 2
      );

      ctx.fill();
    } else if (
      tower.type === "poison"
    ) {
      ctx.fillStyle =
        "#1f2937";

      ctx.beginPath();

      ctx.ellipse(
        x,
        y - size * 0.12,
        size * 0.65,
        size * 0.42,
        0,
        0,
        Math.PI * 2
      );

      ctx.fill();

      ctx.strokeStyle =
        color;

      ctx.stroke();

      ctx.fillStyle =
        color;

      for (
        index = 0;
        index < 3;
        index += 1
      ) {
        ctx.beginPath();

        ctx.arc(
          x -
          size * 0.32 +
          index *
          size * 0.32,

          y -
          size *
          (
            0.44 +
            0.1 *
            Math.sin(
              performance.now() /
              300 +
              index
            )
          ),

          size * 0.11,

          0,
          Math.PI * 2
        );

        ctx.fill();
      }
    }
  }

  function drawHero() {
    var hero =
      State.getHeroPosition();

    var x =
      hero.x *
      tileSize;

    var y =
      hero.y *
      tileSize;

    var pulse =
      1 +
      Math.sin(
        performance.now() /
        260
      ) *
      0.04;

    ctx.save();

    ctx.beginPath();

    ctx.arc(
      x,
      y,
      tileSize * 0.35 * pulse,
      0,
      Math.PI * 2
    );

    ctx.fillStyle =
      "rgba(250,204,21,0.14)";

    ctx.fill();

    ctx.strokeStyle =
      "rgba(250,204,21,0.82)";

    ctx.lineWidth =
      2;

    ctx.stroke();

    ctx.fillStyle =
      "#1e293b";

    roundedRectPath(
      x - tileSize * 0.14,
      y - tileSize * 0.02,
      tileSize * 0.28,
      tileSize * 0.27,
      6
    );

    ctx.fill();

    ctx.fillStyle =
      "#fbbf24";

    ctx.beginPath();

    ctx.arc(
      x,
      y - tileSize * 0.16,
      tileSize * 0.15,
      0,
      Math.PI * 2
    );

    ctx.fill();

    ctx.strokeStyle =
      "#fde047";

    ctx.lineWidth =
      3;

    ctx.beginPath();

    ctx.moveTo(
      x + tileSize * 0.12,
      y + tileSize * 0.02
    );

    ctx.lineTo(
      x + tileSize * 0.34,
      y - tileSize * 0.18
    );

    ctx.stroke();

    ctx.restore();
  }

  function drawEnemies() {
    State.get().enemies.forEach(
      function (enemy) {
        var x =
          enemy.x *
          tileSize;

        var y =
          enemy.y *
          tileSize;

        var radius =
          enemy.radius *
          tileSize;

        var pulse;

        ctx.save();

        if (
          enemy.boss ||
          enemy.traits.indexOf("darkAura") >= 0
        ) {
          pulse =
            1 +
            Math.sin(
              performance.now() /
              180
            ) *
            0.08;

          ctx.fillStyle =
            hexToRgba(
              enemy.aura,
              enemy.boss
                ? 0.18
                : 0.1
            );

          ctx.beginPath();

          ctx.arc(
            x,
            y,

            radius *
            (
              enemy.boss
                ? 1.9
                : 1.4
            ) *
            pulse,

            0,
            Math.PI * 2
          );

          ctx.fill();
        }

        drawMonsterSprite(
          enemy,
          x,
          y,
          radius
        );

        drawHpBar(
          x,

          y -
          radius -
          tileSize * 0.17,

          radius * 2.15,
          tileSize * 0.08,

          enemy.hp /
          enemy.maxHp,

          enemy.boss
            ? "#f97316"
            : "#22c55e"
        );

        if (
          enemy.maxShield > 0 &&
          enemy.shield > 0
        ) {
          drawHpBar(
            x,

            y -
            radius -
            tileSize * 0.28,

            radius * 2.15,
            tileSize * 0.055,

            enemy.shield /
            enemy.maxShield,

            "#38bdf8"
          );
        }

        ctx.restore();
      }
    );
  }

  function drawMonsterSprite(
    enemy,
    x,
    y,
    radius
  ) {
    var time =
      performance.now() /
      350 +
      enemy.animSeed;

    var index;

    y +=
      Math.sin(time) *
      tileSize *
      0.025;

    ctx.fillStyle =
      enemy.color;

    ctx.strokeStyle =
      getEnemyStrokeColor(
        enemy
      );

    ctx.lineWidth =
      enemy.boss
        ? 3
        : 2;

    switch (enemy.type) {
      case "slime":
        ctx.beginPath();

        ctx.ellipse(
          x,

          y +
          radius * 0.08,

          radius *
          (
            1.05 +
            Math.sin(time) *
            0.06
          ),

          radius * 0.78,

          0,
          Math.PI,
          0
        );

        ctx.lineTo(
          x + radius * 0.9,
          y + radius * 0.38
        );

        ctx.quadraticCurveTo(
          x,
          y + radius * 0.7,
          x - radius * 0.9,
          y + radius * 0.38
        );

        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        drawEye(
          x - radius * 0.28,
          y + radius * 0.05,
          radius * 0.08
        );

        drawEye(
          x + radius * 0.28,
          y + radius * 0.05,
          radius * 0.08
        );
        break;

      case "bat":
        drawWing(
          x - radius * 0.22,
          y,
          -1,
          radius,
          enemy.color
        );

        drawWing(
          x + radius * 0.22,
          y,
          1,
          radius,
          enemy.color
        );

        ctx.beginPath();

        ctx.ellipse(
          x,
          y,
          radius * 0.52,
          radius * 0.75,
          0,
          0,
          Math.PI * 2
        );

        ctx.fill();
        ctx.stroke();

        drawEye(
          x - radius * 0.15,
          y - radius * 0.08,
          radius * 0.06
        );

        drawEye(
          x + radius * 0.15,
          y - radius * 0.08,
          radius * 0.06
        );
        break;

      case "goblin":
        drawEar(
          x - radius * 0.5,
          y - radius * 0.06,
          -1,
          radius
        );

        drawEar(
          x + radius * 0.5,
          y - radius * 0.06,
          1,
          radius
        );

        ctx.beginPath();

        ctx.arc(
          x,
          y,
          radius * 0.78,
          0,
          Math.PI * 2
        );

        ctx.fill();
        ctx.stroke();

        drawEye(
          x - radius * 0.22,
          y - radius * 0.08,
          radius * 0.06
        );

        drawEye(
          x + radius * 0.22,
          y - radius * 0.08,
          radius * 0.06
        );
        break;

      case "wolf":
        ctx.beginPath();

        ctx.moveTo(
          x - radius * 0.86,
          y + radius * 0.2
        );

        ctx.lineTo(
          x - radius * 0.2,
          y - radius * 0.6
        );

        ctx.lineTo(
          x + radius * 0.75,
          y - radius * 0.25
        );

        ctx.lineTo(
          x + radius * 0.55,
          y + radius * 0.5
        );

        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();

        ctx.moveTo(
          x - radius * 0.12,
          y - radius * 0.58
        );

        ctx.lineTo(
          x + radius * 0.04,
          y - radius * 0.98
        );

        ctx.lineTo(
          x + radius * 0.22,
          y - radius * 0.52
        );

        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        drawEye(
          x + radius * 0.34,
          y - radius * 0.22,
          radius * 0.055
        );
        break;

      case "plagueCrawler":
        ctx.beginPath();

        ctx.ellipse(
          x,
          y,
          radius,
          radius * 0.62,
          0,
          0,
          Math.PI * 2
        );

        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle =
          "rgba(190,242,100,0.8)";

        for (
          index = -2;
          index <= 2;
          index += 1
        ) {
          ctx.beginPath();

          ctx.moveTo(
            x + index * radius * 0.28,
            y + radius * 0.28
          );

          ctx.lineTo(
            x + index * radius * 0.38,
            y + radius * 0.72
          );

          ctx.stroke();
        }
        break;

      case "golem":
      case "bossGolem":
        drawBlock(
          x,
          y - radius * 0.3,
          radius * 1.1,
          radius * 0.85,
          enemy.color
        );

        drawBlock(
          x - radius * 0.55,
          y + radius * 0.35,
          radius * 0.55,
          radius * 0.48,
          enemy.color
        );

        drawBlock(
          x + radius * 0.55,
          y + radius * 0.35,
          radius * 0.55,
          radius * 0.48,
          enemy.color
        );

        drawEye(
          x - radius * 0.2,
          y - radius * 0.35,
          radius * 0.055
        );

        drawEye(
          x + radius * 0.2,
          y - radius * 0.35,
          radius * 0.055
        );
        break;

      case "darkPriest":
        ctx.beginPath();

        ctx.moveTo(
          x,
          y - radius * 0.95
        );

        ctx.quadraticCurveTo(
          x + radius * 0.85,
          y - radius * 0.3,
          x + radius * 0.55,
          y + radius * 0.75
        );

        ctx.lineTo(
          x - radius * 0.55,
          y + radius * 0.75
        );

        ctx.quadraticCurveTo(
          x - radius * 0.85,
          y - radius * 0.3,
          x,
          y - radius * 0.95
        );

        ctx.fill();
        ctx.stroke();

        drawEye(
          x - radius * 0.15,
          y - radius * 0.22,
          radius * 0.06,
          "#fef08a"
        );

        drawEye(
          x + radius * 0.15,
          y - radius * 0.22,
          radius * 0.06,
          "#fef08a"
        );
        break;

      case "shieldImp":
        ctx.beginPath();

        ctx.arc(
          x,
          y,
          radius * 0.75,
          0,
          Math.PI * 2
        );

        ctx.fill();
        ctx.stroke();

        ctx.fillStyle =
          "rgba(125,211,252,0.65)";

        shieldPath(
          x,
          y + radius * 0.05,
          radius * 0.55
        );

        ctx.fill();
        ctx.stroke();
        break;

      case "shadowKnight":
        shieldPath(
          x,
          y,
          radius * 0.88
        );

        ctx.fill();
        ctx.stroke();

        ctx.fillStyle =
          "#111827";

        ctx.fillRect(
          x - radius * 0.4,
          y - radius * 0.35,
          radius * 0.8,
          radius * 0.22
        );

        ctx.fillStyle =
          "#f8fafc";

        ctx.fillRect(
          x - radius * 0.28,
          y - radius * 0.28,
          radius * 0.18,
          radius * 0.05
        );

        ctx.fillRect(
          x + radius * 0.1,
          y - radius * 0.28,
          radius * 0.18,
          radius * 0.05
        );
        break;

      case "abyssLord":
        ctx.fillStyle =
          "#020617";

        ctx.beginPath();

        ctx.moveTo(
          x,
          y - radius
        );

        ctx.lineTo(
          x + radius * 0.85,
          y + radius * 0.75
        );

        ctx.lineTo(
          x - radius * 0.85,
          y + radius * 0.75
        );

        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle =
          "#f59e0b";

        ctx.lineWidth =
          3;

        ctx.beginPath();

        ctx.moveTo(
          x - radius * 0.35,
          y - radius * 0.8
        );

        ctx.lineTo(
          x - radius * 0.75,
          y - radius * 1.2
        );

        ctx.moveTo(
          x + radius * 0.35,
          y - radius * 0.8
        );

        ctx.lineTo(
          x + radius * 0.75,
          y - radius * 1.2
        );

        ctx.stroke();

        drawEye(
          x - radius * 0.18,
          y - radius * 0.32,
          radius * 0.06,
          "#f59e0b"
        );

        drawEye(
          x + radius * 0.18,
          y - radius * 0.32,
          radius * 0.06,
          "#f59e0b"
        );
        break;

      default:
        ctx.beginPath();

        ctx.arc(
          x,
          y,
          radius,
          0,
          Math.PI * 2
        );

        ctx.fill();
        ctx.stroke();
    }
  }

  function getEnemyStrokeColor(enemy) {
    if (
      enemy.freezeTimer > 0 ||
      enemy.slowTimer > 0
    ) {
      return "#67e8f9";
    }

    if (enemy.poisonTimer > 0) {
      return "#bef264";
    }

    if (enemy.vulnerabilityTimer > 0) {
      return "#fca5a5";
    }

    return enemy.aura;
  }

  function drawHpBar(
    x,
    y,
    width,
    height,
    ratio,
    color
  ) {
    var fillWidth;

    roundedRectPath(
      x - width / 2,
      y - height / 2,
      width,
      height,
      height / 2
    );

    ctx.fillStyle =
      "rgba(15,23,42,0.9)";

    ctx.fill();

    fillWidth = Math.max(
      0,
      width *
      clamp(
        ratio,
        0,
        1
      )
    );

    if (fillWidth > 0) {
      roundedRectPath(
        x - width / 2,
        y - height / 2,
        fillWidth,
        height,
        height / 2
      );

      ctx.fillStyle =
        color;

      ctx.fill();
    }
  }

  function drawProjectiles() {
    State.get().projectiles.forEach(
      function (projectile) {
        var x =
          projectile.x *
          tileSize;

        var y =
          projectile.y *
          tileSize;

        var previousX =
          projectile.prevX *
          tileSize;

        var previousY =
          projectile.prevY *
          tileSize;

        var radius =
          Math.max(
            2.5,
            projectile.radius *
            tileSize
          );

        ctx.save();

        ctx.strokeStyle =
          hexToRgba(
            projectile.color,
            0.45
          );

        ctx.lineWidth =
          Math.max(
            1.5,
            radius * 0.7
          );

        ctx.beginPath();

        ctx.moveTo(
          previousX,
          previousY
        );

        ctx.lineTo(
          x,
          y
        );

        ctx.stroke();

        ctx.shadowColor =
          projectile.color;

        ctx.shadowBlur =
          10;

        ctx.fillStyle =
          projectile.color;

        ctx.beginPath();

        ctx.arc(
          x,
          y,
          radius,
          0,
          Math.PI * 2
        );

        ctx.fill();
        ctx.restore();
      }
    );
  }

  function drawEffects() {
    State.get().effects.forEach(
      function (effect) {
        var progress =
          clamp(
            effect.life /
            effect.maxLife,
            0,
            1
          );

        ctx.save();

        if (effect.type === "lightning") {
          drawLightningEffect(
            effect,
            progress
          );
        } else if (
          effect.type === "explosion" ||
          effect.type === "poisonCloud" ||
          effect.type === "heroSkill"
        ) {
          ctx.globalAlpha =
            progress;

          ctx.beginPath();

          ctx.arc(
            effect.x * tileSize,
            effect.y * tileSize,

            effect.radius *
            tileSize *
            (
              1.2 -
              progress * 0.2
            ),

            0,
            Math.PI * 2
          );

          ctx.fillStyle =
            hexToRgba(
              effect.color,

              effect.type === "heroSkill"
                ? 0.22
                : 0.28
            );

          ctx.fill();

          ctx.strokeStyle =
            effect.color;

          ctx.lineWidth =
            effect.type === "heroSkill"
              ? 4
              : 2;

          ctx.stroke();
        } else if (
          effect.type === "upgrade" ||
          effect.type === "heroLevel" ||
          effect.type === "iceBurst"
        ) {
          ctx.globalAlpha =
            progress;

          ctx.strokeStyle =
            effect.color;

          ctx.lineWidth =
            3;

          ctx.beginPath();

          ctx.arc(
            effect.x * tileSize,
            effect.y * tileSize,

            tileSize *
            (
              0.18 +
              (
                1 -
                progress
              ) *
              0.55
            ),

            0,
            Math.PI * 2
          );

          ctx.stroke();
        } else if (
          effect.type === "bossDeath" ||
          effect.type === "death"
        ) {
          ctx.globalAlpha =
            progress * 0.8;

          ctx.fillStyle =
            hexToRgba(
              effect.color,
              0.32
            );

          ctx.beginPath();

          ctx.arc(
            effect.x * tileSize,
            effect.y * tileSize,

            tileSize *
            (
              0.18 +
              (
                1 -
                progress
              ) *
              (
                effect.type === "bossDeath"
                  ? 0.9
                  : 0.45
              )
            ),

            0,
            Math.PI * 2
          );

          ctx.fill();
        } else {
          ctx.globalAlpha =
            progress;

          ctx.fillStyle =
            effect.color;

          ctx.beginPath();

          ctx.arc(
            effect.x * tileSize,
            effect.y * tileSize,
            tileSize * 0.17,
            0,
            Math.PI * 2
          );

          ctx.fill();
        }

        ctx.restore();
      }
    );
  }

  function drawLightningEffect(
    effect,
    progress
  ) {
    ctx.globalAlpha =
      progress;

    ctx.strokeStyle =
      effect.color;

    ctx.lineWidth =
      3;

    ctx.shadowColor =
      effect.color;

    ctx.shadowBlur =
      12;

    ctx.beginPath();

    effect.points.forEach(
      function (point, index) {
        var x =
          point.x *
          tileSize +
          (
            Math.random() -
            0.5
          ) *
          tileSize *
          0.08;

        var y =
          point.y *
          tileSize +
          (
            Math.random() -
            0.5
          ) *
          tileSize *
          0.08;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    );

    ctx.stroke();
  }

  function drawFloaters() {
    State.get().floaters.forEach(
      function (floater) {
        var progress =
          clamp(
            floater.life /
            floater.maxLife,
            0,
            1
          );

        ctx.save();

        ctx.globalAlpha =
          progress;

        ctx.fillStyle =
          floater.color;

        ctx.font =
          "800 " +
          Math.max(
            10,
            tileSize * 0.21
          ) +
          "px system-ui";

        ctx.textAlign =
          "center";

        ctx.textBaseline =
          "middle";

        ctx.shadowColor =
          "rgba(0,0,0,0.75)";

        ctx.shadowBlur =
          4;

        ctx.fillText(
          floater.text,
          floater.x * tileSize,
          floater.y * tileSize
        );

        ctx.restore();
      }
    );
  }

  function drawOverlayText() {
    var current =
      State.get();

    var alpha;
    var title;

    if (!current.started) {
      return;
    }

    if (current.bossWarningTimer > 0) {
      alpha =
        0.32 +
        Math.sin(
          performance.now() /
          90
        ) *
        0.1;

      ctx.fillStyle =
        "rgba(127,29,29," +
        alpha +
        ")";

      ctx.fillRect(
        0,
        0,
        viewportWidth,
        viewportHeight
      );

      ctx.fillStyle =
        "#fee2e2";

      ctx.textAlign =
        "center";

      ctx.textBaseline =
        "middle";

      ctx.font =
        "900 " +
        Math.max(
          24,
          tileSize * 0.55
        ) +
        "px system-ui";

      ctx.fillText(
        "WARNING",
        viewportWidth / 2,
        viewportHeight / 2 - 12
      );

      ctx.fillStyle =
        "#fecaca";

      ctx.font =
        "800 " +
        Math.max(
          12,
          tileSize * 0.24
        ) +
        "px system-ui";

      ctx.fillText(
        "Boss Wave Incoming",
        viewportWidth / 2,
        viewportHeight / 2 + 22
      );

      return;
    }

    if (
      !current.paused &&
      current.status === "playing"
    ) {
      return;
    }

    ctx.fillStyle =
      "rgba(2,6,23,0.56)";

    ctx.fillRect(
      0,
      0,
      viewportWidth,
      viewportHeight
    );

    ctx.fillStyle =
      "#fff";

    ctx.textAlign =
      "center";

    ctx.textBaseline =
      "middle";

    ctx.font =
      "900 " +
      Math.max(
        24,
        tileSize * 0.5
      ) +
      "px system-ui";

    title =
      current.status === "gameOver"
        ? "GAME OVER"
        : current.status === "clear"
          ? "CLEAR"
          : "PAUSED";

    ctx.fillText(
      title,
      viewportWidth / 2,
      viewportHeight / 2
    );
  }

  function roundedRectPath(
    x,
    y,
    width,
    height,
    radius
  ) {
    var r =
      Math.min(
        radius,
        width / 2,
        height / 2
      );

    ctx.beginPath();

    ctx.moveTo(
      x + r,
      y
    );

    ctx.lineTo(
      x + width - r,
      y
    );

    ctx.quadraticCurveTo(
      x + width,
      y,
      x + width,
      y + r
    );

    ctx.lineTo(
      x + width,
      y + height - r
    );

    ctx.quadraticCurveTo(
      x + width,
      y + height,
      x + width - r,
      y + height
    );

    ctx.lineTo(
      x + r,
      y + height
    );

    ctx.quadraticCurveTo(
      x,
      y + height,
      x,
      y + height - r
    );

    ctx.lineTo(
      x,
      y + r
    );

    ctx.quadraticCurveTo(
      x,
      y,
      x + r,
      y
    );

    ctx.closePath();
  }

  function crystalPath(
    x,
    y,
    width,
    height
  ) {
    ctx.beginPath();

    ctx.moveTo(
      x,
      y - height * 0.55
    );

    ctx.lineTo(
      x + width * 0.48,
      y - height * 0.05
    );

    ctx.lineTo(
      x + width * 0.28,
      y + height * 0.5
    );

    ctx.lineTo(
      x - width * 0.28,
      y + height * 0.5
    );

    ctx.lineTo(
      x - width * 0.48,
      y - height * 0.05
    );

    ctx.closePath();
  }

  function shieldPath(
    x,
    y,
    radius
  ) {
    ctx.beginPath();

    ctx.moveTo(
      x,
      y - radius
    );

    ctx.quadraticCurveTo(
      x + radius * 0.8,
      y - radius * 0.62,
      x + radius * 0.68,
      y + radius * 0.25
    );

    ctx.quadraticCurveTo(
      x + radius * 0.5,
      y + radius * 0.82,
      x,
      y + radius
    );

    ctx.quadraticCurveTo(
      x - radius * 0.5,
      y + radius * 0.82,
      x - radius * 0.68,
      y + radius * 0.25
    );

    ctx.quadraticCurveTo(
      x - radius * 0.8,
      y - radius * 0.62,
      x,
      y - radius
    );

    ctx.closePath();
  }

  function drawEye(
    x,
    y,
    radius,
    color
  ) {
    ctx.fillStyle =
      color ||
      "#111827";

    ctx.beginPath();

    ctx.arc(
      x,
      y,
      radius,
      0,
      Math.PI * 2
    );

    ctx.fill();
  }

  function drawWing(
    x,
    y,
    direction,
    radius,
    color
  ) {
    ctx.fillStyle =
      color;

    ctx.beginPath();

    ctx.moveTo(
      x,
      y
    );

    ctx.lineTo(
      x +
      direction *
      radius *
      1.25,

      y -
      radius *
      0.62
    );

    ctx.lineTo(
      x +
      direction *
      radius *
      0.98,

      y +
      radius *
      0.45
    );

    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function drawEar(
    x,
    y,
    direction,
    radius
  ) {
    ctx.beginPath();

    ctx.moveTo(
      x,
      y
    );

    ctx.lineTo(
      x +
      direction *
      radius *
      0.62,

      y -
      radius *
      0.38
    );

    ctx.lineTo(
      x +
      direction *
      radius *
      0.28,

      y +
      radius *
      0.38
    );

    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function drawBlock(
    x,
    y,
    width,
    height,
    color
  ) {
    ctx.fillStyle =
      color;

    roundedRectPath(
      x - width / 2,
      y - height / 2,
      width,
      height,
      5
    );

    ctx.fill();
    ctx.stroke();
  }

  function hexToRgba(hex, alpha) {
    var value =
      String(
        hex || ""
      ).replace(
        "#",
        ""
      );

    var red;
    var green;
    var blue;

    if (value.length !== 6) {
      return (
        "rgba(255,255,255," +
        alpha +
        ")"
      );
    }

    red =
      parseInt(
        value.slice(0, 2),
        16
      );

    green =
      parseInt(
        value.slice(2, 4),
        16
      );

    blue =
      parseInt(
        value.slice(4, 6),
        16
      );

    return (
      "rgba(" +
      red +
      "," +
      green +
      "," +
      blue +
      "," +
      alpha +
      ")"
    );
  }

  function clamp(value, min, max) {
    return Math.max(
      min,
      Math.min(
        max,
        value
      )
    );
  }

  window.Abyss.Render = {
    init: init,
    resize: resize,
    render: render,
    screenToCell: screenToCell,
    getMetrics: getMetrics
  };
}());
