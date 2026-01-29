/**
 * NBA Salary Model - React Components
 * 
 * Reusable React components for the UI.
 * Depends on: React (loaded via CDN)
 */

(function(exports) {
    'use strict';

    // =========================================================================
    // ICON COMPONENTS
    // =========================================================================

    /**
     * Search icon (magnifying glass)
     */
    exports.SearchIcon = ({ size = 20 }) => (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
        </svg>
    );

    /**
     * Plus icon (add button)
     */
    exports.PlusIcon = ({ size = 20 }) => (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
    );

    /**
     * Trash icon (delete button)
     */
    exports.TrashIcon = ({ size = 20 }) => (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
        >
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
    );

    // =========================================================================
    // LOADING COMPONENT
    // =========================================================================

    /**
     * Loading spinner with message
     */
    exports.LoadingSpinner = ({ message = "Loading..." }) => (
        <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen flex flex-col items-center justify-center">
            <div className="loading-spinner mb-4"></div>
            <p className="text-gray-600">{message}</p>
        </div>
    );

    // =========================================================================
    // ERROR COMPONENT
    // =========================================================================

    /**
     * Error display with message
     */
    exports.ErrorDisplay = ({ message, hint }) => (
        <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen flex flex-col items-center justify-center">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                <strong>Error:</strong> {message}
            </div>
            {hint && (
                <p className="mt-4 text-gray-600">{hint}</p>
            )}
        </div>
    );

    // =========================================================================
    // PLAYER SEARCH DROPDOWN
    // =========================================================================

    /**
     * Player search input with dropdown results
     */
    exports.PlayerSearch = ({ 
        searchTerm, 
        onSearchChange, 
        onFocus,
        showDropdown,
        filteredPlayers,
        onSelectPlayer,
        positionLabels
    }) => {
        const { SearchIcon } = exports;
        
        return (
            <div className="mb-4 relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Player Name
                </label>
                <div className="relative">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onFocus={onFocus}
                        placeholder="Start typing player name..."
                        className="w-full p-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="absolute left-3 top-2.5 text-gray-400">
                        <SearchIcon size={20} />
                    </div>
                </div>
                
                {showDropdown && searchTerm && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredPlayers.length > 0 ? (
                            filteredPlayers.map((player, idx) => (
                                <button
                                    key={`${player.id}-${idx}`}
                                    onClick={() => onSelectPlayer(player)}
                                    className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-100"
                                >
                                    <div className="font-medium">{player.name}</div>
                                    <div className="text-sm text-gray-500">
                                        {positionLabels[player.pos] || player.pos} · DARKO: {player.darko}
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-2 text-gray-500">No players found</div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // =========================================================================
    // SLIDER INPUT COMPONENT
    // =========================================================================

    /**
     * Range slider with label
     */
    exports.SliderInput = ({ 
        label, 
        value, 
        onChange, 
        min, 
        max, 
        step = 1,
        displayValue 
    }) => (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label}: {displayValue !== undefined ? displayValue : value}
            </label>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(step === 1 ? parseInt(e.target.value) : parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
        </div>
    );

})(window.NBASalaryModel);
