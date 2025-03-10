// Supabase Configuration
const SUPABASE_CONFIG = {
    SUPABASE_URL: 'https://your-project.supabase.co',  // Replace with your actual Supabase URL (include https://)
    SUPABASE_KEY: 'your-anon-key'  // Replace with your actual public anon key
};

// Game States
const GAME_STATES = {
    LOADING: 'loading',
    AUTH: 'auth',
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameOver'
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
    CONNECTION: 'Unable to connect to the game server. Please check your internet connection.',
    AUTH: 'Authentication failed. Please try again.',
    SAVE: 'Failed to save game progress. Your progress will be saved when connection is restored.',
    LOAD: 'Failed to load game data. Please try again.'
};