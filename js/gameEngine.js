/**
 * gameEngine.js
 * "Body Dodge" Game Logic
 *
 * Rules:
 * - 3 Lanes (Left, Center, Right)
 * - Obstacles fall from top
 * - Player dodges obstacles to survive
 */

class GameEngine {
  constructor(soundManager) {
    this.soundManager = soundManager;
    this.score = 0;
    this.level = 1;
    this.isPlaying = false;
    this.isGameOver = false;

    // Player State
    // 0: Left, 1: Center, 2: Right
    this.playerLane = 1;

    // Game Objects
    this.obstacles = [];
    this.particles = []; // For explosion effects (optional)

    // Configuration
    this.laneCount = 3;
    this.playTime = 0; // Frames played
    this.spawnTimer = 0;
    this.spawnInterval = 60; // Frames between spawns (approx 1 sec at 60fps)
    this.baseSpeed = 5; // Increased initial speed
    this.hp = 3;

    // Callbacks
    this.onScoreChange = null;
    this.onGameEnd = null;
    this.onHpChange = null; // New callback for HP updates

    // Assets
    this.bombImage = new Image();
    this.bombImage.src = "./assets/bomb.png";
  }

  /**
   * Start Game
   */
  start() {
    this.isPlaying = true;
    this.isGameOver = false;
    this.score = 0;
    this.level = 1;
    this.hp = 3;
    this.obstacles = [];
    this.playerLane = 1;
    this.spawnTimer = 0;
    this.playTime = 0;
    this.baseSpeed = 5; // Increased initial speed

    if (this.onScoreChange) this.onScoreChange(this.score, this.level);
    if (this.onHpChange) this.onHpChange(this.hp);

    console.log("Game Started: Body Dodge");
  }

  /**
   * Stop/Game Over
   */
  gameOver() {
    this.isPlaying = false;
    this.isGameOver = true;
    console.log("Game Over!", this.score);
    if (this.soundManager) this.soundManager.playGameOver();

    if (this.onGameEnd) {
      this.onGameEnd(this.score, this.level);
    }
  }

  /**
   * Update Game State (called every frame)
   */
  update() {
    if (!this.isPlaying || this.isGameOver) return;

    // 1. Update Play Time and Level
    this.playTime++;

    // Level Logic: Time based (Every 20s = +1 Level)
    // 1200 frames = 20 seconds (at 60fps)
    const calculatedLevel = 1 + Math.floor(this.playTime / 1200);

    // Only update if calculated level assumes a higher level than current
    // This allows manual level-ups (items) to persist until time catches up
    if (calculatedLevel > this.level) {
      // Natural time-based level up
      let newLevel = calculatedLevel;
      if (newLevel !== this.level) {
        this.level = newLevel;
        if (this.soundManager) this.soundManager.playLevelUp();
        if (this.onScoreChange) this.onScoreChange(this.score, this.level);
      }
    }

    // 2. Spawn Obstacles
    this.spawnTimer++;
    // Decrease interval: 60 - ((level-1)*4). Cap at 20 frames.
    const currentInterval = Math.max(20, 60 - ((this.level - 1) * 4));

    if (this.spawnTimer >= currentInterval) {
      this.spawnObstacle();
      this.spawnTimer = 0;
    }

    // 3. Update Obstacles
    // Speed Multiplier: 1.0 + ((level-1) * 0.15)
    // Lv1: 1.0, Lv2: 1.15, Lv3: 1.3 ... Lv10: 2.35
    let speedMultiplier = 1.0 + ((this.level - 1) * 0.15);

    const speed = this.baseSpeed * speedMultiplier;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      let obs = this.obstacles[i];
      // Safety check: if obstacles list was cleared (e.g. by 'clear' item), stop loop
      if (!obs) break;

      obs.y += speed;

      // Check Collision
      if (this.checkCollision(obs)) {
        this.handleCollision(obs);
        // If handled, verify existence before splice to be safe, though splice on empty is fine.
        // If cleared, obstacles is [], so splice does nothing.
        if (this.obstacles.length > 0) {
          this.obstacles.splice(i, 1);
        }
        continue;
      }

      // Remove if off screen
      if (obs.y > 1000) {
        this.obstacles.splice(i, 1);
      }
    }
  }

  /**
   * Spawn a new obstacle or coin
   */
  spawnObstacle() {
    // Random Lane: 0, 1, 2
    const lane = Math.floor(Math.random() * this.laneCount);

    // Item Type Probability (Infinite Level Update)
    // 0 ~ 0.02 : Level Up Item (2%) -- NEW
    // 0.02 ~ 0.06 : Clear Item (4%)
    // 0.06 ~ 0.14 : Heart Item (8%)
    // 0.14 ~ 0.40 : Coin (26%)
    // 0.40 ~ 1.00 : Obstacle (60%)

    const rand = Math.random();
    let type = 'obstacle';

    if (rand < 0.02) {
      type = 'level_up';
    } else if (rand < 0.06) {
      type = 'clear';
    } else if (rand < 0.14) {
      type = 'heart';
    } else if (rand < 0.40) {
      type = 'coin';
    }

    let width = 100; // Default Bomb
    let height = 100;

    if (type === 'coin') {
      width = 50; height = 50;
    } else if (type === 'heart') {
      width = 50; height = 50;
    } else if (type === 'clear') {
      width = 60; height = 60;
    } else if (type === 'level_up') {
      width = 50; height = 50;
    }

    this.obstacles.push({
      lane: lane,
      y: -100, // Start above screen
      type: type,
      width: width,
      height: height
    });
  }

  /**
   * Check collision between player and obstacle
   */
  checkCollision(obs) {
    // Simple lane check + Y-axis check
    // Player is effectively at the bottom, e.g., Y=80% to 90%
    // Let's assume passed Canvas Height is 100% for logic, but we need pixel values for drawing.
    // Ideally update() shouldn't depend on pixels, but let's use a standard 0-1 or similar.
    // Here we will pretend the game area is 600px high for logic roughly.

    // Player Y zone: roughly 500-550
    const playerY = 500;
    const playerHeight = 60;

    if (obs.lane === this.playerLane) {
      if (obs.y + obs.height > playerY && obs.y < playerY + playerHeight) {
        return true;
      }
    }
    return false;
  }

  /**
   * Handle Collision event
   */
  handleCollision(obs) {
    if (obs.type === 'coin') {
      this.score += 100;
      if (this.soundManager) this.soundManager.playCoin();
      if (this.onScoreChange) this.onScoreChange(this.score, this.level);
    } else if (obs.type === 'heart') {
      this.hp++;
      if (this.hp > 5) this.hp = 5; // Max HP cap (optional)
      if (this.soundManager) this.soundManager.playHeal();
      if (this.onHpChange) this.onHpChange(this.hp);
    } else if (obs.type === 'clear') {
      // Remove all obstacles except the player? No, remove all current obstacles in the list
      this.obstacles = [];
      if (this.soundManager) this.soundManager.playClear();
      // Maybe give some score too?
      this.score += 50;
      if (this.onScoreChange) this.onScoreChange(this.score, this.level);
    } else if (obs.type === 'level_up') {
      // Level Up Item: Instant Level Up!
      this.level++;
      this.score += 500; // Bonus score

      // Also advance playTime so time-based logic doesn't revert level
      // Add 1800 frames (30s) worth of time to 'lock in' the level up if we want time to catch up?
      // Actually, my updated logic uses: if (calculatedLevel > this.level) -> Natural
      // If I manually increase this.level, calculatedLevel will be lower.
      // So time won't increase level again until it catches up. That is perfect behavior!
      // Example: At 10s (Lv1), I get item -> Lv2.
      // Time continues... 20s... 30s... (Calculated Lv2) -> No change (Lv2 == Lv2)
      // 40s... 60s (Calculated Lv3) -> Lv3.
      // So the item gives me a "head start" on difficulty (and score multiplier potential if I had one).
      // Wait, user might want to *skip* a level essentially?
      // If I am at Lv1 (Time 10s), and I get item, I become Lv2.
      // I then have 30s-10s = 20s of Lv2 play before I would have naturally hit Lv2.
      // But at 30s, calculated is Lv2. My level is Lv2. No change.
      // At 60s, calculated is Lv3. I become Lv3.
      // So effectively, the item makes me play Lv2 SOONER. It doesn't permanently OFFSET the level count relative to time.
      // If the user wants "Infinite Levels" and "Item to Raise Level", maybe they want the difficulty to go up FASTER?
      // Yes, raising the level makes it harder. So this implementation is correct.

      if (this.soundManager) this.soundManager.playLevelUp();
      if (this.onScoreChange) this.onScoreChange(this.score, this.level);
    } else if (obs.type === 'obstacle') {
      this.hp--;
      if (this.soundManager) this.soundManager.playHit();
      if (this.onHpChange) this.onHpChange(this.hp);

      if (this.hp <= 0) {
        this.gameOver();
      }
    }
  }

  /**
   * Draw Game Elements on Canvas
   * @param {CanvasRenderingContext2D} ctx 
   * @param {number} width 
   * @param {number} height 
   */
  draw(ctx, width, height) {
    // Clear handled by main loop usually, but good practice if standalone
    // ctx.clearRect(0, 0, width, height);

    // 1. Draw Lanes (Visual Guide)
    const laneWidth = width / this.laneCount;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 2;
    for (let i = 1; i < this.laneCount; i++) {
      ctx.beginPath();
      ctx.moveTo(i * laneWidth, 0);
      ctx.lineTo(i * laneWidth, height);
      ctx.stroke();
    }

    // 2. Draw Player
    const playerX = (this.playerLane * laneWidth) + (laneWidth / 2);
    // Logic Y was 500/600 approx 83%. Let's scale to height.
    const playerY = height * 0.85;
    const playerSize = Math.min(laneWidth * 0.6, 60);

    ctx.fillStyle = this.hp > 1 ? "#00ff00" : "#ff0000"; // Green ok, Red danger
    if (this.isGameOver) ctx.fillStyle = "#555";

    // Draw centered square
    ctx.fillRect(playerX - playerSize / 2, playerY - playerSize / 2, playerSize, playerSize);

    // 3. Draw Obstacles
    // Scale Y logic (based on 600 reference) to actual height
    // or just use normalized Y in future. For now, let's map logic speed to pixels roughly.
    // If logic assumes 600px, scale factor = height / 600.
    const scaleY = height / 600;

    this.obstacles.forEach(obs => {
      const obsX = (obs.lane * laneWidth) + (laneWidth / 2);
      const obsY = obs.y * scaleY;
      const obsSize = obs.width * scaleY; // square items

      if (obs.type === 'coin') {
        ctx.fillStyle = "gold";
        ctx.beginPath();
        ctx.arc(obsX, obsY, obsSize / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "white";
        ctx.font = `${obsSize / 2}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("$", obsX, obsY);
      } else if (obs.type === 'heart') {
        ctx.fillStyle = "pink";
        ctx.beginPath();
        ctx.arc(obsX, obsY, obsSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "red";
        ctx.font = `${obsSize / 2}px Arial`;
        ctx.textAlign = "center";

        ctx.textBaseline = "middle";
        ctx.fillText("♥", obsX, obsY);

      } else if (obs.type === 'clear') {
        ctx.fillStyle = "cyan";
        ctx.beginPath();
        ctx.arc(obsX, obsY, obsSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "blue";
        ctx.font = `${obsSize / 3}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("POW", obsX, obsY);

      } else if (obs.type === 'level_up') {
        ctx.fillStyle = "purple";
        ctx.beginPath();
        ctx.arc(obsX, obsY, obsSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = `${obsSize / 2.5}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("UP", obsX, obsY);

      } else {
        // Draw Bomb Image
        if (this.bombImage && this.bombImage.complete) {
          ctx.drawImage(this.bombImage, obsX - obsSize / 2, obsY - obsSize / 2, obsSize, obsSize);
        } else {
          // Fallback if image not loaded
          ctx.fillStyle = "brown";
          ctx.beginPath();
          ctx.arc(obsX, obsY, obsSize / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "white";
          ctx.fillText("!", obsX, obsY);
        }
      }
    });

    // 4. Draw HUD (if not in HTML)
    // (Optional, can depend on HTML)
  }

  /**
   * Set Player Lane directly (from PoseEngine)
   * @param {number} laneIndex 0, 1, 2
   */
  setPlayerLane(laneIndex) {
    if (laneIndex >= 0 && laneIndex < this.laneCount) {
      this.playerLane = laneIndex;
    }
  }

  /**
   * Process Pose Prediction to Game Action
   * @param {string} className 
   */
  onPoseDetected(className) {
    if (!this.isPlaying) return;

    // Supports both English and Korean labels
    // English: Left, Right, Center
    // Korean: 왼쪽, 오른쪽, 정면
    if (className === "Left" || className === "left" || className === "왼쪽") {
      this.setPlayerLane(0);
    } else if (className === "Right" || className === "right" || className === "오른쪽") {
      this.setPlayerLane(2);
    } else if (className === "Center" || className === "center" || className === "정면") {
      this.setPlayerLane(1);
    }
  }

  // --- Callback Setters ---
  setScoreChangeCallback(cb) { this.onScoreChange = cb; }
  setGameEndCallback(cb) { this.onGameEnd = cb; }
  setHpChangeCallback(cb) { this.onHpChange = cb; }

  getGameState() {
    return {
      isActive: this.isPlaying,
      score: this.score,
      level: this.level,
      hp: this.hp
    };
  }
}

// Export
window.GameEngine = GameEngine;
