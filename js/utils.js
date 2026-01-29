/**
 * NBA Salary Model - Utility Functions
 * 
 * Helper functions for salary calculations, aging curves, and projections.
 * Depends on: constants.js (must be loaded first)
 */

(function(exports) {
    'use strict';

    // Import constants from namespace
    const {
        SEASON_CONFIG,
        POSITION_CATEGORIES,
        AGING_CURVES,
        DEFAULT_POSITION_CATEGORY,
        DARKO_TIERS,
        SALARY_CONSTANTS
    } = exports;

    // =========================================================================
    // SEASON PROGRESS CALCULATIONS
    // =========================================================================

    /**
     * Calculate the fraction of the current season that has elapsed.
     * 
     * This is used to determine how much of the current year's aging delta
     * to apply. If we're 50% through the season, we apply 50% of the delta.
     * 
     * @param {Date} [asOfDate] - Date to calculate progress for (defaults to SEASON_CONFIG.dataAsOfDate)
     * @returns {number} Fraction between 0 and 1 representing season progress
     * 
     * @example
     * // Mid-season (January)
     * getSeasonProgress(new Date('2026-01-15'));  // ~0.48
     * 
     * // Season end
     * getSeasonProgress(new Date('2026-04-13'));  // 1.0
     */
    exports.getSeasonProgress = function(asOfDate = SEASON_CONFIG.dataAsOfDate) {
        const { seasonStartDate, seasonEndDate } = SEASON_CONFIG;
        
        // Total season duration in milliseconds
        const seasonDuration = seasonEndDate.getTime() - seasonStartDate.getTime();
        
        // Time elapsed since season start
        const elapsed = asOfDate.getTime() - seasonStartDate.getTime();
        
        // Clamp between 0 and 1
        const progress = Math.max(0, Math.min(1, elapsed / seasonDuration));
        
        return progress;
    };

    /**
     * Get the current season progress as a human-readable percentage.
     * 
     * @returns {string} Formatted percentage (e.g., "56%")
     */
    exports.getSeasonProgressLabel = function() {
        const progress = exports.getSeasonProgress();
        return `${Math.round(progress * 100)}%`;
    };

    // =========================================================================
    // DARKO LABEL FUNCTIONS
    // =========================================================================

    /**
     * Get a human-readable label for a DARKO rating.
     * 
     * @param {number} darko - DARKO rating value
     * @returns {string} Tier label (e.g., "All-Star", "Bench")
     * 
     * @example
     * getDarkoLabel(5.5);   // "All-NBA"
     * getDarkoLabel(1.5);   // "Quality Starter"
     * getDarkoLabel(-2.5);  // "Replacement Level"
     */
    exports.getDarkoLabel = function(darko) {
        for (const tier of DARKO_TIERS) {
            if (darko >= tier.threshold) {
                return tier.label;
            }
        }
        return "Replacement Level";
    };

    // =========================================================================
    // AGING CURVE FUNCTIONS
    // =========================================================================

    /**
     * Get the expected DARKO change for a player at a given age and position.
     * 
     * This represents the expected change in DARKO over ONE FULL YEAR.
     * For partial years, multiply by the season progress fraction.
     * 
     * @param {number} age - Player's current age
     * @param {string} position - Position code (e.g., 'pg_pos', 'c_pos')
     * @returns {number} Expected DARKO delta for a full year
     * 
     * @example
     * // 25-year-old point guard: still improving
     * getAgingDelta(25, 'pg_pos');  // 0.08
     * 
     * // 33-year-old center: significant decline expected  
     * getAgingDelta(33, 'c_pos');   // -0.70
     */
    exports.getAgingDelta = function(age, position) {
        const category = POSITION_CATEGORIES[position] || DEFAULT_POSITION_CATEGORY;
        const curve = AGING_CURVES[category];
        
        // Clamp age to our defined range (20-36)
        const ageKey = Math.max(20, Math.min(36, Math.floor(age)));
        
        return curve[ageKey];
    };

    /**
     * Calculate the partial-year aging delta for the current season.
     * 
     * Since DARKO is updated periodically (not continuously), and we want
     * to reflect expected aging during the current season, we apply a
     * fraction of the full-year delta based on how far into the season we are.
     * 
     * @param {number} age - Player's current age
     * @param {string} position - Position code
     * @param {Date} [asOfDate] - Date to calculate for (defaults to data refresh date)
     * @returns {number} Partial-year DARKO delta
     * 
     * @example
     * // 30-year-old guard, mid-season (50% complete)
     * // Full year delta = -0.15, so partial = -0.15 * 0.5 = -0.075
     * getPartialYearAgingDelta(30, 'pg_pos');
     */
    exports.getPartialYearAgingDelta = function(age, position, asOfDate) {
        const fullYearDelta = exports.getAgingDelta(age, position);
        const seasonProgress = exports.getSeasonProgress(asOfDate);
        
        return fullYearDelta * seasonProgress;
    };

    /**
     * Calculate cumulative aging delta over multiple years.
     * 
     * Used for multi-year projections. Sums the aging deltas for each
     * year from the player's current age to the projected age.
     * 
     * @param {number} currentAge - Player's current age
     * @param {string} position - Position code
     * @param {number} yearsForward - Number of years to project
     * @param {boolean} [includePartialCurrentYear=false] - Whether to include partial current season
     * @returns {number} Cumulative DARKO delta
     * 
     * @example
     * // Project a 25-year-old wing 3 years forward
     * getCumulativeAgingDelta(25, 'sf_pos', 3);  // ~0.03 (still near peak)
     * 
     * // Project a 32-year-old big 3 years forward
     * getCumulativeAgingDelta(32, 'c_pos', 3);   // ~-2.12 (steep decline)
     */
    exports.getCumulativeAgingDelta = function(currentAge, position, yearsForward, includePartialCurrentYear = false) {
        let cumulativeDelta = 0;
        
        // Optionally include partial current year
        if (includePartialCurrentYear) {
            cumulativeDelta += exports.getPartialYearAgingDelta(currentAge, position);
        }
        
        // Add full-year deltas for each future year
        for (let i = 0; i < yearsForward; i++) {
            cumulativeDelta += exports.getAgingDelta(currentAge + i, position);
        }
        
        return cumulativeDelta;
    };

    // =========================================================================
    // SALARY CALCULATION
    // =========================================================================

    /**
     * Calculate projected salary based on playing time and impact.
     * 
     * Core formula:
     *   salary = (games × minutes / 1475) × (DARKO + 3) × 4.32
     * 
     * With adjustment for star/replacement level:
     *   - MVP-caliber players (high DARKO) get up to +10% bonus
     *   - Replacement-level players (low DARKO) get up to -10% penalty
     * 
     * This reflects that elite players provide outsized value beyond
     * linear projections, while replacement players are easily replaceable.
     * 
     * @param {number} games - Projected games played
     * @param {number} minutes - Projected minutes per game
     * @param {number} darko - Player's DARKO rating (after any adjustments)
     * @returns {string|number} Salary in millions (e.g., "25.4") or "Minimum Salary"
     * 
     * @example
     * // Star player: 75 games, 35 min, 5.0 DARKO
     * calculateSalary(75, 35, 5.0);  // "52.3" (million)
     * 
     * // Role player: 60 games, 20 min, 0.5 DARKO
     * calculateSalary(60, 20, 0.5);  // "10.2" (million)
     * 
     * // Replacement level: 30 games, 10 min, -2.5 DARKO
     * calculateSalary(30, 10, -2.5); // "Minimum Salary"
     */
    exports.calculateSalary = function(games, minutes, darko) {
        const {
            REPLACEMENT_LEVEL_DARKO,
            MINUTES_BASELINE,
            WIN_COST_MILLIONS,
            MVP_BONUS_CAP,
            MVP_BONUS_EXPONENT,
            MVP_BONUS_DIVISOR,
            MINIMUM_SALARY_THRESHOLD
        } = SALARY_CONSTANTS;

        // Base salary calculation
        // (games × minutes) gives total minutes
        // Divide by baseline to normalize
        // (DARKO + 3) converts to wins above replacement (replacement = -3 DARKO)
        // Multiply by win cost to get dollar value
        let salary = (games * minutes / MINUTES_BASELINE) 
                     * (darko - REPLACEMENT_LEVEL_DARKO) 
                     * WIN_COST_MILLIONS;

        // Apply star bonus / replacement penalty
        // This creates a non-linear adjustment where elite players
        // are worth more than linear projection suggests
        const boostFactor = Math.pow(Math.abs(darko) / MVP_BONUS_DIVISOR, MVP_BONUS_EXPONENT) 
                            * MVP_BONUS_CAP;
        const cappedBoost = Math.min(boostFactor, MVP_BONUS_CAP);

        if (darko > 0) {
            salary *= (1 + cappedBoost);
        } else if (darko < 0) {
            salary *= (1 - cappedBoost);
        }

        // Floor at minimum salary
        if (salary < MINIMUM_SALARY_THRESHOLD) {
            return "Minimum Salary";
        }

        return salary.toFixed(1);
    };

    /**
     * Calculate projected salary with aging adjustment applied.
     * 
     * Convenience function that applies aging delta before calculating salary.
     * 
     * @param {number} games - Projected games
     * @param {number} minutes - Projected minutes per game  
     * @param {number} baseDarko - Player's base DARKO rating
     * @param {number} manualAdjustment - User's manual DARKO adjustment
     * @param {number} agingDelta - Aging curve delta to apply
     * @returns {string|number} Salary in millions or "Minimum Salary"
     */
    exports.calculateSalaryWithAging = function(games, minutes, baseDarko, manualAdjustment, agingDelta) {
        const adjustedDarko = baseDarko + manualAdjustment + agingDelta;
        return exports.calculateSalary(games, minutes, adjustedDarko);
    };

    // =========================================================================
    // FORMATTING UTILITIES
    // =========================================================================

    /**
     * Format a salary value for display.
     * 
     * @param {string|number} salary - Salary from calculateSalary()
     * @returns {string} Formatted salary (e.g., "$25.4M" or "Min")
     */
    exports.formatSalary = function(salary) {
        if (salary === "Minimum Salary") {
            return "Min";
        }
        return `$${salary}M`;
    };

    /**
     * Format a surplus/deficit value with sign and color class.
     * 
     * @param {number} surplus - Surplus value in millions
     * @returns {object} { text: string, colorClass: string }
     */
    exports.formatSurplus = function(surplus) {
        const sign = surplus > 0 ? '+' : '';
        return {
            text: `${sign}${surplus.toFixed(1)}M`,
            isPositive: surplus > 0
        };
    };

})(window.NBASalaryModel);
