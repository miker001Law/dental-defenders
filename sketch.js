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

function preload() {
    // Load enemy sprites
    sprites.foodParticleA = loadImage('https://i.imgur.com/IyNI9ef.png');
    sprites.foodParticleB = loadImage('https://i.imgur.com/lcw8rTI.png');
    sprites.sugarCrystalA = loadImage('https://i.imgur.com/gctFhAV.png');
    sprites.sugarCrystalB = loadImage('https://i.imgur.com/ITuCGKM.png');
    sprites.plaqueBugA = loadImage('https://i.imgur.com/vNptk1S.png');
    sprites.plaqueBugB = loadImage('https://i.imgur.com/Xl8yMmN.png');
    sprites.cavityBugA = loadImage('https://i.imgur.com/JozuFWL.png');
    sprites.cavityBugB = loadImage('https://i.imgur.com/x7UILxw.png');
    sprites.sugarBugA = loadImage('https://i.imgur.com/RgVqSTG.png');
    sprites.sugarBugB = loadImage('https://i.imgur.com/NuVgQJ9.png');
    
    console.log('Loading sprites...');
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
    frameRate(60);
    console.log('Canvas setup complete');
    
    // Initialize game
    game = new GameState();
    console.log('Game initialized in menu state');
}

// Initialize sound system on first user interaction
function initializeAudio() {
    if (!window.audioInitialized) {
        window.audioInitialized = true;
        console.log('Initializing audio system...');
        
        try {
            userStartAudio().then(() => {
                loadGameSounds();
                console.log('Audio system initialized');
            }).catch(error => {
                console.warn('Audio system initialization failed:', error);
            });
        } catch (error) {
            console.warn('Audio setup failed:', error);
        }
    }
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
    textSize(32);
    textAlign(CENTER, CENTER);
    fill(0);
    text('Loading...', width/2, height/2);
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
}

function resetGame() {
    gameState = 'menu';
    game = new GameState();
    // Clear all game arrays
    if (game) {
        game.enemies = [];
        game.projectiles = [];
        game.powerUps = [];
        game.score = 0;
        game.level = 1;
        game.player.health = 100;
    }
    console.log('Game fully reset');
}

function mousePressed() {
    console.log('Mouse pressed event triggered');
    console.log('Current state:', gameState);
    
    // Initialize audio on first interaction
    initializeAudio();
    
    switch(gameState) {
        case 'menu':
            resetGame();
            gameState = 'playing';
            if (sounds.collect) sounds.collect.play();
            console.log('Game started');
            break;
        case 'playing':
            // Shoot projectile
            game.projectiles.push(new Projectile(game.player.x, game.player.y));
            if (sounds.shoot) sounds.shoot.play();
            console.log('Shot fired');
            break;
        case 'gameOver':
            resetGame();
            if (sounds.collect) sounds.collect.play();
            console.log('Returning to menu');
            break;
    }
    
    return false;
}

function keyPressed() {
    console.log('Key pressed:', key);
    if (key === 'p' || key === 'P') {
        if (gameState === 'playing') {
            gameState = 'paused';
            console.log('Game paused');
        } else if (gameState === 'paused') {
            gameState = 'playing';
            console.log('Game resumed');
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