function formatHashRate(hashRate) {
    if (hashRate >= 1e3) return (hashRate / 1e3).toFixed(2) + ' TH/s'; 
    return hashRate.toFixed(2) + ' GH/s';
}

function formatPower(power) {
    if (power >= 1e0) return (power / 1e0).toFixed(2);
    return '0.00';
}

function displayResults(results) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    if (!results || results.length === 0) {
        resultsDiv.innerHTML = '<div class="error-message">No Bitaxe devices found.</div>';
    } else {
        results.forEach(result => {
            const resultElement = document.createElement('div');
            resultElement.className = 'result-item';
            resultElement.innerHTML = `
                <span class="ip">IP: ${result.ip}</span>
                <span class="hash-rate">HashRate: ${formatHashRate(result.hashRate)}</span>
                <span class="temp">Temp: ${result.temp}°C</span>
                <span class="power">Power: ${formatPower(result.power)}W</span>
                <span class="best-diff">BD: ${result.bestDiff}</span>
            `;
            resultsDiv.appendChild(resultElement);
        });
    }
}

function getNetworkBaseAddress(ip) {
    return ip.split('.').slice(0, 3).join('.') + '.';
}

function isValidIP(ip) {
    const parts = ip.split('.');
    if (parts.length !== 4) return false;
    for (let part of parts) {
        if (isNaN(part) || part < 0 || part > 255) return false;
    }
    return true;
}

async function refreshStoredData(storedEndpoints) {
    const refreshedResults = [];
    for (const endpoint of storedEndpoints) {
        try {
            const response = await fetch(`http://${endpoint.ip}/api/system/info`, { timeout: 2000 });
            if (response.ok) {
                const data = await response.json();
                refreshedResults.push({
                    ip: endpoint.ip,
                    hashRate: data.hashRate_1h !== undefined ? data.hashRate_1h : data.hashRate,
                    temp: data.temp,
                    power: data.power,
                    bestDiff: data.bestDiff
                });
            }
        } catch (error) {
            console.error(`Failed to refresh data for ${endpoint.ip}:`, error);
        }
    }
    return refreshedResults;
}

async function loadAndRefreshStoredEndpoints() {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '<div class="refreshing-message">Loading and refreshing data...</div>';

    try {
        const result = await browser.storage.local.get(['storedEndpoints']);
        if (result.storedEndpoints && result.storedEndpoints.length > 0) {
            const refreshedResults = await refreshStoredData(result.storedEndpoints);
            if (refreshedResults.length > 0) {
                displayResults(refreshedResults);
                await browser.storage.local.set({ 'storedEndpoints': refreshedResults });
            } else {
                resultsDiv.innerHTML = '<div class="error-message">Failed to refresh data. Please try scanning again.</div>';
            }
        } else {
            resultsDiv.innerHTML = '<div class="info-message">No stored data. Click "Scan" to search for Bitaxe devices.</div>';
        }
    } catch (error) {
        console.error('Error loading or refreshing stored endpoints:', error);
        resultsDiv.innerHTML = '<div class="error-message">An error occurred while loading data. Please try again.</div>';
    }
}

document.addEventListener('DOMContentLoaded', function () {
    const ipInput = document.getElementById('ip-input');
    const saveIpButton = document.getElementById('save-ip');
    const scanButton = document.getElementById('scan-button');
    const refreshButton = document.getElementById('refresh-button');
    const resultsDiv = document.getElementById('results');
    const ipDisplay = document.getElementById('ip-display');

    // Load saved IP
    browser.storage.local.get(['savedIP'], function(result) {
        if (result.savedIP) {
            ipInput.value = result.savedIP;
            ipDisplay.textContent = `Current IP: ${result.savedIP}`;
        }
    });

    // Load and refresh stored endpoints on popup open
    loadAndRefreshStoredEndpoints();

    saveIpButton.addEventListener('click', () => {
        const ip = ipInput.value.trim();
        if (isValidIP(ip)) {
            browser.storage.local.set({ 'savedIP': ip });
            ipDisplay.textContent = `Current IP: ${ip}`;
        } else {
            alert('Please enter a valid IP address');
        }
    });

    scanButton.addEventListener('click', () => {
        browser.storage.local.get(['savedIP'], function(result) {
            if (!result.savedIP) {
                alert('Please save a valid IP address first');
                return;
            }

            const baseAddress = getNetworkBaseAddress(result.savedIP);
            resultsDiv.innerHTML = '<div class="scanning-message">Scanning...</div>';

            browser.runtime.sendMessage({ action: "scanNetwork", baseAddress: baseAddress })
                .then((response) => {
                    if (response && response.results) {
                        displayResults(response.results);
                        browser.storage.local.set({ 'storedEndpoints': response.results });
                    } else {
                        resultsDiv.innerHTML = '<div class="error-message">Scan failed or returned no results.</div>';
                    }
                })
                .catch((error) => {
                    console.error('Error during scan:', error);
                    resultsDiv.innerHTML = '<div class="error-message">An error occurred during the scan. Please try again.</div>';
                });
        });
    });

    refreshButton.addEventListener('click', loadAndRefreshStoredEndpoints);
});