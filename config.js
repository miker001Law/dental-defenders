// Game States
const GAME_STATES = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameOver'
};

// Game Configuration
const GAME_CONFIG = {
    OFFLINE_MODE: true,
    DEBUG: true,
    MONSTER_SPAWN_RATE: 100,
    POWERUP_SPAWN_RATE: 500,
    PLAYER_SPEED: 5,
    PROJECTILE_SPEED: 7
};

// Database Tables
const DB_TABLES = {
    PROFILES: 'profiles',
    ACHIEVEMENTS: 'achievements',
    GAME_PROGRESS: 'game_progress',
    SCORES: 'scores'
};

// Error Messages
const ERROR_MESSAGES = {
    CONNECTION: 'Unable to connect to the game server. Playing in offline mode.',
    AUTH: 'Authentication failed. Please try again.',
    SAVE: 'Failed to save game progress. Your progress will be saved when connection is restored.',
    LOAD: 'Failed to load game data. Please try again.'
};