import React, { useState, useEffect } from "react";
import {
  Save,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Info,
  Eye,
  EyeOff,
} from "lucide-react";
import { AIProvider, AIProviderConfig, AI_PROVIDER_DEFAULTS } from "../types";
import { getAIConfig, saveAIConfig } from "../services/aiService";
import { t } from "../i18n";

const PROVIDERS: AIProvider[] = ["gemini", "openai", "deepseek", "custom"];

const Options: React.FC = () => {
  const [provider, setProvider] = useState<AIProvider>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    getAIConfig().then((config) => {
      if (config) {
        setProvider(config.provider);
        setApiKey(config.apiKey);
        setModel(config.model);
        setBaseUrl(config.baseUrl || "");

        const defaults = AI_PROVIDER_DEFAULTS[config.provider];
        if (defaults.models.length > 0 && !defaults.models.includes(config.model)) {
          setCustomModel(config.model);
          setModel("__custom__");
        }
      }
    });
  }, []);

  const providerDefaults = AI_PROVIDER_DEFAULTS[provider];

  const handleProviderChange = (p: AIProvider) => {
    setProvider(p);
    setApiKey("");
    setShowKey(false);
    const defaults = AI_PROVIDER_DEFAULTS[p];
    setModel(defaults.models[0] || "");
    setBaseUrl(defaults.baseUrl || "");
    setCustomModel("");
  };

  const handleSave = async () => {
    setStatus("saving");
    try {
      const finalModel = model === "__custom__" ? customModel : model;
      const config: AIProviderConfig = {
        provider,
        apiKey,
        model: finalModel,
        baseUrl: provider === "custom" ? baseUrl : undefined,
      };
      await saveAIConfig(config);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const canSave = apiKey.trim() && (model || customModel) && (provider !== "custom" || baseUrl.trim());

  return (
    <div className="min-h-screen bg-neutral-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          {/* Header */}
          <div className="bg-primary px-6 py-5 text-white">
            <h1 className="text-2xl font-bold">{t('settingsTitle')}</h1>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Provider Selection */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-3">
                {t('aiProvider')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PROVIDERS.map((p) => {
                  const info = AI_PROVIDER_DEFAULTS[p];
                  const isActive = provider === p;
                  return (
                    <button
                      key={p}
                      onClick={() => handleProviderChange(p)}
                      className={`px-4 py-3 rounded-lg border-2 text-left transition-all ${
                        isActive
                          ? "border-primary bg-orange-50 text-primary"
                          : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
                      }`}
                    >
                      <div className="font-medium text-sm">{info.name}</div>
                      {info.models.length > 0 && (
                        <div className="text-[11px] text-neutral-400 mt-0.5">
                          {info.models[0]}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                {t('apiKey')}
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={t('apiKeyPlaceholder', { provider: providerDefaults.name })}
                  className="w-full px-4 py-3 pr-12 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-primary outline-none transition-all"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {providerDefaults.keyUrl && (
                <p className="mt-2 text-sm text-neutral-500">
                  <a
                    href={providerDefaults.keyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {t('getApiKey')}
                    <ExternalLink size={12} />
                  </a>
                </p>
              )}
            </div>

            {/* Model Selection */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                {t('model')}
              </label>
              {providerDefaults.models.length > 0 ? (
                <>
                  <select
                    value={model}
                    onChange={(e) => {
                      setModel(e.target.value);
                      if (e.target.value !== "__custom__") setCustomModel("");
                    }}
                    className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-primary outline-none transition-all bg-white"
                  >
                    {providerDefaults.models.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                    <option value="__custom__">{t('customModel')}</option>
                  </select>
                  {model === "__custom__" && (
                    <input
                      type="text"
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                      placeholder={t('customModelPlaceholder')}
                      className="w-full mt-2 px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-primary outline-none transition-all"
                    />
                  )}
                </>
              ) : (
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={t('modelPlaceholder')}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-primary outline-none transition-all"
                />
              )}
            </div>

            {/* Custom Base URL */}
            {provider === "custom" && (
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">
                  {t('apiUrl')}
                </label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={t('apiUrlPlaceholder')}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-primary outline-none transition-all"
                />
                <p className="mt-2 text-xs text-neutral-500">
                  {t('apiUrlHint')}
                </p>
              </div>
            )}

            {/* Info */}
            <div className="bg-neutral-100 border border-neutral-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Info className="text-neutral-500 mt-0.5 shrink-0" size={20} />
                <div className="text-sm text-neutral-700">
                  <p className="font-semibold mb-1">{t('aboutAiFill')}</p>
                  <p>{t('aboutAiFillDesc')}</p>
                  <p className="mt-2">{t('aboutStandardDesc')}</p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center justify-between pt-4">
              <button
                onClick={handleSave}
                disabled={!canSave || status === "saving"}
                className="flex items-center space-x-2 px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={18} />
                <span>{status === "saving" ? t('saving') : t('saveSettings')}</span>
              </button>

              {status === "saved" && (
                <div className="flex items-center space-x-2 text-green-600">
                  <CheckCircle2 size={18} />
                  <span className="text-sm font-medium">{t('saved')}</span>
                </div>
              )}
              {status === "error" && (
                <div className="flex items-center space-x-2 text-red-600">
                  <AlertCircle size={18} />
                  <span className="text-sm font-medium">{t('saveFailed')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Options;
