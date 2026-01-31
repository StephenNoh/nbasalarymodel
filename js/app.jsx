/**
 * NBA Salary Model - Main Application
 * 
 * Main React application component.
 * Depends on: constants.js, utils.js, components.jsx
 */

(function(exports) {
    'use strict';

    const { useState, useEffect } = React;

    // Import from namespace
    const {
        // Constants
        INFLATION_SCALERS,
        POSITION_CATEGORIES,
        POSITION_LABELS,
        FUTURE_YEARS,
        SEASON_CONFIG,
        
        // Utils
        getDarkoLabel,
        getAgingDelta,
        getPartialYearAgingDelta,
        getCumulativeAgingDelta,
        calculateSalary,
        formatSalary,
        formatSurplus,
        getSeasonProgressLabel,
        
        // Components
        SearchIcon,
        PlusIcon,
        TrashIcon,
        LoadingSpinner,
        ErrorDisplay,
        PlayerSearch,
        SliderInput
    } = exports;

    // =========================================================================
    // PLAYER CARD COMPONENT
    // =========================================================================

    /**
     * Individual player comparison card with projections
     */
    const PlayerCard = ({ 
        comparison, 
        index, 
        canRemove,
        playerData,
        onUpdate,
        onRemove,
        onSelectPlayer
    }) => {
        const comp = comparison;

        // Filter players based on search term
        const getFilteredPlayers = (searchTerm) => {
            if (!searchTerm) return [];
            return playerData.filter(p => 
                p.name.toLowerCase().includes(searchTerm.toLowerCase())
            ).slice(0, 10);
        };

        // Handle search input change
        const handleSearchChange = (value) => {
            onUpdate(comp.id, {
                searchTerm: value,
                showDropdown: true,
                selectedPlayer: null
            });
        };

        // Handle player selection
        const handleSelectPlayer = (player) => {
            onSelectPlayer(comp.id, player);
        };

        return (
            <div className="bg-white rounded-lg shadow-lg p-6">
                {/* Card Header */}
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-700">
                        Player {index + 1}
                    </h2>
                    {canRemove && (
                        <button 
                            onClick={() => onRemove(comp.id)}
                            className="text-red-500 hover:text-red-700"
                            aria-label="Remove player"
                        >
                            <TrashIcon size={20} />
                        </button>
                    )}
                </div>

                {/* Player Search */}
                <PlayerSearch
                    searchTerm={comp.searchTerm}
                    onSearchChange={handleSearchChange}
                    onFocus={() => onUpdate(comp.id, { showDropdown: true })}
                    showDropdown={comp.showDropdown && !comp.selectedPlayer}
                    filteredPlayers={getFilteredPlayers(comp.searchTerm)}
                    onSelectPlayer={handleSelectPlayer}
                    positionLabels={POSITION_LABELS}
                />

                {/* Player Details (only shown when player selected) */}
                {comp.selectedPlayer && (
                    <PlayerDetails 
                        comparison={comp}
                        onUpdate={(field, value) => onUpdate(comp.id, { [field]: value })}
                    />
                )}
            </div>
        );
    };

    // =========================================================================
    // PLAYER DETAILS COMPONENT
    // =========================================================================

    /**
     * Player details, inputs, and projections
     */
    const PlayerDetails = ({ comparison, onUpdate }) => {
        const comp = comparison;
        const player = comp.selectedPlayer;

        // Calculate partial-year aging delta for current season
        const currentYearAgingDelta = getPartialYearAgingDelta(player.age, player.pos);
        
        // Adjusted DARKO including user adjustment AND partial-year aging
        const adjustedDarkoWithAging = player.darko + comp.improvement + currentYearAgingDelta;
        
        // Current year projected salary (with partial aging applied)
        const currentYearSalary = calculateSalary(
            comp.games, 
            comp.minutes, 
            adjustedDarkoWithAging
        );

        return (
            <>
                {/* Games Slider */}
                <SliderInput
                    label="Estimate games played (1-82)"
                    value={comp.games}
                    onChange={(val) => onUpdate('games', val)}
                    min={1}
                    max={82}
                />

                {/* Minutes Slider */}
                <SliderInput
                    label="Estimate minutes per game (0-48)"
                    value={comp.minutes}
                    onChange={(val) => onUpdate('minutes', val)}
                    min={0}
                    max={48}
                />

                {/* DARKO Adjustment Slider */}
                <div className="mb-6">
                    <SliderInput
                        label="I know ball better than DARKO. Adjust by"
                        value={comp.improvement}
                        onChange={(val) => onUpdate('improvement', val)}
                        min={-5}
                        max={5}
                        step={0.1}
                        displayValue={comp.improvement > 0 ? `+${comp.improvement}` : comp.improvement}
                    />
                    
                    {/* DARKO Info Box */}
                    <div className="mt-3 p-3 bg-gray-100 rounded text-sm space-y-1">
                        <div>
                            Base DARKO: <span className="font-semibold">{player.darko.toFixed(2)}</span>
                            {' '}({getDarkoLabel(player.darko)})
                        </div>
                        <div>
                            + Manual adjustment: <span className="font-semibold">
                                {comp.improvement > 0 ? '+' : ''}{comp.improvement.toFixed(1)}
                            </span>
                        </div>
                        <div>
                            + Partial-year aging ({getSeasonProgressLabel()} through season): 
                            <span className={`font-semibold ${currentYearAgingDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {' '}{currentYearAgingDelta >= 0 ? '+' : ''}{currentYearAgingDelta.toFixed(2)}
                            </span>
                        </div>
                        <div className="border-t border-gray-300 pt-1 mt-1">
                            <strong>Effective DARKO: </strong>
                            <span className="font-bold text-blue-600">{adjustedDarkoWithAging.toFixed(2)}</span>
                            {' '}({getDarkoLabel(adjustedDarkoWithAging)})
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            Position: {POSITION_LABELS[player.pos]} · 
                            Aging curve: {POSITION_CATEGORIES[player.pos]} · 
                            Age: {player.age.toFixed(1)}
                        </div>
                    </div>
                </div>

                {/* Salary Projections Box */}
                <SalaryProjections
                    player={player}
                    games={comp.games}
                    minutes={comp.minutes}
                    improvement={comp.improvement}
                    currentYearSalary={currentYearSalary}
                    currentYearAgingDelta={currentYearAgingDelta}
                />
            </>
        );
    };

    // =========================================================================
    // SALARY PROJECTIONS COMPONENT
    // =========================================================================

    /**
     * Salary projection display with current and future years
     */
    const SalaryProjections = ({ 
        player, 
        games, 
        minutes, 
        improvement,
        currentYearSalary,
        currentYearAgingDelta
    }) => {
        // Calculate current year surplus
        let runningTotalSurplus = 0;
        if (player.actualSalary) {
            const currentProjNum = currentYearSalary === "Minimum Salary" ? 0 : parseFloat(currentYearSalary);
            runningTotalSurplus = currentProjNum - player.actualSalary;
        }

        // Build future year projections
        const futureRows = FUTURE_YEARS.map((seasonLabel, idx) => {
            const yearOffset = idx + 1;
            const projectedAge = player.age + yearOffset;
            
            // Cumulative aging: partial current year + full years forward
            // For year 1 (2026-27): we need remaining current year aging + year 1 aging
            // Actually, let's think about this more carefully:
            // - Current season (25-26): partial aging already applied to current year value
            // - Future years start fresh from the END of current season
            // - So for 2026-27, we apply: (1 - currentProgress) of current age + full next age
            
            // Simpler approach: just accumulate full years from current age
            // The partial year is already in the current year calculation
            let cumulativeDelta = 0;
            for (let i = 0; i < yearOffset; i++) {
                cumulativeDelta += getAgingDelta(player.age + i, player.pos);
            }

            const projectedDarko = player.darko + improvement + cumulativeDelta;
            const rawSalary = calculateSalary(games, minutes, projectedDarko);
            
            let inflatedValue = 0;
            let displaySalary;

            if (rawSalary === "Minimum Salary") {
                displaySalary = "Min";
            } else {
                inflatedValue = parseFloat(rawSalary) * (INFLATION_SCALERS[seasonLabel] || 1);
                displaySalary = `$${inflatedValue.toFixed(1)}M`;
            }

            const actualSalary = player.futureSalaries?.[seasonLabel];
            const surplus = actualSalary ? (inflatedValue - actualSalary) : null;
            
            if (surplus !== null) {
                runningTotalSurplus += surplus;
            }

            return {
                seasonLabel,
                projectedAge,
                displaySalary,
                actualSalary,
                surplus
            };
        });

        return (
            <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                {/* Player Name Header */}
                <div className="text-xs font-bold text-blue-800 uppercase tracking-widest mb-2 border-b border-blue-100 pb-1">
                    {player.name}
                </div>

                {/* Current Year Values */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 divide-y md:divide-y-0 md:divide-x divide-blue-200">
                    <div>
                        <div className="text-sm text-gray-600 mb-1">
                            Projected Value ({SEASON_CONFIG.currentSeason})
                        </div>
                        <div className="text-3xl font-bold text-blue-600">
                            {formatSalary(currentYearSalary)}
                        </div>
                    </div>
                    <div className="pt-4 md:pt-0 md:pl-4">
                        <div className="text-sm text-gray-600 mb-1">
                            Actual Salary ({SEASON_CONFIG.currentSeason})
                        </div>
                        <div className="text-3xl font-bold text-gray-700">
                            {player.actualSalary > 0 
                                ? `$${player.actualSalary.toFixed(1)}M` 
                                : "Free Agent"
                            }
                        </div>
                        {player.actualSalary > 0 && (() => {
                            const projNum = currentYearSalary === "Minimum Salary" ? 0 : parseFloat(currentYearSalary);
                            const diff = projNum - player.actualSalary;
                            const surplusInfo = formatSurplus(diff);
                            return (
                                <div className={`text-sm font-medium mt-1 ${surplusInfo.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                    {surplusInfo.text} surplus
                                </div>
                            );
                        })()}
                    </div>
                </div>

                {/* Multi-Year Projections */}
                <div className="mt-6 border-t pt-4">
                    <h3 className="text-lg font-bold text-gray-800 mb-3">
                        Multi-Year Projections
                    </h3>
                    
                    {/* Header Row */}
                    <div className="grid grid-cols-12 text-xs font-bold text-blue-800 uppercase tracking-wider mb-1 pb-1 border-b border-blue-200">
                        <span className="col-span-4">Season (Age)</span>
                        <span className="col-span-2 text-center">Proj.</span>
                        <span className="col-span-4 text-center">Actual</span>
                        <span className="col-span-2 text-right">Surplus</span>
                    </div>

                    {/* Future Year Rows */}
                    <div className="space-y-0">
                        {futureRows.map(row => (
                            <div 
                                key={row.seasonLabel} 
                                className="grid grid-cols-12 items-center border-b border-blue-100 py-2 last:border-0 gap-0"
                            >
                                <span className="col-span-4 text-gray-600 font-medium text-sm whitespace-nowrap">
                                    {row.seasonLabel}{' '}
                                    <span className="text-xs opacity-75">
                                        ({Math.floor(row.projectedAge)})
                                    </span>
                                </span>
                                <span className="col-span-2 font-bold text-blue-700 text-center text-sm">
                                    {row.displaySalary}
                                </span>
                                <span className="col-span-4 text-gray-500 italic text-center text-xs whitespace-nowrap">
                                    {row.actualSalary 
                                        ? `$${Number(row.actualSalary).toFixed(1)}M` 
                                        : "Free Agent"
                                    }
                                </span>
                                <span className="col-span-2 text-right whitespace-nowrap text-sm">
                                    {row.surplus !== null && (
                                        <span className={`font-bold ${row.surplus > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {row.surplus > 0 ? '+' : ''}{row.surplus.toFixed(1)}M
                                        </span>
                                    )}
                                </span>
                            </div>
                        ))}

                        {/* Total Surplus */}
                        <div className="mt-2 p-2 bg-blue-50 rounded flex justify-between items-center">
                            <span className="text-xs font-bold text-blue-900 uppercase">
                                Total Contract Surplus
                            </span>
                            <span className={`text-base font-bold ${runningTotalSurplus > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {runningTotalSurplus > 0 ? '+' : ''}{runningTotalSurplus.toFixed(1)}M
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // =========================================================================
    // MAIN APPLICATION COMPONENT
    // =========================================================================

    /**
     * Main NBA Salary Calculator application
     */
    const NBASalaryCalculator = () => {
        // Player data state
        const [playerData, setPlayerData] = useState([]);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState(null);

        // Comparisons state
        const [comparisons, setComparisons] = useState([{
            id: 1,
            selectedPlayer: null,
            games: 70,
            minutes: 30,
            improvement: 0,
            searchTerm: '',
            showDropdown: false
        }]);

        // Fetch player data on mount
        useEffect(() => {
            fetch('players.json')
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    setPlayerData(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error('Failed to load player data:', err);
                    setError(err.message);
                    setLoading(false);
                });
        }, []);

        // Add new comparison
        const addComparison = () => {
            setComparisons(prev => [...prev, {
                id: Date.now(),
                selectedPlayer: null,
                games: 70,
                minutes: 30,
                improvement: 0,
                searchTerm: '',
                showDropdown: false
            }]);
        };

        // Remove comparison
        const removeComparison = (id) => {
            if (comparisons.length > 1) {
                setComparisons(prev => prev.filter(c => c.id !== id));
            }
        };

        // Update comparison fields
        const updateComparison = (id, updates) => {
            setComparisons(prev => prev.map(c => 
                c.id === id ? { ...c, ...updates } : c
            ));
        };

        // Select player for comparison
        const selectPlayer = (id, player) => {
            updateComparison(id, {
                selectedPlayer: player,
                searchTerm: player.name,
                showDropdown: false
            });
        };

        // Loading state
        if (loading) {
            return <LoadingSpinner message="Loading player data..." />;
        }

        // Error state
        if (error) {
            return (
                <ErrorDisplay 
                    message={error}
                    hint={
                        <span>
                            Make sure <code className="bg-gray-200 px-1 rounded">players.json</code> is in the same directory.
                        </span>
                    }
                />
            );
        }

        return (
            <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h1 className="text-3xl font-bold text-gray-800 mb-2">
                        NBA Salary Model
                    </h1>
                    <p className="text-gray-600">
                        Calculate contract value based on{' '}
                        <a 
                            href="https://apanalytics.shinyapps.io/DARKO/" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-600 hover:text-blue-700 underline"
                        >
                            DARKO
                        </a>
                        {' '}and custom minutes projection.
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                        Salary model created by{' '}
                        <a 
                            href="https://bsky.app/profile/stephnoh.bsky.social" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-600 hover:text-blue-700 underline"
                        >
                            Steph Noh
                        </a>
                        . DARKO last updated 1/28/26. Methodology{' '}
                        <a 
                            href="https://github.com/StephenNoh/nbasalarymodel/blob/main/README.md" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-600 hover:text-blue-700 underline"
                        >
                            here
                        </a>.
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                        Loaded {playerData.length} players · 
                        Season {getSeasonProgressLabel()} complete · 
                        Position-specific aging curves enabled
                    </p>
                </div>

                {/* Player Cards */}
                <div className="player-grid">
                    {comparisons.map((comp, index) => (
                        <PlayerCard
                            key={comp.id}
                            comparison={comp}
                            index={index}
                            canRemove={comparisons.length > 1}
                            playerData={playerData}
                            onUpdate={updateComparison}
                            onRemove={removeComparison}
                            onSelectPlayer={selectPlayer}
                        />
                    ))}
                </div>

                {/* Add Player Button */}
                <div className="mt-6 text-center">
                    <button
                        onClick={addComparison}
                        className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium shadow-lg"
                    >
                        <PlusIcon size={20} />
                        Add Player Comparison
                    </button>
                </div>
            </div>
        );
    };

    // Export main component
    exports.NBASalaryCalculator = NBASalaryCalculator;

})(window.NBASalaryModel);
