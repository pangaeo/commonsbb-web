/**
 * Player Detail Page JavaScript
 * Handles API fetching, dice calculations, and rendering
 */

(function() {
    'use strict';

    // API base URL
    const API_BASE_URL = 'https://api.commonsbb.com';

    // Parse URL query parameters
    function getQueryParams() {
        const params = new URLSearchParams(window.location.search);
        return {
            pid: params.get('pid'),
            y: params.get('y') ? parseInt(params.get('y'), 10) : null
        };
    }

    // Show loading state
    function showLoading() {
        document.getElementById('loading-state').style.display = 'block';
        document.getElementById('error-state').style.display = 'none';
        document.getElementById('player-content').style.display = 'none';
    }

    // Show error state and redirect
    function showError() {
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('error-state').style.display = 'block';
        document.getElementById('player-content').style.display = 'none';
        
        // Redirect after a short delay
        setTimeout(function() {
            window.location.href = 'index.html';
        }, 2000);
    }

    // Show player content
    function showPlayerContent() {
        document.getElementById('loading-state').style.display = 'none';
        document.getElementById('error-state').style.display = 'none';
        document.getElementById('player-content').style.display = 'block';
    }

    // Fetch player details
    async function fetchPlayerDetails(playerId) {
        try {
            const response = await fetch(`${API_BASE_URL}/players/${encodeURIComponent(playerId)}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching player details:', error);
            throw error;
        }
    }

    // Fetch player stats
    async function fetchPlayerStats(playerId, year) {
        try {
            const response = await fetch(`${API_BASE_URL}/players/${encodeURIComponent(playerId)}/stats/${year}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching player stats:', error);
            throw error;
        }
    }

    // Convert probability to base-6 4-digit representation
    // Matches commonsbb/src/utils/DiceSystem.ts implementation exactly
    function probabilityToBase6(probability) {
        if (probability <= 0) return [6, 6, 6, 6];
        if (probability >= 1) return [1, 1, 1, 1];
        
        // Convert probability to base-6 value (0-1295 range)
        const base6Value = Math.round(1295 - (1295 * probability));
        
        // Use roundedValue for consistency with correct implementation
        const roundedValue = Math.round(base6Value);
        
        if (roundedValue <= 0) return [6, 6, 6, 6];
        if (roundedValue >= 1295) return [1, 1, 1, 1];
        
        // Convert to 4-digit base-6 representation (matching base6ValueToDice)
        const digit4 = Math.floor(roundedValue / 216) + 1; // 6^3
        const digit3 = Math.floor((roundedValue % 216) / 36) + 1; // 6^2
        const digit2 = Math.floor((roundedValue % 36) / 6) + 1; // 6^1
        const digit1 = (roundedValue % 6) + 1; // 6^0
        
        return [digit4, digit3, digit2, digit1];
    }

    // Aggregate batting stats across all teams for a year
    function aggregateBattingStats(battingStatsArray) {
        if (!battingStatsArray || battingStatsArray.length === 0) {
            return null;
        }
        
        const aggregated = {
            AB: 0,
            H: 0,
            '2B': 0,
            '3B': 0,
            HR: 0,
            SB: 0
        };
        
        battingStatsArray.forEach(stat => {
            aggregated.AB += stat.AB || 0;
            aggregated.H += stat.H || 0;
            aggregated['2B'] += stat['2B'] || 0;
            aggregated['3B'] += stat['3B'] || 0;
            aggregated.HR += stat.HR || 0;
            aggregated.SB += stat.SB || 0;
        });
        
        return aggregated;
    }

    // Calculate batting thresholds
    function calculateBattingThresholds(stats) {
        const { AB, H, '2B': doubles = 0, '3B': triples = 0, HR = 0, SB = 0 } = stats;
        
        if (!AB || AB === 0) {
            return null;
        }
        
        const singleProb = H / AB;
        const doubleProb = (doubles + triples + HR) / AB;
        const tripleProb = (triples + HR) / AB;
        const homeRunProb = HR / AB;
        const outProb = (AB - H) / AB;
        
        // Stolen base probability
        const firstBaseOpportunities = (H * 1.1) - (doubles + triples + HR);
        const stolenBaseProb = firstBaseOpportunities > 0 ? Math.min((SB / firstBaseOpportunities) + 0.3, 1) : 0;
        
        return {
            out: probabilityToBase6(outProb),
            single: probabilityToBase6(singleProb),
            double: probabilityToBase6(doubleProb),
            triple: probabilityToBase6(tripleProb),
            homeRun: probabilityToBase6(homeRunProb),
            stolenBase: probabilityToBase6(stolenBaseProb)
        };
    }

    // Convert numeric threshold (0-1295) to base-6 4-digit representation
    // This matches the API's dice-system.ts implementation
    function numericThresholdToBase6(numericThreshold) {
        // Clamp to valid range
        const threshold = Math.max(0, Math.min(1295, Math.round(numericThreshold)));
        
        if (threshold <= 0) return [6, 6, 6, 6];
        if (threshold >= 1295) return [1, 1, 1, 1];
        
        // Convert numeric threshold directly to base-6 digits
        const digit4 = Math.floor(threshold / 216) + 1;
        const digit3 = Math.floor((threshold % 216) / 36) + 1;
        const digit2 = Math.floor((threshold % 36) / 6) + 1;
        const digit1 = (threshold % 6) + 1;
        
        return [digit4, digit3, digit2, digit1];
    }

    // Aggregate pitching stats across all teams for a year
    // This correctly calculates ERA by summing ER and IPouts, then calculating ERA = (total ER / total IP) * 9
    function aggregatePitchingStats(pitchingStatsArray) {
        if (!pitchingStatsArray || pitchingStatsArray.length === 0) {
            return null;
        }
        
        const aggregated = {
            IPouts: 0,
            ER: 0,
            BB: 0,
            H: 0
        };
        
        pitchingStatsArray.forEach(stat => {
            aggregated.IPouts += stat.IPouts || 0;
            aggregated.ER += stat.ER || 0;
            aggregated.BB += stat.BB || 0;
            aggregated.H += stat.H || 0;
        });
        
        // Calculate ERA correctly: (total ER / total IP) * 9 (ERA is runs per 9 innings)
        const inningsPitched = aggregated.IPouts / 3;
        aggregated.ERA = inningsPitched > 0 ? (aggregated.ER / inningsPitched) * 9 : 0;
        
        return aggregated;
    }

    // Calculate pitching thresholds
    function calculatePitchingThresholds(stats, pitcherHandedness) {
        const { IPouts, ER, BB, ERA } = stats;
        
        if (!IPouts || IPouts === 0) {
            return null;
        }
        
        const inningsPitched = IPouts / 3;
        // Use ERA from stats if available, otherwise calculate it
        // For aggregated stats, ERA should already be calculated correctly
        const era = ERA !== undefined && ERA !== null ? ERA : (ER / inningsPitched);
        
        // Calculate RH advantage
        const rhBase = pitcherHandedness === 'R' ? 4.15 : 3.85;
        const rhAdvantage = rhBase - era;
        const rhAction = rhAdvantage > 0 ? 'out' : 'hit';
        const rhHeader = rhAdvantage >= 0 ? 'OUT/RH' : 'HIT/RH';
        
        // Convert advantage to raw value (multiply by 100) for dice calculation
        const rhRawValue = Math.abs(rhAdvantage) * 100;
        
        // Calculate LH advantage
        const lhBase = pitcherHandedness === 'L' ? 4.15 : 3.85;
        const lhAdvantage = lhBase - era;
        const lhAction = lhAdvantage > 0 ? 'out' : 'hit';
        const lhHeader = lhAdvantage >= 0 ? 'OUT/LH' : 'HIT/LH';
        
        const lhRawValue = Math.abs(lhAdvantage) * 100;
        
        // Calculate BB threshold using Excel formula logic
        // Z3 = 1000 - ROUND(V3/(U3*5), 3) * 1000
        const z3 = 1000 - (Math.round((BB / (inningsPitched * 5)) * 1000) / 1000) * 1000;
        
        // Convert raw values to 4-digit base-6 dice thresholds
        // Use probabilityToBase6 directly (same as correct implementation in commonsbb)
        // Treat the raw values as probabilities (divide by 1000 to get 0-1 range)
        const rhThreshold = probabilityToBase6(rhRawValue / 1000);
        const lhThreshold = probabilityToBase6(lhRawValue / 1000);
        const bbThreshold = probabilityToBase6(z3 / 1000);
        
        // Convert numeric thresholds to base-6 digits for display
        return {
            rhHeader: rhHeader,
            rhThreshold: rhThreshold, // probabilityToBase6 already returns an array
            lhHeader: lhHeader,
            lhThreshold: lhThreshold, // probabilityToBase6 already returns an array
            bbThreshold: bbThreshold // probabilityToBase6 already returns an array
        };
    }

    // Render dice face
    function renderDiceFace(value) {
        const diceIcons = {
            1: 'dice-one',
            2: 'dice-two',
            3: 'dice-three',
            4: 'dice-four',
            5: 'dice-five',
            6: 'dice-six'
        };
        return `<i class="fas fa-${diceIcons[value]} dice-face"></i>`;
    }

    // Render dice column
    function renderDiceColumn(threshold, label) {
        if (!threshold) return '';
        
        const diceFaces = threshold.map(renderDiceFace).join('');
        return `
            <div class="dice-column">
                <div class="dice-header">${label}</div>
                <div class="dice-stack">${diceFaces}</div>
            </div>
        `;
    }

    // Render batting dice grid
    function renderBattingDiceGrid(thresholds) {
        if (!thresholds) return '';
        
        return `
            <div class="dice-grid">
                <div class="dice-grid-title">Batting</div>
                <div class="dice-grid-content">
                    ${renderDiceColumn(thresholds.single, '1B')}
                    ${renderDiceColumn(thresholds.double, '2B')}
                    ${renderDiceColumn(thresholds.triple, '3B')}
                    ${renderDiceColumn(thresholds.homeRun, 'HR')}
                    ${renderDiceColumn(thresholds.stolenBase, 'SB')}
                </div>
            </div>
        `;
    }

    // Render pitching dice grid
    function renderPitchingDiceGrid(thresholds) {
        if (!thresholds) return '';
        
        return `
            <div class="dice-grid">
                <div class="dice-grid-title">Pitching</div>
                <div class="dice-grid-content">
                    ${renderDiceColumn(thresholds.rhThreshold, thresholds.rhHeader)}
                    ${renderDiceColumn(thresholds.lhThreshold, thresholds.lhHeader)}
                    ${renderDiceColumn(thresholds.bbThreshold, 'BB')}
                </div>
            </div>
        `;
    }

    // Render batting stats table
    function renderBattingStats(battingStats) {
        if (!battingStats || battingStats.length === 0) return '';
        
        let html = '';
        
        battingStats.forEach((stats, index) => {
            const teamLabel = battingStats.length > 1 ? ` (${stats.team})` : '';
            html += `
                <div class="stats-table-container">
                    <h3>${stats.year}${teamLabel}</h3>
                    <table class="stats-table">
                        <thead>
                            <tr>
                                <th>G</th>
                                <th>AB</th>
                                <th>H</th>
                                <th>2B</th>
                                <th>3B</th>
                                <th>HR</th>
                                ${stats.SB !== undefined ? '<th>SB</th>' : ''}
                                <th>AVG</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>${stats.G || 0}</td>
                                <td>${stats.AB || 0}</td>
                                <td>${stats.H || 0}</td>
                                <td>${stats['2B'] || 0}</td>
                                <td>${stats['3B'] || 0}</td>
                                <td>${stats.HR || 0}</td>
                                ${stats.SB !== undefined ? `<td>${stats.SB}</td>` : ''}
                                <td>${stats.AB > 0 ? (stats.H / stats.AB).toFixed(3) : '.000'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
        });
        
        return html;
    }

    // Render pitching stats table
    function renderPitchingStats(pitchingStats) {
        if (!pitchingStats || pitchingStats.length === 0) return '';
        
        let html = '';
        
        pitchingStats.forEach((stats, index) => {
            const teamLabel = pitchingStats.length > 1 ? ` (${stats.team})` : '';
            const inningsPitched = (stats.IPouts / 3).toFixed(1);
            html += `
                <div class="stats-table-container">
                    <h3>${stats.year}${teamLabel}</h3>
                    <table class="stats-table">
                        <thead>
                            <tr>
                                <th>G</th>
                                <th>IP</th>
                                <th>H</th>
                                <th>ER</th>
                                <th>BB</th>
                                <th>ERA</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>${stats.G || 0}</td>
                                <td>${inningsPitched}</td>
                                <td>${stats.H || 0}</td>
                                <td>${stats.ER || 0}</td>
                                <td>${stats.BB || 0}</td>
                                <td>${stats.ERA ? stats.ERA.toFixed(2) : '0.00'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            `;
        });
        
        return html;
    }

    // Render player bio
    function renderPlayerBio(playerDetails) {
        if (!playerDetails) return '';
        
        const bio = [];
        
        if (playerDetails.nameFirst || playerDetails.nameLast) {
            bio.push({
                label: 'Name',
                value: `${playerDetails.nameFirst || ''} ${playerDetails.nameLast || ''}`.trim()
            });
        }
        
        if (playerDetails.birthyear) {
            bio.push({
                label: 'Born',
                value: playerDetails.birthyear.toString()
            });
        }
        
        if (playerDetails.birthCity || playerDetails.birthState || playerDetails.birthCountry) {
            const location = [playerDetails.birthCity, playerDetails.birthState, playerDetails.birthCountry]
                .filter(Boolean)
                .join(', ');
            bio.push({
                label: 'Birthplace',
                value: location
            });
        }
        
        if (playerDetails.bats) {
            const batsLabel = {
                'R': 'Right',
                'L': 'Left',
                'B': 'Both'
            }[playerDetails.bats] || playerDetails.bats;
            bio.push({
                label: 'Bats',
                value: batsLabel
            });
        }
        
        if (playerDetails.throws) {
            const throwsLabel = {
                'R': 'Right',
                'L': 'Left'
            }[playerDetails.throws] || playerDetails.throws;
            bio.push({
                label: 'Throws',
                value: throwsLabel
            });
        }
        
        if (bio.length === 0) return '';
        
        return bio.map(item => `
            <div class="bio-item">
                <span class="bio-label">${item.label}:</span>
                <span class="bio-value">${item.value}</span>
            </div>
        `).join('');
    }

    // Main initialization
    async function init() {
        const params = getQueryParams();
        
        if (!params.pid || !params.y) {
            showError();
            return;
        }
        
        showLoading();
        
        try {
            // Fetch player details and stats in parallel
            const [playerDetails, playerStats] = await Promise.all([
                fetchPlayerDetails(params.pid),
                fetchPlayerStats(params.pid, params.y)
            ]);
            
            // Check if we have valid data
            if (!playerDetails || !playerStats) {
                showError();
                return;
            }
            
            // Check if stats exist for the requested year
            if (playerStats.year !== params.y || 
                (!playerStats.batting || playerStats.batting.length === 0) && 
                (!playerStats.pitching || playerStats.pitching.length === 0)) {
                showError();
                return;
            }
            
            // Render player header
            const playerName = playerDetails.nameFirst && playerDetails.nameLast 
                ? `${playerDetails.nameFirst} ${playerDetails.nameLast}`
                : params.pid;
            document.getElementById('player-name').textContent = playerName;
            
            const teams = [];
            if (playerStats.batting && playerStats.batting.length > 0) {
                const battingTeams = [...new Set(playerStats.batting.map(s => s.team))];
                teams.push(...battingTeams);
            }
            if (playerStats.pitching && playerStats.pitching.length > 0) {
                const pitchingTeams = [...new Set(playerStats.pitching.map(s => s.team))];
                teams.push(...pitchingTeams);
            }
            const uniqueTeams = [...new Set(teams)];
            const teamsText = uniqueTeams.length > 0 ? uniqueTeams.join(', ') : '';
            document.getElementById('player-year-teams').textContent = `${params.y}${teamsText ? ' • ' + teamsText : ''}`;
            
            // Render player bio
            const bioHtml = renderPlayerBio(playerDetails);
            if (bioHtml) {
                document.getElementById('bio-content').innerHTML = bioHtml;
                document.getElementById('player-bio').style.display = 'block';
            }
            
            // Render batting stats
            if (playerStats.batting && playerStats.batting.length > 0) {
                const battingHtml = renderBattingStats(playerStats.batting);
                document.getElementById('batting-stats').innerHTML = battingHtml;
                document.getElementById('batting-section').style.display = 'block';
            }
            
            // Render pitching stats
            if (playerStats.pitching && playerStats.pitching.length > 0) {
                const pitchingHtml = renderPitchingStats(playerStats.pitching);
                document.getElementById('pitching-stats').innerHTML = pitchingHtml;
                document.getElementById('pitching-section').style.display = 'block';
            }
            
            // Calculate and render dice probabilities (aggregated across all teams)
            // Clear any existing dice content first
            const diceContentEl = document.getElementById('dice-content');
            diceContentEl.innerHTML = '';
            const diceHtml = [];
            
            // Batting dice grid (aggregated across all teams) - only one grid regardless of team count
            if (playerStats.batting && playerStats.batting.length > 0) {
                const aggregatedBatting = aggregateBattingStats(playerStats.batting);
                if (aggregatedBatting && aggregatedBatting.AB > 0) {
                    const thresholds = calculateBattingThresholds(aggregatedBatting);
                    if (thresholds) {
                        diceHtml.push(`
                            <div class="dice-grid-wrapper">
                                <h3>${params.y}</h3>
                                ${renderBattingDiceGrid(thresholds)}
                            </div>
                        `);
                    }
                }
            }
            
            // Pitching dice grid (aggregated across all teams) - only one grid regardless of team count
            // Ensure we only create one pitching grid even if there are multiple team entries
            if (playerStats.pitching && playerStats.pitching.length > 0) {
                const pitcherHandedness = playerDetails.throws || 'R';
                const aggregatedPitching = aggregatePitchingStats(playerStats.pitching);
                if (aggregatedPitching && aggregatedPitching.IPouts > 0) {
                    const thresholds = calculatePitchingThresholds(aggregatedPitching, pitcherHandedness);
                    if (thresholds) {
                        // Only add one pitching grid - aggregated across all teams
                        diceHtml.push(`
                            <div class="dice-grid-wrapper">
                                <h3>${params.y}</h3>
                                ${renderPitchingDiceGrid(thresholds)}
                            </div>
                        `);
                    }
                }
            }
            
            // Set dice content (should be at most one batting grid and one pitching grid)
            if (diceHtml.length > 0) {
                diceContentEl.innerHTML = diceHtml.join('');
                document.getElementById('dice-section').style.display = 'block';
            } else {
                document.getElementById('dice-section').style.display = 'none';
            }
            
            showPlayerContent();
            
        } catch (error) {
            console.error('Error loading player data:', error);
            showError();
        }
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

