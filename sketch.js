let supabase;
let authManager;
let dataManager;
let authUI;
let progressManager;
let syncManager;
let gameState = 'menu';  // Start directly in menu state
let connectionStatus = {
    isConnected: false,
    lastSync: null,
    retryCount: 0,
    maxRetries: 3
};
let game;
let sounds = {};
let sprites = {};
let loadingComplete = false;

// Game state and entity classes
class GameState {
    constructor() {
        console.log('Initializing GameState...');
        this.player = new Player(width/2, height/2);
        this.enemies = [];
        this.projectiles = [];
        this.powerUps = [];
        this.score = 0;
        this.level = 1;
        this.lastEnemySpawn = 0;
        this.spawnInterval = 1000; // milliseconds
        console.log('GameState initialized successfully');
    }

    update() {
        // Update player
        this.player.update();

        // Update and check projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            this.projectiles[i].update();
            
            // Check projectile-enemy collisions
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                if (this.checkCollision(this.projectiles[i], this.enemies[j])) {
                    // Remove both projectile and enemy
                    this.projectiles.splice(i, 1);
                    this.enemies.splice(j, 1);
                    this.score += 10;
                    if (sounds.hit) sounds.hit.play();
                    
                    // Level up every 100 points
                    if (this.score % 100 === 0) {
                        this.level++;
                        this.spawnInterval = Math.max(200, 1000 - (this.level * 50));
                        if (sounds.collect) sounds.collect.play();
                    }
                    break;
                }
            }
            
            // Remove offscreen projectiles
            if (i >= 0 && this.projectiles[i] && this.projectiles[i].isOffscreen()) {
                this.projectiles.splice(i, 1);
            }
        }

        // Update and check enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            this.enemies[i].update();
            
            // Check enemy-player collision
            if (this.checkCollision(this.enemies[i], this.player)) {
                this.enemies.splice(i, 1);
                this.player.health -= 10;
                if (sounds.hit) sounds.hit.play();
                continue;
            }
            
            // Remove offscreen enemies
            if (this.enemies[i].isOffscreen()) {
                this.enemies.splice(i, 1);
            }
        }

        // Spawn enemies based on time and level
        let currentTime = millis();
        if (currentTime - this.lastEnemySpawn > this.spawnInterval && 
            this.enemies.length < 5 + this.level) {
            this.spawnEnemy();
            this.lastEnemySpawn = currentTime;
        }
    }

    checkCollision(obj1, obj2) {
        if (!obj1 || !obj2) return false;
        let distance = dist(obj1.x, obj1.y, obj2.x, obj2.y);
        return distance < (obj1.size + obj2.size) / 2;
    }

    draw() {
        // Draw player
        this.player.draw();

        // Draw projectiles
        this.projectiles.forEach(p => p.draw());

        // Draw enemies
        this.enemies.forEach(e => e.draw());

        // Draw score
        this.drawScore();
    }

    spawnEnemy() {
        let x = random(width);
        let y = 0;
        this.enemies.push(new Enemy(x, y));
    }

    drawScore() {
        fill(0);
        textSize(24);
        textAlign(LEFT, TOP);
        text(`Score: ${this.score}`, 10, 10);
        text(`Level: ${this.level}`, 10, 40);
        text(`Health: ${this.player.health}`, 10, 70);
    }
}

class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speed = 5;
        this.health = 100;
        this.size = 30;
        this.keys = {
            left: false,
            right: false,
            up: false,
            down: false
        };
        this.sprite = sprites.plaqueBugA; // Use sprite if available
    }

    update() {
        // Move based on key states
        if (this.keys.left) this.x -= this.speed;
        if (this.keys.right) this.x += this.speed;
        if (this.keys.up) this.y -= this.speed;
        if (this.keys.down) this.y += this.speed;

        // Keep player in bounds
        this.x = constrain(this.x, this.size/2, width - this.size/2);
        this.y = constrain(this.y, this.size/2, height - this.size/2);
    }

    draw() {
        if (this.sprite) {
            image(this.sprite, this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        } else {
            fill(0, 255, 0);
            circle(this.x, this.y, this.size);
        }
    }
}

class Projectile {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speed = 10;
        this.size = 10;
        this.sprite = sprites.sugarCrystalA; // Use sprite if available
    }

    update() {
        this.y -= this.speed;
    }

    draw() {
        if (this.sprite) {
            image(this.sprite, this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        } else {
            fill(255, 255, 0);
            circle(this.x, this.y, this.size);
        }
    }

    isOffscreen() {
        return this.y < 0;
    }
}

class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speed = random(2, 4);
        this.size = 20;
        this.sprite = sprites.foodParticleA; // Use sprite if available
    }

    update() {
        this.y += this.speed;
    }

    draw() {
        if (this.sprite) {
            image(this.sprite, this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        } else {
            fill(255, 0, 0);
            circle(this.x, this.y, this.size);
        }
    }

    isOffscreen() {
        return this.y > height;
    }
}

function preload() {
    gameState = 'loading';  // Force loading state
    console.log('Loading sprites...');
    
    // Create default colored rectangle as fallback
    const createFallbackSprite = () => {
        let img = createImage(50, 50);
        img.loadPixels();
        for (let i = 0; i < img.pixels.length; i += 4) {
            img.pixels[i] = 255;   // R
            img.pixels[i+1] = 0;   // G
            img.pixels[i+2] = 0;   // B
            img.pixels[i+3] = 255; // A
        }
        img.updatePixels();
        return img;
    };

    const spriteUrls = {
        foodParticleA: 'https://i.imgur.com/IyNI9ef.png',
        foodParticleB: 'https://i.imgur.com/lcw8rTI.png',
        sugarCrystalA: 'https://i.imgur.com/gctFhAV.png',
        sugarCrystalB: 'https://i.imgur.com/ITuCGKM.png',
        plaqueBugA: 'https://i.imgur.com/vNptk1S.png',
        plaqueBugB: 'https://i.imgur.com/Xl8yMmN.png',
        cavityBugA: 'https://i.imgur.com/JozuFWL.png',
        cavityBugB: 'https://i.imgur.com/x7UILxw.png',
        sugarBugA: 'https://i.imgur.com/RgVqSTG.png',
        sugarBugB: 'https://i.imgur.com/NuVgQJ9.png'
    };

    let loadedCount = 0;
    const totalSprites = Object.keys(spriteUrls).length;

    Object.entries(spriteUrls).forEach(([key, url]) => {
        loadImage(
            url,
            (img) => {
                console.log(`Successfully loaded sprite: ${key}`);
                sprites[key] = img;
                loadedCount++;
                if (loadedCount === totalSprites) {
                    console.log('All sprites loaded successfully');
                    loadingComplete = true;
                    gameState = 'menu';
                }
            },
            () => {
                console.error(`Failed to load sprite ${key}, using fallback`);
                sprites[key] = createFallbackSprite();
                loadedCount++;
                if (loadedCount === totalSprites) {
                    console.log('All sprites processed (some using fallbacks)');
                    loadingComplete = true;
                    gameState = 'menu';
                }
            }
        );
    });
}

// Separate sound loading from preload to make it optional
function loadGameSounds() {
    console.log('Attempting to load sounds...');
    soundFormats('mp3');
    
    try {
        // Create default silent sound for fallback
        sounds.default = new p5.SoundFile();
        
        // Load game sounds with error handling for each
        const soundFiles = {
            shoot: 'shoot',
            collect: 'collect',
            hit: 'hit',
            gameOver: 'gameover'
        };

        Object.entries(soundFiles).forEach(([key, filename]) => {
            try {
                sounds[key] = loadSound(
                    `assets/sounds/${filename}.mp3`,
                    () => console.log(`Loaded sound: ${key}`),
                    () => {
                        console.warn(`Failed to load sound: ${key}`);
                        sounds[key] = sounds.default;
                    }
                );
            } catch (e) {
                console.warn(`Error loading sound ${key}:`, e);
                sounds[key] = sounds.default;
            }
        });
    } catch (error) {
        console.warn('Sound system initialization failed:', error);
        // Set up silent fallback sounds
        Object.keys(sounds).forEach(key => {
            sounds[key] = sounds.default || { play: () => {} };
        });
    }
}

function setup() {
    console.log('Setting up canvas...');
    let canvas = createCanvas(800, 600);
    canvas.parent('game-container');
    
    // Set up basic drawing parameters
    frameRate(60);
    imageMode(CENTER);
    rectMode(CENTER);
    textAlign(CENTER, CENTER);
    
    // Initialize game
    game = new GameState();
    console.log('Game initialized');
}

// Initialize sound system on first user interaction
function initializeAudio() {
    if (!window.audioInitialized) {
        window.audioInitialized = true;
        console.log('Initializing audio system...');
        
        return new Promise((resolve, reject) => {
            try {
                // Create audio context only after user interaction
                getAudioContext().resume().then(() => {
                    loadGameSounds();
                    console.log('Audio system initialized successfully');
                    resolve();
                }).catch(error => {
                    console.warn('Audio context resume failed:', error);
                    reject(error);
                });
            } catch (error) {
                console.warn('Audio setup failed:', error);
                reject(error);
            }
        });
    }
    return Promise.resolve(); // Already initialized
}

function draw() {
    background(220);
    
    switch(gameState) {
        case 'loading':
            drawLoading();
            break;
        case 'menu':
            drawMenu();
            break;
        case 'playing':
            updateGame();
            break;
        case 'paused':
            drawPaused();
            break;
        case 'gameOver':
            drawGameOver();
            break;
        case 'error':
            drawError();
            break;
    }
}

function drawLoading() {
    background(220);
    textSize(32);
    textAlign(CENTER, CENTER);
    fill(0);
    text('Loading Game Assets...', width/2, height/2 - 40);
    
    // Draw loading bar
    const barWidth = 300;
    const barHeight = 20;
    const progress = Object.keys(sprites).length / 10; // 10 total sprites
    
    // Draw border
    noFill();
    stroke(0);
    rect(width/2 - barWidth/2, height/2 + 20, barWidth, barHeight);
    
    // Draw progress
    noStroke();
    fill(0, 100, 255);
    rect(width/2 - barWidth/2, height/2 + 20, barWidth * progress, barHeight);
    
    // Draw percentage
    fill(0);
    noStroke();
    textSize(16);
    text(`${Math.floor(progress * 100)}%`, width/2, height/2 + 60);
}

function drawMenu() {
    textSize(32);
    textAlign(CENTER, CENTER);
    fill(0);
    text('Dental Defenders', width/2, height/2 - 40);
    fill(0, 100, 255);
    text('Click to Start', width/2, height/2 + 40);
}

function drawPaused() {
    // Draw game state in background
    game.draw();
    
    // Draw pause menu
    fill(0, 0, 0, 127);
    rect(0, 0, width, height);
    
    textSize(32);
    textAlign(CENTER, CENTER);
    fill(255);
    text('PAUSED', width/2, height/2 - 40);
    textSize(24);
    text('Press P to Resume', width/2, height/2 + 40);
}

function drawGameOver() {
    textSize(32);
    textAlign(CENTER, CENTER);
    fill(255, 0, 0);
    text('Game Over', width/2, height/2 - 60);
    fill(0);
    textSize(24);
    text('Final Score: ' + game.score, width/2, height/2);
    fill(0, 100, 255);
    text('Click to Play Again', width/2, height/2 + 60);
}

function drawError() {
    textSize(32);
    textAlign(CENTER, CENTER);
    fill(255, 0, 0);
    text('Error Loading Game', width/2, height/2 - 20);
    text('Please refresh the page', width/2, height/2 + 20);
}

function updateGame() {
    try {
        console.log('Starting game update...');
        // Update game state
        let previousHealth = game.player.health;
        game.update();
        
        // Check for health loss
        if (game.player.health < previousHealth) {
            if (sounds.hit) sounds.hit.play();
        }
        
        // Draw game
        game.draw();
        
        // Debug info in console
        if (frameCount % 60 === 0) {
            console.log('Game State:', {
                playerPos: { x: game.player.x, y: game.player.y },
                monsters: game.monsters.length,
                projectiles: game.projectiles.length,
                powerUps: game.powerUps.length,
                score: game.score,
                health: game.player.health
            });
        }
        
        // Check for game over
        if (game.player.health <= 0) {
            gameState = 'gameOver';
            if (sounds.gameOver) sounds.gameOver.play();
        }
        console.log('Game update complete');
    } catch (error) {
        console.error('Error during game update:', error);
        gameState = 'error';
    }
}

function resetGame() {
    console.log('Starting game reset...');
    gameState = 'menu';
    
    try {
        console.log('Creating new GameState instance...');
        game = new GameState();
        console.log('GameState created successfully');
        
        // Clear all game arrays
        if (game) {
            console.log('Clearing game arrays...');
            game.enemies = [];
            game.projectiles = [];
            game.powerUps = [];
            game.score = 0;
            game.level = 1;
            game.player.health = 100;
            console.log('Game arrays cleared successfully');
        }
    } catch (error) {
        console.error('Error during game reset:', error);
        gameState = 'error';
    }
    console.log('Game reset complete');
}

function mousePressed() {
    console.log('Mouse pressed event triggered');
    console.log('Current state:', gameState);
    console.log('Loading complete:', loadingComplete);
    console.log('Game instance exists:', !!game);
    
    if (!loadingComplete) {
        console.log('Still loading assets...');
        return false;
    }

    // Initialize audio on first interaction
    initializeAudio().then(() => {
        console.log('Audio initialized successfully');
        switch(gameState) {
            case 'menu':
                console.log('Starting game from menu...');
                resetGame();
                gameState = 'playing';
                if (sounds.collect) sounds.collect.play();
                console.log('Game started successfully');
                break;
            case 'playing':
                console.log('Firing projectile...');
                if (game && game.projectiles) {
                    game.projectiles.push(new Projectile(game.player.x, game.player.y));
                    if (sounds.shoot) sounds.shoot.play();
                    console.log('Shot fired successfully');
                } else {
                    console.error('Game or projectiles array not initialized');
                }
                break;
            case 'gameOver':
                console.log('Restarting from game over...');
                resetGame();
                if (sounds.collect) sounds.collect.play();
                console.log('Returned to menu');
                break;
        }
    }).catch(error => {
        console.error('Audio initialization failed:', error);
        // Continue with game even if audio fails
        switch(gameState) {
            case 'menu':
                console.log('Starting game without audio...');
                if (loadingComplete) {
                    resetGame();
                    gameState = 'playing';
                }
                break;
            case 'playing':
                console.log('Firing projectile without audio...');
                if (game && game.projectiles) {
                    game.projectiles.push(new Projectile(game.player.x, game.player.y));
                }
                break;
            case 'gameOver':
                console.log('Restarting without audio...');
                resetGame();
                break;
        }
    });
    
    return false;
}

function keyPressed() {
    if (game && game.player) {
        switch(keyCode) {
            case LEFT_ARROW:
            case 65: // A
                game.player.keys.left = true;
                break;
            case RIGHT_ARROW:
            case 68: // D
                game.player.keys.right = true;
                break;
            case UP_ARROW:
            case 87: // W
                game.player.keys.up = true;
                break;
            case DOWN_ARROW:
            case 83: // S
                game.player.keys.down = true;
                break;
            case 80: // P
                if (gameState === 'playing') {
                    gameState = 'paused';
                } else if (gameState === 'paused') {
                    gameState = 'playing';
                }
                break;
        }
    }
    return false;
}

function keyReleased() {
    if (game && game.player) {
        switch(keyCode) {
            case LEFT_ARROW:
            case 65: // A
                game.player.keys.left = false;
                break;
            case RIGHT_ARROW:
            case 68: // D
                game.player.keys.right = false;
                break;
            case UP_ARROW:
            case 87: // W
                game.player.keys.up = false;
                break;
            case DOWN_ARROW:
            case 83: // S
                game.player.keys.down = false;
                break;
        }
    }
    return false;
}

// Initialize Supabase and test connection
async function initializeSupabase() {
    try {
        supabase = supabase.createClient(
            SUPABASE_CONFIG.SUPABASE_URL,
            SUPABASE_CONFIG.SUPABASE_KEY
        );
        
        connectionStatus.isConnected = true;
        connectionStatus.lastSync = Date.now();
        console.log('Successfully connected to Supabase');
        gameState = 'menu';
        return true;
    } catch (error) {
        console.error('Supabase connection error:', error.message);
        handleConnectionError();
        return false;
    }
}

// Handle connection errors
function handleConnectionError() {
    connectionStatus.isConnected = false;
    
    if (connectionStatus.retryCount < connectionStatus.maxRetries) {
        connectionStatus.retryCount++;
        console.log(`Retrying connection (${connectionStatus.retryCount}/${connectionStatus.maxRetries})...`);
        setTimeout(initializeSupabase, 2000 * connectionStatus.retryCount);
    } else {
        showErrorMessage(ERROR_MESSAGES.CONNECTION);
        // Switch to offline mode if available
        enableOfflineMode();
    }
}

// Show error message to user
function showErrorMessage(message) {
    messages.push({
        text: message,
        timer: 300,
        isError: true
    });
}

// Enable offline mode
function enableOfflineMode() {
    console.log('Switching to offline mode');
    // Implement offline functionality here
    // Load cached data if available
}

function initializeInputFields() {
    inputFields = {
        email: createInput(''),
        password: createInput('', 'password'),
        childName: createInput(''),
        age: createInput('')
    };
    
    Object.values(inputFields).forEach(input => {
        input.position(-1000, -1000);
        input.style('font-size', '14px');
        input.style('padding', '5px');
    });
}

function initializeGameTools() {
    tools = [
        new ToothpasteTube(),
        new MouthwashBottle(),
        new FlossPick(),
        new ElectricToothbrush()
    ];
    player = tools[currentTool];
}

// Clean up when the game closes
window.onbeforeunload = () => {
    dataManager.stopAutoSync();
    dataManager.syncOfflineData();
    syncManager.stopAutoSync();
    progressManager.syncOfflineProgress();
};

class AuthManager {
    constructor(supabase) {
        this.supabase = supabase;
        this.currentUser = null;
        this.sessionTimeout = null;
        
        // Set up auth state change listener
        this.supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN') {
                this.startSessionTimer();
            } else if (event === 'SIGNED_OUT') {
                this.clearSessionTimer();
            }
        });
    }

    startSessionTimer() {
        // Auto-logout after 1 hour of inactivity
        this.sessionTimeout = setTimeout(() => {
            this.signOut();
        }, 3600000);
    }

    clearSessionTimer() {
        if (this.sessionTimeout) {
            clearTimeout(this.sessionTimeout);
        }
    }

    // Add rate limiting
    async signInWithEmail(parentEmail, password) {
        const attempts = localStorage.getItem('loginAttempts') || 0;
        const lastAttempt = localStorage.getItem('lastLoginAttempt');
        const now = Date.now();

        if (attempts > 5 && now - lastAttempt < 300000) {
            throw new Error('Too many login attempts. Please try again in 5 minutes.');
        }

        try {
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: parentEmail,
                password: password
            });

            if (error) {
                localStorage.setItem('loginAttempts', Number(attempts) + 1);
                localStorage.setItem('lastLoginAttempt', now);
                throw error;
            }

            // Reset attempts on successful login
            localStorage.removeItem('loginAttempts');
            localStorage.removeItem('lastLoginAttempt');
            return data;
        } catch (error) {
            console.error('Error signing in:', error.message);
            return null;
        }
    }

    async createAccount(parentEmail, password, childData) {
        try {
            // Create auth account
            const { data: authData, error: authError } = await this.supabase.auth.signUp({
                email: parentEmail,
                password: password
            });

            if (authError) throw authError;

            // Create player profile
            const { data: profileData, error: profileError } = await this.supabase
                .from('player_profiles')
                .insert([{
                    user_id: authData.user.id,
                    child_name: childData.name,
                    age: childData.age,
                    parent_email: parentEmail
                }])
                .single();

            if (profileError) throw profileError;

            return { authData, profileData };
        } catch (error) {
            console.error('Error creating account:', error.message);
            return null;
        }
    }

    async signOut() {
        const { error } = await this.supabase.auth.signOut();
        if (error) console.error('Error signing out:', error.message);
    }
}

class GameDataManager {
    constructor(supabase) {
        this.supabase = supabase;
        this.offlineData = [];
        this.syncInterval = null;
    }

    async saveGameProgress(progressData) {
        try {
            if (!navigator.onLine) {
                this.storeOfflineData(progressData);
                return;
            }

            const { data, error } = await this.supabase
                .from('game_progress')
                .insert([progressData]);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error saving progress:', error);
            this.storeOfflineData(progressData);
        }
    }

    storeOfflineData(data) {
        this.offlineData.push({
            ...data,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('offlineGameData', JSON.stringify(this.offlineData));
    }

    async syncOfflineData() {
        if (!navigator.onLine) return;

        const offlineData = JSON.parse(localStorage.getItem('offlineGameData') || '[]');
        if (offlineData.length === 0) return;

        try {
            const { data, error } = await this.supabase
                .from('game_progress')
                .insert(offlineData);

            if (error) throw error;

            // Clear synced data
            localStorage.removeItem('offlineGameData');
            this.offlineData = [];
        } catch (error) {
            console.error('Error syncing offline data:', error);
        }
    }

    startAutoSync() {
        this.syncInterval = setInterval(() => {
            this.syncOfflineData();
        }, 60000); // Sync every minute
    }

    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
    }
}

class AuthUI {
    constructor() {
        this.visible = false;
        this.mode = 'login'; // 'login' or 'register'
        this.errorMessage = '';
    }

    draw() {
        if (!this.visible) return;

        push();
        // Semi-transparent background
        fill(0, 0, 0, 150);
        rect(0, 0, width, height);

        // Auth panel
        fill(255);
        rectMode(CENTER);
        rect(width/2, height/2, 400, 500, 20);

        // Title
        fill(0);
        textAlign(CENTER);
        textSize(24);
        text(this.mode === 'login' ? 'Parent Login' : 'Create Account', width/2, height/2 - 200);

        // Input fields
        this.drawInputFields();

        // Buttons
        this.drawButtons();

        // Error message
        if (this.errorMessage) {
            fill(255, 0, 0);
            textSize(14);
            text(this.errorMessage, width/2, height/2 + 180);
        }
        pop();
    }

    drawInputFields() {
        // Implementation of input fields
    }

    drawButtons() {
        // Implementation of buttons
    }

    handleClick(x, y) {
        // Handle click events
    }
}

class ProgressManager {
    constructor(supabase) {
        this.supabase = supabase;
        this.currentProgress = {
            score: 0,
            level: 1,
            achievements: [],
            lastSaved: null
        };
        this.offlineQueue = [];
    }

    async saveProgress(progressData) {
        if (!navigator.onLine) {
            this.queueOfflineProgress(progressData);
            return;
        }

        try {
            const { data, error } = await this.supabase
                .from('game_progress')
                .insert([{
                    profile_id: authManager.currentUser.id,
                    ...progressData,
                    last_played_at: new Date().toISOString()
                }]);

            if (error) throw error;
            this.currentProgress = { ...progressData, lastSaved: new Date() };
            return data;
        } catch (error) {
            console.error('Error saving progress:', error);
            this.queueOfflineProgress(progressData);
        }
    }

    queueOfflineProgress(progressData) {
        this.offlineQueue.push({
            ...progressData,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('offlineProgress', JSON.stringify(this.offlineQueue));
    }

    async syncOfflineProgress() {
        if (!navigator.onLine) return;

        const offlineData = JSON.parse(localStorage.getItem('offlineProgress') || '[]');
        if (offlineData.length === 0) return;

        try {
            const { data, error } = await this.supabase
                .from('game_progress')
                .insert(offlineData);

            if (error) throw error;
            localStorage.removeItem('offlineProgress');
            this.offlineQueue = [];
        } catch (error) {
            console.error('Error syncing offline progress:', error);
        }
    }
}

class SyncManager {
    constructor() {
        this.syncInterval = null;
        this.isOnline = navigator.onLine;
        this.pendingSync = false;

        // Listen for online/offline events
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }

    startAutoSync() {
        this.syncInterval = setInterval(() => {
            if (this.isOnline && this.pendingSync) {
                this.syncAll();
            }
        }, 60000); // Check every minute
    }

    async syncAll() {
        try {
            await progressManager.syncOfflineProgress();
            await this.syncPlayerProfile();
            this.pendingSync = false;
        } catch (error) {
            console.error('Sync failed:', error);
            this.pendingSync = true;
        }
    }

    handleOnline() {
        this.isOnline = true;
        if (this.pendingSync) {
            this.syncAll();
        }
    }

    handleOffline() {
        this.isOnline = false;
        this.pendingSync = true;
    }

    async syncPlayerProfile() {
        // Sync player profile data
    }

    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
    }
}

// Add window event listener for page visibility changes
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Page is hidden (tab switched, minimized, etc.)
        console.log('Game paused due to page visibility change');
        if (gameState === 'playing') {
            gameState = 'paused';
        }
    }
});

// Add window unload handler
window.addEventListener('beforeunload', function() {
    resetGame();
});