/**
 * NBA Salary Model - Constants
 * 
 * All configuration values and lookup tables used throughout the application.
 * This file has no dependencies and should be loaded first.
 */

// Create namespace to avoid global pollution
window.NBASalaryModel = window.NBASalaryModel || {};

(function(exports) {
    'use strict';

    // =========================================================================
    // SEASON CONFIGURATION
    // =========================================================================
    
    /**
     * Season timing configuration for partial-year aging calculations.
     * 
     * NBA regular season typically runs late October to mid-April.
     * We use these dates to calculate what fraction of the season has elapsed,
     * which determines how much of the current year's aging delta to apply.
     */
    exports.SEASON_CONFIG = {
        // 2025-26 season dates
        currentSeason: '2025-26',
        seasonStartDate: new Date('2025-10-22'),  // Opening night
        seasonEndDate: new Date('2026-04-13'),    // Regular season end
        
        // For projections, which season year to use as "current"
        currentSeasonYear: 2025,
        
        // Reference date for age/time calculations (updated when data refreshes)
        dataAsOfDate: new Date('2026-01-28')
    };

    // =========================================================================
    // SALARY CAP INFLATION
    // =========================================================================
    
    /**
     * Projected salary cap growth rates relative to 2025-26 baseline.
     * Source: RealGM salary cap projections
     * 
     * These multipliers are applied to future year projections to account
     * for expected salary cap increases.
     */
    exports.INFLATION_SCALERS = {
        "2026-27": 1.074,
        "2027-28": 1.127,
        "2028-29": 1.184,
        "2029-30": 1.240,
        "2030-31": 1.305
    };

    // =========================================================================
    // POSITION MAPPINGS
    // =========================================================================
    
    /**
     * Maps position codes (from player data) to aging curve categories.
     * 
     * Categories:
     *   - 'guard': PG, SG - backcourt players
     *   - 'wing': SF - versatile forwards
     *   - 'big': PF, C - frontcourt players
     */
    exports.POSITION_CATEGORIES = {
        'pg_pos': 'guard',
        'sg_pos': 'guard',
        'sf_pos': 'wing',
        'pf_pos': 'big',
        'c_pos': 'big'
    };

    /**
     * Human-readable position labels for display.
     */
    exports.POSITION_LABELS = {
        'pg_pos': 'PG',
        'sg_pos': 'SG',
        'sf_pos': 'SF',
        'pf_pos': 'PF',
        'c_pos': 'C'
    };

    // =========================================================================
    // POSITION-SPECIFIC AGING CURVES
    // =========================================================================
    
    /**
     * Position-specific aging curves.
     * 
     * Values represent expected DARKO change per year at each age.
     *   - Positive values = expected improvement
     *   - Negative values = expected decline
     * 
     * Research basis:
     * NBA aging curves have been studied extensively (Seth Partnow, Kevin Pelton,
     * Nathan Walker, etc.). Key findings:
     * 
     * GUARDS (PG, SG):
     *   Peak: 26-28
     *   - Rely heavily on quickness, first step, lateral movement for defense
     *   - Shooting and playmaking age well (skill-based)
     *   - Steep decline after 32-33 when burst/lateral quickness erodes
     *   - Point guards with high BBIQ age better than athletic scoring guards
     * 
     * WINGS (SF):
     *   Peak: 25-27
     *   - Most favorable aging curve overall
     *   - Versatility allows role adaptation as athleticism fades
     *   - Size + shooting + defensive length = durable skill set
     *   - Can shift from primary creator to 3&D role gracefully
     * 
     * BIGS (PF, C):
     *   Peak: 24-26 (earliest)
     *   - Steepest decline curve
     *   - Heavily athleticism-dependent: rim protection, lob threat, switching
     *   - Jumping ability and foot speed decline significantly after 30
     *   - Size provides a "floor" though - can't teach 7 feet
     *   - Modern NBA switching demands accelerate decline
     */
    exports.AGING_CURVES = {
        guard: {
            20: 0.60, 21: 0.50, 22: 0.40, 23: 0.30, 24: 0.15,
            25: 0.08, 26: 0.03, 27: 0.00, 28: 0.00, 29: -0.08,
            30: -0.15, 31: -0.25, 32: -0.40, 33: -0.55, 34: -0.75,
            35: -1.00, 36: -1.30
        },
        wing: {
            20: 0.65, 21: 0.55, 22: 0.45, 23: 0.35, 24: 0.20,
            25: 0.10, 26: 0.03, 27: 0.00, 28: 0.00, 29: -0.05,
            30: -0.10, 31: -0.18, 32: -0.28, 33: -0.42, 34: -0.58,
            35: -0.80, 36: -1.05
        },
        big: {
            20: 0.75, 21: 0.60, 22: 0.50, 23: 0.35, 24: 0.18,
            25: 0.05, 26: 0.00, 27: -0.03, 28: -0.08, 29: -0.15,
            30: -0.25, 31: -0.38, 32: -0.52, 33: -0.70, 34: -0.90,
            35: -1.15, 36: -1.45
        }
    };

    /**
     * Default position category if position code is unknown.
     * Wing is used as it represents the "average" curve.
     */
    exports.DEFAULT_POSITION_CATEGORY = 'wing';

    // =========================================================================
    // DARKO TIER LABELS
    // =========================================================================
    
    /**
     * DARKO rating tier thresholds and labels.
     * Used to display human-readable skill level descriptions.
     * 
     * Thresholds are checked in descending order (first match wins).
     */
    exports.DARKO_TIERS = [
        { threshold: 6.0,  label: "MVP Level" },
        { threshold: 4.0,  label: "All-NBA" },
        { threshold: 2.0,  label: "All-Star" },
        { threshold: 1.0,  label: "Quality Starter" },
        { threshold: -0.9, label: "Average Player" },
        { threshold: -2.0, label: "Bench" },
        { threshold: -Infinity, label: "Replacement Level" }
    ];

    // =========================================================================
    // SALARY CALCULATION CONSTANTS
    // =========================================================================
    
    /**
     * Core constants for the salary calculation formula.
     * 
     * Formula: salary = (games × minutes / MINUTES_BASELINE) × (DARKO + 3) × WIN_COST
     * With ±10% adjustment for star/replacement level players.
     */
    exports.SALARY_CONSTANTS = {
        // DARKO value for a replacement-level player (league minimum talent)
        REPLACEMENT_LEVEL_DARKO: -3.0,
        
        // Average minutes played per season by a non-replacement player
        // Used to normalize playing time in salary calculation
        MINUTES_BASELINE: 1475,
        
        // Cost per win in millions (2025-26 dollars)
        // Derived from total league salary / total wins above replacement
        WIN_COST_MILLIONS: 4.32,
        
        // Maximum bonus/penalty applied to star/replacement players
        // MVP-caliber players provide outsized value; replacement players are fungible
        MVP_BONUS_CAP: 0.10,
        
        // Exponent for the bonus curve (creates non-linear scaling)
        MVP_BONUS_EXPONENT: 1.2,
        
        // DARKO divisor for bonus calculation
        MVP_BONUS_DIVISOR: 4,
        
        // Salary floor - below this, player is valued at minimum salary
        MINIMUM_SALARY_THRESHOLD: 3.0
    };

    // =========================================================================
    // FUTURE YEARS CONFIGURATION
    // =========================================================================
    
    /**
     * Season labels for multi-year projections.
     */
    exports.FUTURE_YEARS = [
        "2026-27",
        "2027-28", 
        "2028-29",
        "2029-30",
        "2030-31"
    ];

})(window.NBASalaryModel);
