/**
 * Player Detail Page JavaScript
 * Handles API fetching and rendering
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
        
        const rhHeader = thresholds.rhAction === 'out' ? 'OUT/RH' : 'HIT/RH';
        const lhHeader = thresholds.lhAction === 'out' ? 'OUT/LH' : 'HIT/LH';
        
        return `
            <div class="dice-grid">
                <div class="dice-grid-title">Pitching</div>
                <div class="dice-grid-content">
                    ${renderDiceColumn(thresholds.rh, rhHeader)}
                    ${renderDiceColumn(thresholds.lh, lhHeader)}
                    ${renderDiceColumn(thresholds.walk, 'BB')}
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
            
            // Render dice probabilities from API thresholds
            // Clear any existing dice content first
            const diceContentEl = document.getElementById('dice-content');
            diceContentEl.innerHTML = '';
            const diceHtml = [];
            
            // Batting dice grid - use thresholds from API
            if (playerStats.thresholds && playerStats.thresholds.batting) {
                diceHtml.push(`
                    <div class="dice-grid-wrapper">
                        <h3>${params.y}</h3>
                        ${renderBattingDiceGrid(playerStats.thresholds.batting)}
                    </div>
                `);
            }
            
            // Pitching dice grid - use thresholds from API
            if (playerStats.thresholds && playerStats.thresholds.pitching) {
                diceHtml.push(`
                    <div class="dice-grid-wrapper">
                        <h3>${params.y}</h3>
                        ${renderPitchingDiceGrid(playerStats.thresholds.pitching)}
                    </div>
                `);
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

