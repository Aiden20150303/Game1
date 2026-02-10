/**
 * main.js
 * 포즈 인식과 게임 로직을 초기화하고 서로 연결하는 진입점
 *
 * PoseEngine, GameEngine, Stabilizer를 조합하여 애플리케이션을 구동
 */

let poseEngine;
let gameEngine;
let stabilizer;
let ctx;
let labelContainer;
let soundManager;
let currentGameId = 1; // Default to 1
let animationFrameId; // For Game 2 loop

// Game Selection Logic
window.selectGame = function (id) {
  currentGameId = id;
  document.getElementById("game-selector").style.display = "none";
  document.getElementById("game-container").style.display = "block";

  // Reset UI text
  const title = id === 1 ? "Game 1: 장애물 피하기" : "Game 2: 슈퍼마리오";
  document.querySelector("h1").innerText = title;
}

window.backToMenu = function () {
  stop(); // Ensure everything stops
  document.getElementById("game-selector").style.display = "flex";
  document.getElementById("game-container").style.display = "none";
  document.querySelector("h1").innerText = "Teachable Machine Pose Model";
}

/**
 * 애플리케이션 초기화
 */
async function init() {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");

  startBtn.disabled = true;

  // Audio Context Unlock (Browser Policy)
  try {
    if (!soundManager) {
      soundManager = new SoundManager();
    }
    soundManager.init();
  } catch (e) {
    console.warn("Audio init failed:", e);
  }

  try {
    // 5. 캔버스 설정 (Common)
    const canvas = document.getElementById("canvas");
    canvas.width = 400; // 게임 영역 크기
    canvas.height = 400;
    ctx = canvas.getContext("2d");

    if (currentGameId === 1) {
      // --- GAME 1: Pose Controlled ---

      // 1. PoseEngine 초기화
      poseEngine = new PoseEngine("./my_model/");
      const { maxPredictions, webcam } = await poseEngine.init({
        size: 400, // 게임 화면을 위해 크기 증가 권장 (원본 비율 유지)
        flip: true
      });

      // 2. Stabilizer 초기화
      stabilizer = new PredictionStabilizer({
        threshold: 0.8, // 민감도 조절
        smoothingFrames: 3
      });

      // 4. GameEngine 초기화
      gameEngine = new GameEngine(soundManager);

      // 5. Label Container 설정
      labelContainer = document.getElementById("label-container");
      labelContainer.innerHTML = ""; // 초기화
      for (let i = 0; i < maxPredictions; i++) {
        labelContainer.appendChild(document.createElement("div"));
      }

      // 6. PoseEngine 콜백 설정
      poseEngine.setPredictionCallback(handlePrediction);
      // Draw callback에서 게임 렌더링도 같이 처리
      poseEngine.setDrawCallback(gameLoop);

      // 7. PoseEngine 시작
      poseEngine.start();

    } else {
      // --- GAME 2: Keyboard Controlled (Optimized) ---
      console.log("Initializing Game 2 (No PoseNet)...");

      // 4. GameEngine 초기화
      gameEngine = new Game2Engine(soundManager);

      // Clear Label Container
      labelContainer = document.getElementById("label-container");
      if (labelContainer) labelContainer.innerHTML = "Keyboard Mode";

      // Start dedicated loop
      startGame2Loop();
    }

    stopBtn.disabled = false;

    // UI 초기화 // NEW
    setupGameUI();

  } catch (error) {
    console.error("초기화 중 오류 발생:", error);
    alert("초기화에 실패했습니다. 콘솔을 확인하세요.");
    startBtn.disabled = false;
  }
}

function setupGameUI() {
  // 게임 시작 버튼에 이벤트 연결 (이미 HTML에 있을 수 있음)
  // 여기서는 GameEngine 콜백만 연결

  gameEngine.setScoreChangeCallback((score, level) => {
    // UI 엘리먼트가 존재한다고 가정 (없으면 콘솔)
    const scoreEl = document.getElementById("scoreDisplay") || console.log;
    if (scoreEl.innerText !== undefined) scoreEl.innerText = `Score: ${score} (Lv.${level})`;
  });

  gameEngine.setHpChangeCallback((hp) => {
    const hpEl = document.getElementById("hpDisplay");
    if (hpEl) {
      if (typeof hp === 'number') {
        hpEl.innerText = `HP: ${"❤️".repeat(Math.max(0, hp))}`;
      } else {
        hpEl.innerText = "";
      }
    }
  });

  gameEngine.setGameEndCallback((score, level) => {
    alert(`Game Over! Score: ${score}`);
    document.getElementById("startBtn").disabled = false;
    document.getElementById("stopBtn").disabled = true;
  });
}

/**
 * 애플리케이션 중지
 */
function stop() {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");

  if (poseEngine) {
    poseEngine.stop();
  }

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  if (gameEngine) {
    gameEngine.gameOver(); // stop 대신 gameOver로 명확히
  }

  if (stabilizer) {
    stabilizer.reset();
  }

  startBtn.disabled = false;
  stopBtn.disabled = true;
}

/**
 * 예측 결과 처리 콜백
 * @param {Array} predictions - TM 모델의 예측 결과
 * @param {Object} pose - PoseNet 포즈 데이터
 */
function handlePrediction(predictions, pose) {
  // 1. Stabilizer로 예측 안정화
  const stabilized = stabilizer.stabilize(predictions);

  // 2. Label Container 업데이트
  for (let i = 0; i < predictions.length; i++) {
    const classPrediction =
      predictions[i].className + ": " + predictions[i].probability.toFixed(2);
    labelContainer.childNodes[i].innerHTML = classPrediction;
  }

  // 3. 최고 확률 예측 표시
  const maxPredictionDiv = document.getElementById("max-prediction");
  maxPredictionDiv.innerHTML = stabilized.className || "감지 중...";

  // 4. GameEngine에 포즈 전달
  if (gameEngine && stabilized.className) {
    gameEngine.onPoseDetected(stabilized.className);
  }
}

/**
 * 게임 루프 (PoseEngine의 Draw 콜백에서 호출됨)
 * @param {Object} pose - PoseNet 포즈 데이터
 */
function gameLoop(pose) {
  // 1. 웹캠 배경 그리기 (선택사항, 게임 몰입감을 위해 투명도를 주거나 끌 수 있음)
  if (poseEngine.webcam && poseEngine.webcam.canvas) {
    ctx.globalAlpha = 0.3; // 웹캠 흐릿하게
    ctx.drawImage(poseEngine.webcam.canvas, 0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.globalAlpha = 1.0;
  }

  // 2. 게임 상태 업데이트
  if (gameEngine) {
    gameEngine.update();
    gameEngine.draw(ctx, ctx.canvas.width, ctx.canvas.height);
  }

  // 3. 포즈 키포인트 (디버깅용, 게임 중엔 방해되면 주석 처리)
  /*
  if (pose) {
      const minPartConfidence = 0.5;
      tmPose.drawKeypoints(pose.keypoints, minPartConfidence, ctx);
  }
  */
}

// 게임 모드 시작 함수 (버튼 클릭 시 호출)
function startGameMode() {
  if (!gameEngine) {
    console.warn("GameEngine이 초기화되지 않았습니다.");
    return;
  }

  // Ensure AudioContext is ready (user gesture)
  if (soundManager) {
    soundManager.init();
  }

  // 설정 전달
  gameEngine.start({
    // timeLimit: 0 // 무제한
  });

  document.getElementById("startBtn").disabled = true; // 중복 시작 방지
}

// 전역 함수 노출 (HTML 버튼에서 호출용)
window.startGameMode = startGameMode;

/**
 * Game 2 Dedicated Loop (No PoseNet)
 */
function startGame2Loop() {
  function loop() {
    if (gameEngine) {
      gameEngine.update();
      gameEngine.draw(ctx, ctx.canvas.width, ctx.canvas.height);
    }
    animationFrameId = requestAnimationFrame(loop);
  }
  loop();
}

