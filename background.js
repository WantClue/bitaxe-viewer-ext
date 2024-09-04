async function fetchData(ip) {
    try {
        const response = await fetch(`http://${ip}/api/system/info`, { timeout: 1000 });
        if (response.ok) {
            const data = await response.json();
            const result = { ip };

            if (data.hashRate_1h !== undefined) {
                result.hashRate = data.hashRate_1h;
            } else if (data.hashRate !== undefined) {
                result.hashRate = data.hashRate;
            }

            if (data.temp !== undefined) {
                result.temp = data.temp;
            }

            if (data.power !== undefined) {
                result.power = data.power;
            }

            if (data.bestDiff !== undefined) {
                result.bestDiff = data.bestDiff;
            }

            if (Object.keys(result).length > 1) {  // More than just IP
                chrome.runtime.sendMessage({
                    type: 'partialResult', 
                    data: result
                });
                return result;
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
        promises.push(fetchData(ip));
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