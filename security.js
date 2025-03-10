// Security Configuration
const SECURITY_CONFIG = {
    // Rate limiting
    MAX_REQUESTS_PER_MINUTE: 60,
    MAX_LOGIN_ATTEMPTS: 5,
    LOGIN_TIMEOUT_MINUTES: 15,

    // Session configuration
    SESSION_TIMEOUT_MINUTES: 60,
    REQUIRE_HTTPS: true,

    // Content Security Policy
    CSP_DIRECTIVES: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cdnjs.cloudflare.com', 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'https://i.imgur.com', 'data:', 'blob:'],
        connectSrc: ["'self'", 'https://*.supabase.co'],
        fontSrc: ["'self'", 'https://cdnjs.cloudflare.com'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
    }
};

// Export security configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SECURITY_CONFIG;
}