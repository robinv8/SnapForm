// Background service worker for Chrome extension
import { GA4_MEASUREMENT_ID, GA4_API_SECRET } from "../config/analytics";
import { generateSmartFormData } from "../services/aiService";
import { saveFillHistory } from "../services/historyService";
import { FormFieldDefinition, FormData, FillMode } from "../types";

interface AnalyticsEvent {
    name: string;
    params: Record<string, string | number | boolean>;
}

const pendingEvents: AnalyticsEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

async function sendToGA4(clientId: string, events: AnalyticsEvent[]) {
    if (!GA4_API_SECRET || GA4_API_SECRET === "YOUR_API_SECRET_HERE") {
        console.warn("[SnapForm Analytics] GA4 API secret not configured. Skipping upload.");
        return;
    }

    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`;

    const payload = {
        client_id: clientId,
        events: events.map((e) => ({
            name: e.name,
            params: e.params,
        })),
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            body: JSON.stringify(payload),
            headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
            console.error("[SnapForm Analytics] GA4 upload failed:", response.status, await response.text());
        }
    } catch (err) {
        console.error("[SnapForm Analytics] Network error:", err);
    }
}

function scheduleFlush(clientId: string) {
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
        if (pendingEvents.length > 0) {
            const batch = pendingEvents.splice(0, pendingEvents.length);
            sendToGA4(clientId, batch);
        }
    }, 3000);
}

chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === "install") {
        chrome.storage.local.get("snapform_analytics_client_id").then((result) => {
            if (!result.snapform_analytics_client_id) {
                const newId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
                chrome.storage.local.set({ snapform_analytics_client_id: newId });
            }
        });
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "QUICK_FILL") {
        const tabId = sender.tab?.id;
        console.log("[SnapForm] Background received QUICK_FILL, tabId:", tabId);
        if (!tabId) {
            sendResponse({ success: false, error: "No active tab" });
            return true;
        }

        (async () => {
            try {
                const { fields, customPrompt } = message as { fields: FormFieldDefinition[]; customPrompt?: string };
                console.log("[SnapForm] Generating data for", fields.length, "fields");
                const result = await generateSmartFormData(fields, customPrompt);
                console.log("[SnapForm] Data generated, fallback:", result.fallback, "keys:", Object.keys(result.data));
                const data = result.data;
                const mode = result.fallback ? FillMode.STANDARD : FillMode.AI;

                const tab = await chrome.tabs.get(tabId);
                await saveFillHistory(
                    tab.url || "",
                    tab.title || "",
                    fields,
                    data,
                    mode
                );
                console.log("[SnapForm] History saved, sending FILL_FORM to tab", tabId);

                await chrome.tabs.sendMessage(tabId, {
                    type: "FILL_FORM",
                    data,
                });
                console.log("[SnapForm] FILL_FORM message sent successfully");

                sendResponse({ success: true });
            } catch (err) {
                const error = err instanceof Error ? err.message : String(err);
                console.error("[SnapForm] Quick fill failed:", error);
                sendResponse({ success: false, error });
            }
        })();

        return true;
    }

    if (message.type === "TRACK_EVENT") {
        const { payload } = message;
        if (payload && payload.name) {
            pendingEvents.push({
                name: payload.name,
                params: payload.params || {},
            });
            scheduleFlush(payload.clientId);
        }
        sendResponse({ ok: true });
        return true;
    }

    if (message.type === "FLUSH_ANALYTICS") {
        if (pendingEvents.length > 0) {
            chrome.storage.local.get("snapform_analytics_client_id").then((result) => {
                const clientId = result.snapform_analytics_client_id || "unknown";
                const batch = pendingEvents.splice(0, pendingEvents.length);
                sendToGA4(clientId, batch);
            });
        }
        sendResponse({ ok: true });
        return true;
    }

    return true;
});

export {};
