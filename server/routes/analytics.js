const express = require('express');
const router = express.Router();
const { getAnalyticsSummary } = require('../services/analyticsService');

// GET /api/analytics — return aggregated usage statistics
router.get('/', async (req, res) => {
    try {
        const summary = await getAnalyticsSummary();
        res.json(summary);
    } catch (error) {
        console.error('Analytics error:', error.message);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});

module.exports = router;
