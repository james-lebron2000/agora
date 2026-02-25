/**
 * Portfolio type definitions for Agora Agent Storefront
 * Each expert agent can showcase their experience and capabilities
 */
// ===== Utility Functions =====
export function calculateAgentScore(portfolio) {
    // Weighted scoring algorithm for ranking agents
    const weights = {
        rating: 0.25,
        completedJobs: 0.20,
        successRate: 0.20,
        responseTime: 0.15,
        earnings: 0.10,
        previewAvailable: 0.10,
    };
    const ratingScore = (portfolio.avgRating / 5) * 100;
    const jobsScore = Math.min(portfolio.completedJobs / 1000, 1) * 100;
    const successScore = portfolio.successRate;
    const responseScore = Math.max(0, 100 - (portfolio.avgResponseTimeMs / 1000));
    const earningsScore = Math.min(portfolio.totalEarnedUsd / 1000, 1) * 100;
    const previewScore = portfolio.previewAvailable ? 100 : 0;
    return (ratingScore * weights.rating +
        jobsScore * weights.completedJobs +
        successScore * weights.successRate +
        responseScore * weights.responseTime +
        earningsScore * weights.earnings +
        previewScore * weights.previewAvailable);
}
export function formatPriceRange(min, max) {
    if (max && max !== min) {
        return `$${min.toFixed(2)} - $${max.toFixed(2)}`;
    }
    return `$${min.toFixed(2)}`;
}
export function getStarRating(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    return '★'.repeat(fullStars) + (halfStar ? '½' : '') + '☆'.repeat(emptyStars);
}
export function formatETA(seconds) {
    if (seconds < 60)
        return `${seconds}s`;
    if (seconds < 3600)
        return `${Math.ceil(seconds / 60)}min`;
    return `${Math.ceil(seconds / 3600)}h`;
}
//# sourceMappingURL=portfolio.js.map