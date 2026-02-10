/**
 * game2Engine.js
 * Game 2: Avoid Enemies & Collect Items (Keyboard)
 */

class Game2Engine {
    constructor(soundManager) {
        this.soundManager = soundManager;
        this.score = 0;
        this.isPlaying = false;

        // Game State
        this.player = { x: 200, y: 200, size: 30, speed: 4, color: '#00ffff' };
        this.enemies = [];
        this.items = [];
        this.fireballs = [];
        this.keys = {}; // New fireballs
        this.keys = {};

        // Config
        this.spawnTimer = 0;
        this.enemySpawnRate = 60; // Frames
        this.itemSpawnRate = 100;

        // Bind methods
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);

        // Callbacks
        this.onScoreChange = null;
        this.onGameEnd = null;
        this.onHpChange = null;

        // Assets
        this.playerImage = new Image();
        this.playerImage.src = "./assets/player_game2.png";

        this.enemyImage = new Image();
        this.enemyImage.src = "./assets/enemy_ground.png";

        this.starImage = new Image();
        this.starImage.src = "./assets/star.png";

        this.enemyWallImage = new Image();
        this.enemyWallImage.src = "./assets/enemy_wall.png";

        this.fireFlowerImage = new Image();
        this.fireFlowerImage.src = "./assets/item_fireflower.png";

        this.fireballImage = new Image();
        this.fireballImage.src = "./assets/projectile_fireball.png";

        this.mushroomImage = new Image();
        this.mushroomImage.src = "./assets/item_mushroom.png";

        this.balloonImage = new Image();
        this.balloonImage.src = "./assets/item_balloon.png";

        this.enemyBulletImage = new Image();
        this.enemyBulletImage.src = "./assets/enemy_bullet.png";
    }

    start() {
        this.isPlaying = true;
        this.score = 0;
        this.player = { x: 200, y: 200, size: 60, speed: 4, color: '#00ffff', hasFirePower: false };
        this.fireCooldown = 0; // Cooldown for shooting
        this.enemies = [];
        this.items = [];
        this.keys = {};
        this.spawnTimer = 0;
        this.invincibleTimer = 0; // 0 = normal, > 0 = invincible
        this.speedBoostTimer = 0; // Balloon effect timer

        window.addEventListener('keydown', this.handleKeyDown);
        window.addEventListener('keyup', this.handleKeyUp);

        if (this.onScoreChange) this.onScoreChange(this.score, 1);
        this.hp = 3;
        if (this.onHpChange) this.onHpChange(this.hp);

        console.log("Game 2 Started");
    }

    gameOver() {
        this.isPlaying = false;
        window.removeEventListener('keydown', this.handleKeyDown);
        window.removeEventListener('keyup', this.handleKeyUp);

        if (this.soundManager) this.soundManager.playGameOver();
        if (this.onGameEnd) this.onGameEnd(this.score, "End");
    }

    shootFireball() {
        if (!this.player.hasFirePower) return;
        if (this.fireCooldown > 0) return;

        // Spawn Fireball
        this.fireballs.push({
            x: this.player.x,
            y: this.player.y,
            vx: (Math.random() < 0.5 ? -1 : 1) * 5,
            vy: (Math.random() < 0.5 ? -1 : 1) * 5,
            size: 20,
            life: 600 // 10 seconds
        });

        if (this.soundManager) this.soundManager.playCoin(); // Reuse sound
        this.fireCooldown = 15; // 15 frames cooldown (approx 0.25s)
    }

    handleKeyDown(e) {
        this.keys[e.code] = true;
        if (e.code === 'Space') {
            this.shootFireball();
        }
    }
    handleKeyUp(e) { this.keys[e.code] = false; }

    update() {
        if (!this.isPlaying) return;

        // 0. Timers
        if (this.invincibleTimer > 0) this.invincibleTimer--;
        if (this.speedBoostTimer > 0) this.speedBoostTimer--;
        if (this.fireCooldown > 0) this.fireCooldown--;

        // 1. Player Movement
        const currentSpeed = (this.speedBoostTimer > 0) ? this.player.speed * 2 : this.player.speed;

        if (this.keys['ArrowLeft']) this.player.x -= currentSpeed;
        if (this.keys['ArrowRight']) this.player.x += currentSpeed;
        if (this.keys['ArrowUp']) this.player.y -= currentSpeed;
        if (this.keys['ArrowDown']) this.player.y += currentSpeed;

        // Constraints
        const halfSize = this.player.size / 2;
        this.player.x = Math.max(halfSize, Math.min(400 - halfSize, this.player.x));
        this.player.y = Math.max(halfSize, Math.min(400 - halfSize, this.player.y));

        // 2. Spawning
        this.spawnTimer++;
        if (this.spawnTimer % this.enemySpawnRate === 0) this.spawnEnemy();
        if (this.spawnTimer % this.itemSpawnRate === 0) this.spawnItem();

        // 3. Update Fireballs
        for (let i = this.fireballs.length - 1; i >= 0; i--) {
            let fb = this.fireballs[i];

            // Move
            fb.x += fb.vx;
            fb.y += fb.vy;

            // Bounce off walls
            if (fb.x <= 0 || fb.x >= 400) fb.vx *= -1;
            if (fb.y <= 0 || fb.y >= 400) fb.vy *= -1;

            // Lifetime (optional, e.g. 10s)
            fb.life--;
            if (fb.life <= 0) {
                this.fireballs.splice(i, 1);
                continue;
            }

            // Collision with Enemies
            let hitEnemy = false;
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                let enemy = this.enemies[j];
                if (enemy.dead) continue; // Skip dead enemies

                const dx = fb.x - enemy.x;
                const dy = fb.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < (fb.size / 2 + enemy.size / 2)) {
                    // Hit Enemy!
                    hitEnemy = true;
                    this.score += 50;
                    if (this.onScoreChange) this.onScoreChange(this.score, 1);
                    if (this.soundManager) this.soundManager.playHit(); // Explosion sound?
                    enemy.dead = true; // Mark as dead
                    break; // One fireball kills one enemy
                }
            }

            if (hitEnemy) {
                this.fireballs.splice(i, 1);
            }
        }

        // 4. Move Enemies (Chaser) & Check Wall Enemy Lifetime
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            let enemy = this.enemies[i];
            if (enemy.dead) continue; // Skip dead enemies

            if (enemy.type === 'chaser') {
                const dx = this.player.x - enemy.x;
                const dy = this.player.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist > 0) {
                    enemy.x += (dx / dist) * enemy.speed;
                    enemy.y += (dy / dist) * enemy.speed;
                }
            } else if (enemy.type === 'bullet') {
                // Bullet Bill Movement
                enemy.x += enemy.vx;
                enemy.y += enemy.vy;

                // Out of bounds check
                if (enemy.x < -100 || enemy.x > 500 || enemy.y < -100 || enemy.y > 500) {
                    this.enemies.splice(i, 1);
                    continue;
                }

                // Collision with OTHER enemies (Friendly Fire / Mutual Destruction)
                for (let k = this.enemies.length - 1; k >= 0; k--) {
                    if (i === k) continue; // Don't check self
                    let other = this.enemies[k];
                    if (other.dead) continue;

                    const dx = enemy.x - other.x;
                    const dy = enemy.y - other.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < (enemy.size / 2 + other.size / 2)) {
                        // Crash! Both explode
                        if (this.soundManager) this.soundManager.playHit();
                        enemy.dead = true;
                        other.dead = true;
                        break;
                    }
                }

                if (enemy.dead) continue;

            } else if (enemy.type === 'wall') {
                // Animation State Machine
                const ANIM_SPEED = 0.05;

                if (enemy.state === 'spawn') {
                    enemy.animProgress += ANIM_SPEED;
                    if (enemy.animProgress >= 1) {
                        enemy.animProgress = 1;
                        enemy.state = 'active';
                    }
                    // Lerp from Start to Target
                    enemy.x = enemy.startX + (enemy.targetX - enemy.startX) * enemy.animProgress;
                    enemy.y = enemy.targetY + (enemy.startY - enemy.targetY) * enemy.animProgress;

                } else if (enemy.state === 'active') {
                    enemy.lifeTime--;
                    if (enemy.lifeTime <= 0) {
                        enemy.state = 'despawn';
                        enemy.animProgress = 0;
                    }
                } else if (enemy.state === 'despawn') {
                    enemy.animProgress += ANIM_SPEED;
                    if (enemy.animProgress >= 1) {
                        enemy.dead = true; // Mark as dead
                        continue;
                    }
                    // Lerp from Target back to Start
                    enemy.x = enemy.targetX + (enemy.startX - enemy.targetX) * enemy.animProgress;
                    enemy.y = enemy.targetY + (enemy.startY - enemy.targetY) * enemy.animProgress;
                }
            }

            if (enemy.dead) continue;

            // Collision with Player
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < (this.player.size / 2 + enemy.size / 2)) {
                if (this.invincibleTimer > 0) {
                    // Invincible Mode: Kill Enemy
                    this.score += 50;
                    if (this.onScoreChange) this.onScoreChange(this.score, 1);
                    if (this.soundManager) this.soundManager.playHit();
                    enemy.dead = true;
                } else if (this.player.hasFirePower) {
                    // Lost Ability
                    this.player.hasFirePower = false;
                    this.invincibleTimer = 60; // Temporary invincibility
                    if (this.soundManager) this.soundManager.playHit(); // Damage sound
                } else {
                    // Normal Mode: Get Hit
                    this.hp--;
                    if (this.onHpChange) this.onHpChange(this.hp);
                    if (this.soundManager) this.soundManager.playHit();

                    if (this.hp <= 0) {
                        this.gameOver();
                    } else {
                        // Temporary Invincibility
                        this.invincibleTimer = 60; // 1 second
                    }
                }
            }
        }

        // 5. Check Item Collection
        for (let i = this.items.length - 1; i >= 0; i--) {
            const item = this.items[i];
            const dx = this.player.x - item.x;
            const dy = this.player.y - item.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < (this.player.size / 2 + item.size / 2)) {
                // Collected
                if (item.type === 'star') {
                    this.invincibleTimer = 600; // 10 seconds
                    this.score += 100;
                    if (this.soundManager) this.soundManager.playLevelUp();
                } else if (item.type === 'fire') {
                    // Fire Flower: Grant Ability
                    this.player.hasFirePower = true;
                    if (this.soundManager) this.soundManager.playLevelUp(); // Power up sound
                    this.score += 50;
                } else if (item.type === 'mushroom') {
                    // Mushroom: +1 HP
                    this.hp++;
                    if (this.onHpChange) this.onHpChange(this.hp);
                    if (this.soundManager) this.soundManager.playLevelUp(); // Or heal sound
                    this.score += 50;
                } else if (item.type === 'balloon') {
                    // Balloon: Speed Boost
                    this.speedBoostTimer = 600; // 10 seconds
                    if (this.soundManager) this.soundManager.playCoin(); // Or boost sound
                    this.score += 50;
                } else {
                    // Coin
                    this.score += 10;
                    if (this.soundManager) this.soundManager.playCoin();
                }

                if (this.onScoreChange) this.onScoreChange(this.score, 1);
                this.items.splice(i, 1);
            }
        }

        // Remove dead enemies
        this.enemies = this.enemies.filter(e => !e.dead);
    }

    spawnEnemy() {
        const rand = Math.random();

        if (rand < 0.2) {
            // 20% Bullet Bill (Killer)
            const edge = Math.floor(Math.random() * 4);
            let ex, ey, vx, vy, rotation;
            const size = 40; // Slightly larger
            const speed = 4; // Fast

            if (edge === 0) { // Top -> Down
                ex = Math.random() * 400;
                ey = -size;
                vx = 0;
                vy = speed;
                rotation = (90 * Math.PI / 180) + Math.PI; // Flip 180
            } else if (edge === 1) { // Bottom -> Up
                ex = Math.random() * 400;
                ey = 400 + size;
                vx = 0;
                vy = -speed;
                rotation = (-90 * Math.PI / 180) + Math.PI; // Flip 180
            } else if (edge === 2) { // Left -> Right
                ex = -size;
                ey = Math.random() * 400;
                vx = speed;
                vy = 0;
                rotation = 0 + Math.PI; // Flip 180
            } else { // Right -> Left
                ex = 400 + size;
                ey = Math.random() * 400;
                vx = -speed;
                vy = 0;
                rotation = (180 * Math.PI / 180) + Math.PI; // Flip 180
            }

            this.enemies.push({
                type: 'bullet',
                x: ex,
                y: ey,
                vx: vx,
                vy: vy,
                size: size,
                speed: speed,
                color: 'black',
                rotation: rotation
            });

        } else if (rand < 0.5) {
            // 30% Wall Enemy (0.2 to 0.5 range = 30%)
            const edge = Math.floor(Math.random() * 4); // 0: Top, 1: Bottom, 2: Left, 3: Right
            let startX, startY, targetX, targetY, rotation;
            const size = 30; // Enemy size
            const enterDepth = 20; // How far in it goes

            if (edge === 0) { // Top
                startX = Math.random() * 400;
                startY = -size; // Hidden above
                targetX = startX;
                targetY = enterDepth;
                rotation = 180 * Math.PI / 180; // Upside down
            } else if (edge === 1) { // Bottom
                startX = Math.random() * 400;
                startY = 400 + size; // Hidden below
                targetX = startX;
                targetY = 400 - enterDepth;
                rotation = 0; // Normal
            } else if (edge === 2) { // Left
                startX = -size; // Hidden left
                startY = Math.random() * 400;
                targetX = enterDepth;
                targetY = startY;
                rotation = 90 * Math.PI / 180; // Clockwise
            } else { // Right
                startX = 400 + size; // Hidden right
                startY = Math.random() * 400;
                targetX = 400 - enterDepth;
                targetY = startY;
                rotation = -90 * Math.PI / 180; // Counter-Clockwise
            }

            this.enemies.push({
                type: 'wall',
                x: startX,
                y: startY,
                startX: startX,
                startY: startY,
                targetX: targetX,
                targetY: targetY,
                size: size,
                speed: 0,
                color: 'green',
                rotation: rotation,
                lifeTime: 300, // Stay for 5s
                state: 'spawn',
                animProgress: 0
            });

        } else {
            // 50% Normal Chaser
            // Spawn at random edge
            let ex, ey;
            if (Math.random() < 0.5) {
                ex = Math.random() < 0.5 ? 0 : 400;
                ey = Math.random() * 400;
            } else {
                ex = Math.random() * 400;
                ey = Math.random() < 0.5 ? 0 : 400;
            }

            this.enemies.push({
                type: 'chaser',
                x: ex,
                y: ey,
                size: 20,
                speed: 1.5 + (Math.random() * 1.5), // Random speed
                color: 'red'
            });
        }
    }

    spawnItem() {
        this.items = []; // Only one item at a time

        const rand = Math.random();
        let type = 'coin';
        let color = 'gold';
        let size = 15;

        if (rand < 0.05) { // 5% Star (Rare)
            type = 'star';
            color = 'yellow';
            size = 20;
        } else if (rand < 0.15) { // 10% Fire Flower
            type = 'fire';
            color = 'orange';
            size = 20;
        } else if (rand < 0.25) { // 10% Mushroom
            type = 'mushroom';
            color = 'green';
            size = 20;
        } else if (rand < 0.35) { // 10% Balloon
            type = 'balloon';
            color = 'pink';
            size = 20;
        } else {
            // 65% Coin
            type = 'coin';
            color = 'gold';
            size = 15;
        }

        this.items.push({
            x: 20 + Math.random() * 360,
            y: 20 + Math.random() * 360,
            size: size,
            color: color,
            type: type
        });
    }

    draw(ctx, width, height) {
        // Background
        ctx.fillStyle = "#4caf50"; // Green background
        ctx.fillRect(0, 0, width, height);

        if (this.isPlaying) {
            // Draw Items
            this.items.forEach(item => {
                let img;
                if (item.type === 'star') img = this.starImage;
                if (item.type === 'fire') img = this.fireFlowerImage;
                if (item.type === 'mushroom') img = this.mushroomImage;
                if (item.type === 'balloon') img = this.balloonImage;

                if (img && img.complete) {
                    ctx.drawImage(img, item.x - item.size / 2, item.y - item.size / 2, item.size, item.size);
                } else {
                    ctx.fillStyle = item.color;
                    ctx.beginPath();
                    ctx.arc(item.x, item.y, item.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            // Draw Fireballs
            this.fireballs.forEach(fb => {
                if (this.fireballImage && this.fireballImage.complete) {
                    // Rotate fireball?
                    ctx.save();
                    ctx.translate(fb.x, fb.y);
                    // Rotate based on time or velocity?
                    ctx.rotate(Date.now() / 100);
                    ctx.drawImage(this.fireballImage, -fb.size / 2, -fb.size / 2, fb.size, fb.size);
                    ctx.restore();
                } else {
                    ctx.fillStyle = "orange";
                    ctx.beginPath();
                    ctx.arc(fb.x, fb.y, fb.size / 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            });

            // Draw Enemies
            this.enemies.forEach(enemy => {
                if (enemy.type === 'bullet') {
                    if (this.enemyBulletImage && this.enemyBulletImage.complete) {
                        ctx.save();
                        ctx.translate(enemy.x, enemy.y);
                        ctx.rotate(enemy.rotation);
                        // Draw centered.
                        ctx.drawImage(this.enemyBulletImage, -enemy.size / 2, -enemy.size / 2, enemy.size, enemy.size);
                        ctx.restore();
                    } else {
                        ctx.fillStyle = "black";
                        ctx.fillRect(enemy.x - enemy.size / 2, enemy.y - enemy.size / 2, enemy.size, enemy.size);
                    }
                } else if (enemy.type === 'wall') {
                    if (this.enemyWallImage && this.enemyWallImage.complete) {
                        ctx.save();
                        ctx.translate(enemy.x, enemy.y);
                        ctx.rotate(enemy.rotation);
                        // Draw centered. Note: Image orientation matters.
                        // Assuming image is "Pipe with Plant" pointing Up.
                        // We rotated it.
                        // Draw image centered at 0,0
                        ctx.drawImage(this.enemyWallImage, -enemy.size / 2, -enemy.size / 2, enemy.size, enemy.size);
                        ctx.restore();
                    } else {
                        ctx.fillStyle = enemy.color;
                        ctx.fillRect(enemy.x - enemy.size / 2, enemy.y - enemy.size / 2, enemy.size, enemy.size);
                    }
                } else {
                    // Chaser
                    if (this.enemyImage && this.enemyImage.complete) {
                        ctx.drawImage(this.enemyImage, enemy.x - enemy.size / 2, enemy.y - enemy.size / 2, enemy.size, enemy.size);
                    } else {
                        ctx.fillStyle = enemy.color;
                        ctx.fillRect(enemy.x - enemy.size / 2, enemy.y - enemy.size / 2, enemy.size, enemy.size);
                    }
                }
            });

            // Draw Player
            // Flicker if invincible
            if (this.invincibleTimer > 0) {
                // Flash every 4 frames
                ctx.globalAlpha = Math.floor(Date.now() / 100) % 2 === 0 ? 0.5 : 1.0;
                // Or maybe draw a golden aura?
                ctx.strokeStyle = "gold";
                ctx.lineWidth = 3;
                ctx.strokeRect(
                    this.player.x - this.player.size / 2 - 5,
                    this.player.y - this.player.size / 2 - 5,
                    this.player.size + 10,
                    this.player.size + 10
                );
            }
            if (this.playerImage && this.playerImage.complete) {
                ctx.drawImage(
                    this.playerImage,
                    this.player.x - this.player.size / 2,
                    this.player.y - this.player.size / 2,
                    this.player.size,
                    this.player.size
                );
            } else {
                ctx.fillStyle = this.player.hasFirePower ? "#ff4500" : this.player.color; // Orange if Fire Power
                ctx.fillRect(
                    this.player.x - this.player.size / 2,
                    this.player.y - this.player.size / 2,
                    this.player.size,
                    this.player.size
                );
            }

            ctx.globalAlpha = 1.0; // Reset alpha

        } else {
            // Menu / Game Over Screen
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            if (this.score > 0) {
                ctx.font = "30px Arial";
                ctx.fillText("Game Over", width / 2, height / 2 - 20);
                ctx.font = "20px Arial";
                ctx.fillText("Score: " + this.score, width / 2, height / 2 + 20);
            } else {
                ctx.font = "30px Arial";
                ctx.fillText("Avoid & Collect", width / 2, height / 2);
                ctx.font = "16px Arial";
                ctx.fillText("Arrow Keys to Move", width / 2, height / 2 + 30);
            }
        }
    }

    onPoseDetected(className) { } // Ignored for Game 2

    // Callbacks
    setScoreChangeCallback(cb) { this.onScoreChange = cb; }
    setGameEndCallback(cb) { this.onGameEnd = cb; }
    setHpChangeCallback(cb) { this.onHpChange = cb; }
}

window.Game2Engine = Game2Engine;
