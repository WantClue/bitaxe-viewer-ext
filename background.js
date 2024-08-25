async function fetchHashRate(ip) {
    try {
        const response = await fetch(`http://${ip}/api/system/info`, { timeout: 1000 });
        if (response.ok) {
            const data = await response.json();
            if (data.hashRate_1h !== undefined) {
                chrome.runtime.sendMessage({
                    type: 'partialResult', 
                    data: { ip, hashRate: data.hashRate_1h }
                });
                return { ip, hashRate: data.hashRate_1h };
            } else if (data.hashRate !== undefined) {
                chrome.runtime.sendMessage({
                    type: 'partialResult', 
                    data: { ip, hashRate: data.hashRate }
                });
                return { ip, hashRate: data.hashRate };
            }
        }
    } catch (error) {
        // Error handling is silent
    }
    return null;
}

async function scanNetwork(baseAddress) {
    const results = [];
    const promises = [];

    for (let i = 1; i <= 255; i++) {
        const ip = `${baseAddress}${i}`;
        promises.push(fetchHashRate(ip));
    }

    const responses = await Promise.all(promises);
    responses.forEach((result) => {
        if (result) {
            results.push(result);
        }
    });

    return results;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "scanNetwork") {
        scanNetwork(request.baseAddress).then((results) => {
            sendResponse({ results });
        });
        return true; // Will respond asynchronously
    }
});