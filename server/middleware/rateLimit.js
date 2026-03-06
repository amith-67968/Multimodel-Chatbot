/**
 * In-memory rate limiter middleware.
 *
 * Limits each client to a configurable number of requests per window.
 * Identifies clients by IP address (or X-Forwarded-For behind a proxy).
 *
 * @param {object} [options]
 * @param {number} [options.windowMs=60000]  - Time window in milliseconds
 * @param {number} [options.maxRequests=20]  - Max requests per window
 * @returns {Function} Express middleware
 */
function rateLimit({ windowMs = 60_000, maxRequests = 20 } = {}) {
    /** @type {Map<string, { count: number, resetAt: number }>} */
    const clients = new Map();

    // Periodically clean up expired entries to prevent memory leaks
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of clients) {
            if (now >= entry.resetAt) clients.delete(key);
        }
    }, windowMs * 2);

    return (req, res, next) => {
        // Identify client by IP (supports reverse proxies)
        const clientKey = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const now = Date.now();

        let entry = clients.get(clientKey);

        // First request or window expired → reset counter
        if (!entry || now >= entry.resetAt) {
            entry = { count: 1, resetAt: now + windowMs };
            clients.set(clientKey, entry);
        } else {
            entry.count++;
        }

        // Set standard rate-limit headers
        const remaining = Math.max(0, maxRequests - entry.count);
        res.set('X-RateLimit-Limit', String(maxRequests));
        res.set('X-RateLimit-Remaining', String(remaining));
        res.set('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

        if (entry.count > maxRequests) {
            const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
            res.set('Retry-After', String(retryAfter));
            return res.status(429).json({
                error: 'Too many requests. Please wait a moment and try again.',
                retryAfterSeconds: retryAfter,
            });
        }

        next();
    };
}

module.exports = rateLimit;
