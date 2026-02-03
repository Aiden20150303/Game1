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
  constructor() {
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
    this.spawnTimer = 0;
    this.spawnInterval = 60; // Frames between spawns (approx 1 sec at 60fps)
    this.baseSpeed = 3;
    this.hp = 3;

    // Callbacks
    this.onScoreChange = null;
    this.onGameEnd = null;
    this.onHpChange = null; // New callback for HP updates
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
    this.baseSpeed = 3;

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

    if (this.onGameEnd) {
      this.onGameEnd(this.score, this.level);
    }
  }

  /**
   * Update Game State (called every frame)
   */
  update() {
    if (!this.isPlaying || this.isGameOver) return;

    // 1. Spawn Obstacles
    this.spawnTimer++;
    // Decrease interval as level increases to make it harder
    const currentInterval = Math.max(20, this.spawnInterval - (this.level * 2));
    
    if (this.spawnTimer >= currentInterval) {
      this.spawnObstacle();
      this.spawnTimer = 0;
    }

    // 2. Update Obstacles
    const speed = this.baseSpeed + (this.level * 0.5);
    
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      let obs = this.obstacles[i];
      obs.y += speed;

      // Check Collision
      if (this.checkCollision(obs)) {
        this.handleCollision(obs);
        this.obstacles.splice(i, 1);
        continue;
      }

      // Remove if off screen
      if (obs.y > 1000) { // Assuming height is handled elsewhere or large enough
         // Missed coin? or just passed obstacle
         this.obstacles.splice(i, 1);
      }
    }

    // 3. Level Up Condition (Time based or Score based)
    // Simple Score based: Every 500 points
    const newLevel = Math.floor(this.score / 500) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
      // Bonus HP?
      if (this.onScoreChange) this.onScoreChange(this.score, this.level);
    }
  }

  /**
   * Spawn a new obstacle or coin
   */
  spawnObstacle() {
    // Random Lane: 0, 1, 2
    const lane = Math.floor(Math.random() * this.laneCount);
    
    // Type: 80% Obstacle (Bomb), 20% Coin
    const isCoin = Math.random() > 0.8;
    
    this.obstacles.push({
      lane: lane,
      y: -100, // Start above screen
      type: isCoin ? 'coin' : 'obstacle',
      width: 50, // Relative size
      height: 50
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
      if (this.onScoreChange) this.onScoreChange(this.score, this.level);
    } else if (obs.type === 'obstacle') {
      this.hp--;
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
    ctx.fillRect(playerX - playerSize/2, playerY - playerSize/2, playerSize, playerSize);
    
    // 3. Draw Obstacles
    // Scale Y logic (based on 600 reference) to actual height
    // or just use normalized Y in future. For now, let's map logic speed to pixels roughly.
    // If logic assumes 600px, scale factor = height / 600.
    const scaleY = height / 600;

    this.obstacles.forEach(obs => {
      const obsX = (obs.lane * laneWidth) + (laneWidth / 2);
      const obsY = obs.y * scaleY;
      const obsSize = obs.width * scaleY; // square items

      ctx.fillStyle = obs.type === 'coin' ? "gold" : "brown"; // Coin or Poop/Rock
      
      // Simple Circle for items
      ctx.beginPath();
      ctx.arc(obsX, obsY, obsSize/2, 0, Math.PI * 2);
      ctx.fill();
      
      // Text icon overlay (optional)
      ctx.fillStyle = "white";
      ctx.font = `${obsSize/2}px Arial`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(obs.type === 'coin' ? "$" : "!", obsX, obsY);
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

     // Mapping logic could be here or outside
     // Assuming classes are "Left", "Right", "Center"
     if (className === "Left" || className === "left") {
         this.setPlayerLane(0);
     } else if (className === "Right" || className === "right") {
         this.setPlayerLane(2);
     } else if (className === "Center" || className === "center") {
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
