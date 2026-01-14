import React, { useState, useEffect } from "react";
import { Sparkles, Save, AlertCircle, CheckCircle2 } from "lucide-react";

const Options: React.FC = () => {
  const [apiKey, setApiKey] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );

  // Load API key on mount
  useEffect(() => {
    chrome.storage.sync.get(["geminiApiKey"], (result) => {
      if (result.geminiApiKey) {
        setApiKey(result.geminiApiKey);
      }
    });
  }, []);

  const handleSave = () => {
    setStatus("saving");

    chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
      if (chrome.runtime.lastError) {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 3000);
      }
    });
  };

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          {/* Header */}
          <div className="bg-primary px-6 py-5 text-white">
            <div className="flex items-center space-x-3">
              <Sparkles size={24} />
              <h1 className="text-2xl font-bold">FormFiller Pro Settings</h1>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* API Key Section */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                Google Gemini API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your Gemini API key"
                className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              />
              <p className="mt-2 text-sm text-neutral-500">
                Get your API key from{" "}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google AI Studio
                </a>
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertCircle
                  className="text-blue-600 mt-0.5 shrink-0"
                  size={20}
                />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">About AI Smart Fill</p>
                  <p>
                    The AI mode uses Google's Gemini 3 Flash to generate
                    intelligent, context-aware test data. Your API key is stored
                    securely in your browser and synced across your Chrome
                    browsers.
                  </p>
                  <p className="mt-2">
                    Standard mode works without an API key using built-in
                    heuristics.
                  </p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-4">
              <button
                onClick={handleSave}
                disabled={status === "saving"}
                className="flex items-center space-x-2 px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={18} />
                <span>
                  {status === "saving" ? "Saving..." : "Save Settings"}
                </span>
              </button>

              {/* Status Indicator */}
              {status === "saved" && (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle2 size={18} />
                  <span className="text-sm font-medium">Settings saved!</span>
                </div>
              )}
              {status === "error" && (
                <div className="flex items-center space-x-2 text-red-600">
                  <AlertCircle size={18} />
                  <span className="text-sm font-medium">Failed to save</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-neutral-500">
          FormFiller Pro v1.0.0
        </div>
      </div>
    </div>
  );
};

export default Options;
