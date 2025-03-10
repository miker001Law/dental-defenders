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

class CavityMonster {
    constructor() {
        this.reset();
        this.y = -20; // Start above the screen
        this.size = 30;
        this.health = 100;
    }

    reset() {
        this.x = random(20, width - 20);
        this.y = -20;
        this.speed = random(2, 4);
    }

    draw() {
        push();
        fill(255, 0, 0);
        circle(this.x, this.y, this.size);
        pop();
    }

    move() {
        this.y += this.speed;
        return this.y > height + this.size; // Return true if monster is off screen
    }

    hit() {
        this.health -= 25;
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
        this.monsters = [];
        this.projectiles = [];
        this.powerUps = [];
        this.score = 0;
        this.level = 1;
        this.monsterSpawnRate = 100;
        this.powerUpSpawnRate = 500;
        this.frameCount = 0;
    }

    update() {
        this.frameCount++;
        
        // Spawn monsters
        if (this.frameCount % this.monsterSpawnRate === 0) {
            this.monsters.push(new CavityMonster());
        }

        // Spawn power-ups
        if (this.frameCount % this.powerUpSpawnRate === 0) {
            this.powerUps.push(new PowerUp());
        }

        // Update player
        this.player.move();

        // Update monsters
        for (let i = this.monsters.length - 1; i >= 0; i--) {
            if (this.monsters[i].move()) {
                this.monsters.splice(i, 1);
                this.player.health -= 10;
            }
        }

        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            if (this.projectiles[i].move()) {
                this.projectiles.splice(i, 1);
            }
        }

        // Update power-ups
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            if (this.powerUps[i].move()) {
                this.powerUps.splice(i, 1);
            }
        }

        // Check collisions
        this.checkCollisions();

        // Level progression
        if (this.score > this.level * 1000) {
            this.levelUp();
        }
    }

    checkCollisions() {
        // Projectiles hitting monsters
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            for (let j = this.monsters.length - 1; j >= 0; j--) {
                let p = this.projectiles[i];
                let m = this.monsters[j];
                let d = dist(p.x, p.y, m.x, m.y);
                
                if (d < (p.size + m.size) / 2) {
                    if (m.hit()) {
                        this.monsters.splice(j, 1);
                        this.score += 100;
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

    levelUp() {
        this.level++;
        this.monsterSpawnRate = max(30, this.monsterSpawnRate - 10);
        // Add level up effects here
    }

    draw() {
        // Draw all game entities
        this.player.draw();
        this.monsters.forEach(m => m.draw());
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
        text(\`Score: \${this.score}\`, 10, 30);
        text(\`Level: \${this.level}\`, 10, 60);
        text(\`Health: \${this.player.health}\`, 10, 90);
        text(\`Tool: \${this.player.currentTool}\`, 10, 120);
        pop();
    }
} 