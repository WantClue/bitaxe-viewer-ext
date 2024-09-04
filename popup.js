function formatHashRate(hashRate) {
    if (hashRate >= 1e3) return (hashRate / 1e3).toFixed(2) + ' TH/s'; 
    return hashRate.toFixed(2) + ' GH/s';
}

function formatPower(power) {
    if (power >= 1e0) return (power / 1e0).toFixed(2);
    return '0.00';
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
                let innerHTML = `<span class="ip">IP: ${result.ip}</span>`;
                
                if (result.hashRate !== undefined) {
                    innerHTML += `<span class="hash-rate">HashRate: ${formatHashRate(result.hashRate)}</span>`;
                }
                if (result.temp !== undefined) {
                    innerHTML += `<span class="temp">Temp: ${result.temp}°C</span>`;
                }
                if (result.power !== undefined) {
                    innerHTML += `<span class="power">Power: ${formatPower(result.power)}W</span>`;
                }
                if (result.bestDiff !== undefined) {
                    innerHTML += `<span class="best-diff">BD: ${result.bestDiff}</span>`;
                }
                
                resultElement.innerHTML = innerHTML;
                resultElement.style.cursor = 'pointer';
                resultElement.title = 'Click to open device interface';
                resultElement.addEventListener('click', () => {
                    chrome.tabs.create({ url: `http://${result.ip}` });
                });
                resultsDiv.appendChild(resultElement);
            }
        });
    }

    // Display aggregated hashrate after individual results
    displayAggregatedHashrate(results);
}

function parseDifficulty(diffString) {
    const units = {
        'k': 1e3,
        'M': 1e6,
        'G': 1e9,
        'T': 1e12,
        'P': 1e15
    };
    const match = diffString.match(/^(\d+(\.\d+)?)([kMGTP])?$/);
    if (match) {
        const value = parseFloat(match[1]);
        const unit = match[3] || '';
        return value * (units[unit] || 1);
    }
    return 0; // Return 0 if the string doesn't match the expected format
}

function formatDifficulty(value) {
    const units = ['', 'k', 'M', 'G', 'T', 'P'];
    let unitIndex = 0;
    while (value >= 1000 && unitIndex < units.length - 1) {
        value /= 1000;
        unitIndex++;
    }
    return value.toFixed(2) + units[unitIndex];
}

function displayAggregatedHashrate(results) {
    const aggregatedDiv = document.createElement('div');
    aggregatedDiv.id = 'aggregated-hashrate';
    aggregatedDiv.className = 'aggregated-info';

    if (!results || results.length === 0) {
        aggregatedDiv.innerHTML = '<div class="error-message">No Bitaxe devices found.</div>';
    } else {
        let totalHashRate = 0;
        let totalPower = 0;
        let deviceCount = 0;
        let overallBestDiff = 0;

        results.forEach(result => {
            if (result.hashRate !== undefined) {
                totalHashRate += result.hashRate;
                deviceCount++;
            }
            if (result.power !== undefined) {
                totalPower += parseFloat(result.power);
            }
            if (result.bestDiff !== undefined) {
                overallBestDiff = Math.max(overallBestDiff, parseDifficulty(result.bestDiff));
            }
        });

        aggregatedDiv.innerHTML = `
            <span class="total-hashrate">Total Hashrate: ${formatHashRate(totalHashRate)}</span>
            <span class="total-power">Total Power: ${formatPower(totalPower)}W</span>
            <span class="overall-best-diff">Overall Best Diff: ${formatDifficulty(overallBestDiff)}</span>
            <span class="device-count">Device Count: ${deviceCount}</span>
        `;
    }

    const resultsDiv = document.getElementById('results');
    resultsDiv.insertBefore(aggregatedDiv, resultsDiv.firstChild);
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
                    bestDiff: data.bestDiff,
                    totalHashRate: data.totalHashRate,
                    totalPower: data.totalPower,
                    overallBestDiff: data.overallBestDiff,
                    deviceCount: data.deviceCount
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

    document.getElementById('donate-button').addEventListener('click', function() {
        window.open('https://btcpay.wantclue.de/api/v1/invoices?storeId=8dWaktC9oEgPawxukqix4bZNQzmvPCkKczZbsxnj8AQo&orderId=donation&checkoutDesc=Thanks%20for%20helping%20me%20keep%20everything%20up%20to%20date&price=2&currency=EUR&defaultPaymentMethod=BTC_LightningLike', '_blank');
    });

    chrome.runtime.onMessage.addListener((message) => {
        if (message.type === 'partialResult') {
            // Check if this IP already exists in currentResults
            const existingIndex = currentResults.findIndex(item => item.ip === message.data.ip);
            if (existingIndex !== -1) {
                // Update existing entry
                currentResults[existingIndex] = {...currentResults[existingIndex], ...message.data};
            } else {
                // Add new entry
                currentResults.push(message.data);
            }
            displayResults(currentResults);
            chrome.storage.local.set({ 'storedEndpoints': currentResults }); // Update storage on each partial result
        }
    });
});