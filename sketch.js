let supabase;
let authManager;
let dataManager;
let authUI;
let progressManager;
let syncManager;
let gameState = 'loading';
let connectionStatus = {
    isConnected: false,
    lastSync: null,
    retryCount: 0,
    maxRetries: 3
};

function setup() {
    let canvas = createCanvas(800, 600);
    canvas.parent('main');
    frameRate(60);
    initializeGame();
}

async function initializeGame() {
    try {
        if (window.supabaseClient) {
            supabase = window.supabaseClient(
                SUPABASE_CONFIG.SUPABASE_URL,
                SUPABASE_CONFIG.SUPABASE_KEY
            );
            
            connectionStatus.isConnected = true;
            connectionStatus.lastSync = Date.now();
            console.log('Successfully connected to Supabase');
            
            // Initialize managers
            authManager = new AuthManager(supabase);
            dataManager = new GameDataManager(supabase);
            progressManager = new ProgressManager(supabase);
            syncManager = new SyncManager();
            
            gameState = 'menu';
        } else {
            console.error('Supabase client not initialized');
            gameState = 'error';
        }
    } catch (error) {
        console.error('Failed to initialize:', error);
        gameState = 'error';
    }
}

function draw() {
    background(220);
    
    textSize(32);
    textAlign(CENTER, CENTER);
    fill(0);
    
    switch(gameState) {
        case 'loading':
            text('Loading...', width/2, height/2);
            break;
        case 'menu':
            text('Dental Defenders\n\nClick to Start', width/2, height/2);
            break;
        case 'playing':
            text('Game Running\n\nClick anywhere to return to menu', width/2, height/2);
            break;
        case 'error':
            fill(255, 0, 0);
            text('Error Loading Game\n\nPlease refresh the page', width/2, height/2);
            break;
        default:
            text(gameState, width/2, height/2);
    }
}

function mousePressed() {
    if (gameState === 'menu') {
        gameState = 'playing';
    } else if (gameState === 'playing') {
        gameState = 'menu';
    }
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