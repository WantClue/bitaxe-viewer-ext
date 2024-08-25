function formatHashRate(hashRate) {
    if (hashRate >= 1e3) return (hashRate / 1e3).toFixed(2) + ' TH/s'; 
    return hashRate.toFixed(2) + ' GH/s';
}

function getLocalIPAddress(callback) {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pc.createDataChannel("");
    pc.createOffer().then(offer => pc.setLocalDescription(offer));
    pc.onicecandidate = (event) => {
        if (event && event.candidate && event.candidate.candidate) {
            const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
            const match = ipRegex.exec(event.candidate.candidate);
            if (match) {
                const ip = match[1];
                if (isPrivateIP(ip)) {
                    pc.close();
                    callback(ip);
                }
            }
        }
    };
}

function isPrivateIP(ip) {
    const parts = ip.split('.');
    return (parts[0] === '10' || (parts[0] === '192' && parts[1] === '168'));
}

function getNetworkBaseAddress(ip) {
    return ip.split('.').slice(0, 3).join('.') + '.';
}

function displayResults(results) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    if (!results || results.length === 0) {
        resultsDiv.innerHTML = '<div class="error-message">No Bitaxe devices found.</div>';
    } else {
        // Use a Set to keep track of unique IPs
        const uniqueIPs = new Set();
        
        results.forEach(result => {
            if (!uniqueIPs.has(result.ip)) {
                uniqueIPs.add(result.ip);
                const resultElement = document.createElement('div');
                resultElement.className = 'result-item';
                resultElement.innerHTML = `
                    <span class="ip">IP: ${result.ip}</span>
                    <span class="hash-rate">HashRate: ${formatHashRate(result.hashRate)}</span>
                `;
                resultsDiv.appendChild(resultElement);
            }
        });
    }
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
                    hashRate: data.hashRate_1h !== undefined ? data.hashRate_1h : data.hashRate
                });
            }
        } catch (error) {
            console.error(`Failed to refresh data for ${endpoint.ip}:`, error);
        }
    }
    return refreshedResults;
}

document.addEventListener('DOMContentLoaded', function () {
    const scanButton = document.getElementById('scan-button');
    const resultsDiv = document.getElementById('results');
    const networkDisplay = document.getElementById('networkDisplay');

    let baseAddress = '';
    let currentResults = [];

    getLocalIPAddress((localIP) => {
        baseAddress = getNetworkBaseAddress(localIP);
        networkDisplay.textContent = `Local Network: ${baseAddress}*`;
    });

    // Load, refresh, and display stored endpoints
    chrome.storage.local.get(['storedEndpoints'], async function(result) {
        if (result.storedEndpoints && result.storedEndpoints.length > 0) {
            currentResults = result.storedEndpoints;
            displayResults(currentResults); // Display stored results immediately
            
            resultsDiv.innerHTML += '<div class="refreshing-message">Refreshing stored data...</div>';
            
            const refreshedResults = await refreshStoredData(result.storedEndpoints);
            if (refreshedResults.length > 0) {
                currentResults = refreshedResults;
                displayResults(currentResults);
                chrome.storage.local.set({ 'storedEndpoints': currentResults });
            }
            
            const refreshingMessage = document.querySelector('.refreshing-message');
            if (refreshingMessage) {
                refreshingMessage.remove();
            }
        } else {
            resultsDiv.innerHTML = '<div class="info-message">No stored data. Click "Scan" to search for Bitaxe devices.</div>';
        }
    });

    scanButton.addEventListener('click', () => {
        if (!baseAddress) {
            resultsDiv.innerHTML = '<div class="error-message">Error: Local network not detected. Please try reloading the extension.</div>';
            return;
        }

        resultsDiv.innerHTML = '<div class="scanning-message">Scanning...</div>';
        currentResults = []; // Reset current results before new scan

        chrome.runtime.sendMessage({ action: "scanNetwork", baseAddress: baseAddress }, (response) => {
            if (response && response.results) {
                currentResults = response.results;
                displayResults(currentResults);
                // Store the updated results
                chrome.storage.local.set({ 'storedEndpoints': currentResults });
            } else {
                resultsDiv.innerHTML = '<div class="error-message">Scan failed or returned no results.</div>';
            }
        });
    });

    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'partialResult') {
            // Check if this IP already exists in currentResults
            const existingIndex = currentResults.findIndex(item => item.ip === message.data.ip);
            if (existingIndex !== -1) {
                // Update existing entry
                currentResults[existingIndex] = message.data;
            } else {
                // Add new entry
                currentResults.push(message.data);
            }
            displayResults(currentResults);
        }
    });
});