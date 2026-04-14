let cachedClientId: string | null = null;

async function getClientId(): Promise<string> {
    if (cachedClientId) return cachedClientId;
    const result = await chrome.storage.local.get("snapform_analytics_client_id");
    if (result.snapform_analytics_client_id) {
        cachedClientId = result.snapform_analytics_client_id;
        return cachedClientId;
    }
    const newId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
    await chrome.storage.local.set({ snapform_analytics_client_id: newId });
    cachedClientId = newId;
    return newId;
}

export async function trackEvent(eventName: string, params?: Record<string, string | number | boolean>) {
    try {
        const clientId = await getClientId();
        await chrome.runtime.sendMessage({
            type: "TRACK_EVENT",
            payload: {
                name: eventName,
                params: {
                    ...params,
                    extension_version: chrome.runtime.getManifest().version,
                },
                clientId,
            },
        });
    } catch {
        // Silent fail to avoid impacting user experience
    }
}

export async function flushAnalytics() {
    try {
        await chrome.runtime.sendMessage({ type: "FLUSH_ANALYTICS" });
    } catch {
        // Silent fail
    }
}
