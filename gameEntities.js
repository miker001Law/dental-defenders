// Game Entities and Mechanics

class Player {
    constructor() {
        this.x = width / 2;
        this.y = height - 50;
        this.size = 40;
        this.speed = 5;
        this.currentTool = 'toothbrush';
        this.score = 0;
        this.health = 100;
    }

    draw() {
        push();
        // Draw player (toothbrush)
        fill(0, 150, 255);
        rect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        // Draw tool indicator
        textSize(12);
        textAlign(CENTER);
        fill(255);
        text(this.currentTool, this.x, this.y + this.size);
        pop();
    }

    move() {
        if (keyIsDown(LEFT_ARROW)) {
            this.x = max(this.size/2, this.x - this.speed);
        }
        if (keyIsDown(RIGHT_ARROW)) {
            this.x = min(width - this.size/2, this.x + this.speed);
        }
    }

    switchTool(tool) {
        this.currentTool = tool;
    }
}

class Enemy {
    constructor(type = 'basic') {
        this.type = type;
        this.reset();
        this.setupType();
    }

    setupType() {
        switch(this.type) {
            case 'sugar':
                this.size = 20;
                this.health = 50;
                this.speed = random(4, 6);
                this.color = color(255, 150, 150);
                this.points = 150;
                break;
            case 'plaque':
                this.size = 50;
                this.health = 200;
                this.speed = random(1, 2);
                this.color = color(100, 100, 100);
                this.points = 300;
                break;
            default: // basic cavity
                this.size = 30;
                this.health = 100;
                this.speed = random(2, 4);
                this.color = color(255, 0, 0);
                this.points = 100;
        }
    }

    reset() {
        this.x = random(20, width - 20);
        this.y = -20;
    }

    draw() {
        push();
        fill(this.color);
        
        switch(this.type) {
            case 'sugar':
                // Draw sugar bug (diamond shape)
                beginShape();
                vertex(this.x, this.y - this.size/2);
                vertex(this.x + this.size/2, this.y);
                vertex(this.x, this.y + this.size/2);
                vertex(this.x - this.size/2, this.y);
                endShape(CLOSE);
                break;
            case 'plaque':
                // Draw plaque boss (irregular blob)
                beginShape();
                for(let i = 0; i < 8; i++) {
                    let angle = TWO_PI * i / 8;
                    let rad = this.size * (0.8 + random(0.2));
                    let px = this.x + cos(angle) * rad;
                    let py = this.y + sin(angle) * rad;
                    curveVertex(px, py);
                }
                endShape(CLOSE);
                // Draw health bar
                let healthPct = this.health / 200;
                fill(255, 0, 0);
                rect(this.x - this.size/2, this.y - this.size/2 - 10, this.size, 5);
                fill(0, 255, 0);
                rect(this.x - this.size/2, this.y - this.size/2 - 10, this.size * healthPct, 5);
                break;
            default:
                // Basic cavity monster (circle)
                circle(this.x, this.y, this.size);
        }
        pop();
    }

    move() {
        switch(this.type) {
            case 'sugar':
                // Sugar bugs move in a zigzag pattern
                this.x += sin(frameCount * 0.1) * 2;
                this.y += this.speed;
                break;
            case 'plaque':
                // Plaque bosses move slowly but steadily
                this.y += this.speed;
                break;
            default:
                // Basic enemies move straight down
                this.y += this.speed;
        }
        return this.y > height + this.size; // Return true if enemy is off screen
    }

    hit(damage = 25) {
        this.health -= damage;
        return this.health <= 0;
    }
}

class Projectile {
    constructor(x, y, type = 'toothpaste') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.speed = 7;
        this.size = 10;
        this.active = true;
    }

    draw() {
        push();
        fill(0, 255, 0);
        circle(this.x, this.y, this.size);
        pop();
    }

    move() {
        this.y -= this.speed;
        return this.y < -this.size; // Return true if projectile is off screen
    }
}

class PowerUp {
    constructor() {
        this.reset();
        this.size = 20;
        this.types = ['floss', 'mouthwash', 'electric'];
        this.type = random(this.types);
    }

    reset() {
        this.x = random(20, width - 20);
        this.y = -20;
        this.speed = 2;
        this.type = random(this.types);
    }

    draw() {
        push();
        fill(255, 255, 0);
        rect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        textSize(10);
        textAlign(CENTER);
        fill(0);
        text(this.type.charAt(0), this.x, this.y);
        pop();
    }

    move() {
        this.y += this.speed;
        return this.y > height + this.size; // Return true if power-up is off screen
    }
}

// Game state management
class GameState {
    constructor() {
        this.player = new Player();
        this.enemies = [];
        this.projectiles = [];
        this.powerUps = [];
        this.score = 0;
        this.level = 1;
        this.frameCount = 0;
        this.nextSpawnTime = 0;
        this.spawnInterval = 100;
        this.bossSpawned = false;
    }

    update() {
        this.frameCount++;
        
        // Spawn enemies based on level and timing
        if (this.frameCount >= this.nextSpawnTime) {
            this.spawnEnemy();
            this.nextSpawnTime = this.frameCount + this.spawnInterval;
        }

        // Update player
        this.player.move();

        // Update enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            if (this.enemies[i].move()) {
                this.enemies.splice(i, 1);
                this.player.health -= 10;
            }
        }

        // Update projectiles and check collisions
        this.updateProjectiles();
        this.checkCollisions();

        // Level progression
        if (this.score > this.level * 1000) {
            this.levelUp();
        }
    }

    spawnEnemy() {
        let roll = random(100);
        
        // Spawn rates change with level
        if (this.level >= 3 && !this.bossSpawned && this.score > 2000) {
            // Spawn plaque boss every 2000 points
            this.enemies.push(new Enemy('plaque'));
            this.bossSpawned = true;
        } else if (roll < 20 + this.level * 2) {
            // Sugar bugs become more common as level increases
            this.enemies.push(new Enemy('sugar'));
        } else {
            // Basic cavity monsters
            this.enemies.push(new Enemy('basic'));
        }
    }

    levelUp() {
        this.level++;
        this.spawnInterval = max(30, this.spawnInterval - 10);
        this.bossSpawned = false; // Allow new boss to spawn
    }

    updateProjectiles() {
        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            if (this.projectiles[i].move()) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    checkCollisions() {
        // Projectiles hitting enemies
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                let p = this.projectiles[i];
                let e = this.enemies[j];
                let d = dist(p.x, p.y, e.x, e.y);
                
                if (d < (p.size + e.size) / 2) {
                    if (e.hit()) {
                        this.enemies.splice(j, 1);
                        this.score += e.points;
                    }
                    this.projectiles.splice(i, 1);
                    break;
                }
            }
        }

        // Player collecting power-ups
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            let d = dist(this.player.x, this.player.y, 
                        this.powerUps[i].x, this.powerUps[i].y);
            
            if (d < (this.player.size + this.powerUps[i].size) / 2) {
                this.player.switchTool(this.powerUps[i].type);
                this.powerUps.splice(i, 1);
            }
        }
    }

    draw() {
        // Draw all game entities
        this.player.draw();
        this.enemies.forEach(e => e.draw());
        this.projectiles.forEach(p => p.draw());
        this.powerUps.forEach(p => p.draw());

        // Draw HUD
        this.drawHUD();
    }

    drawHUD() {
        push();
        fill(0);
        textSize(20);
        textAlign(LEFT);
        text('Score: ' + this.score, 10, 30);
        text('Level: ' + this.level, 10, 60);
        text('Health: ' + this.player.health, 10, 90);
        text('Tool: ' + this.player.currentTool, 10, 120);
        
        // Debug info
        text('Enemies: ' + this.enemies.length, 10, 150);
        text('Projectiles: ' + this.projectiles.length, 10, 180);
        text('Power-ups: ' + this.powerUps.length, 10, 210);
        pop();
    }
} 