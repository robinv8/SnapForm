import React, { useState, useEffect, useRef } from "react";
import {
  Save,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Info,
  Eye,
  EyeOff,
  ChevronDown,
  Search,
  Copy,
  X,
  Bot,
  Zap,
} from "lucide-react";
import { AIProvider, AIProviderConfig, AI_PROVIDER_DEFAULTS, FillMode, SnapFormSettings } from "../types";
import { getAIConfig, saveAIConfig, testConnection } from "../services/aiService";
import { t } from "../i18n";

const PROVIDERS: AIProvider[] = [
  "gemini", "openai", "deepseek", "groq", "mistral",
  "openrouter", "siliconflow", "zhipu", "moonshot", "custom",
];

const PROVIDER_GROUPS = [
  { label: t('providerGroupCN'), providers: ["siliconflow", "zhipu", "moonshot", "deepseek"] as AIProvider[] },
  { label: t('providerGroupIntl'), providers: ["gemini", "openai", "groq", "mistral", "openrouter"] as AIProvider[] },
  { label: t('providerGroupOther'), providers: ["custom"] as AIProvider[] },
];

interface SelectOption<T> {
  value: T;
  label: React.ReactNode;
  group?: string;
}

function SimpleSelect<T extends string>({
  value,
  options,
  onChange,
  renderTrigger,
  placeholder,
  searchPlaceholder,
}: {
  value: T;
  options: SelectOption<T>[];
  onChange: (v: T) => void;
  renderTrigger?: (v: T) => React.ReactNode;
  placeholder?: string;
  searchPlaceholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filtered = options.filter(
    (o) =>
      String(o.label).toLowerCase().includes(search.toLowerCase()) ||
      o.value.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 border border-neutral-300 rounded-lg bg-white text-left flex items-center justify-between focus:ring-2 focus:ring-orange-200 focus:border-primary outline-none transition-all"
      >
        <span className="truncate">
          {renderTrigger ? renderTrigger(value) : options.find((o) => o.value === value)?.label || placeholder}
        </span>
        <ChevronDown size={16} className={`text-neutral-400 shrink-0 ml-2 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-72 overflow-hidden flex flex-col">
          <div className="sticky top-0 bg-white border-b border-neutral-100 p-2 shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-3 py-2 text-sm border border-neutral-200 rounded-md focus:outline-none focus:border-primary"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          <div className="overflow-y-auto p-1">
            {filtered.map((o) => (
              <button
                type="button"
                key={o.value}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                  setSearch("");
                }}
                className={`w-full px-3 py-2 text-left text-sm rounded-md flex items-center justify-between transition-colors ${
                  value === o.value ? "bg-orange-50 text-primary font-medium" : "text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                <span className="truncate">{o.label}</span>
                {value === o.value && <CheckCircle2 size={14} className="shrink-0 ml-2" />}
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-sm text-neutral-400 text-center">{t('noResults')}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const Options: React.FC = () => {
  const [provider, setProvider] = useState<AIProvider>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [defaultFillMode, setDefaultFillMode] = useState<FillMode>(FillMode.AI);
  const [showFloatingButton, setShowFloatingButton] = useState(true);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "failed">("idle");
  const [testMessage, setTestMessage] = useState("");
  const [testLatency, setTestLatency] = useState<number | null>(null);

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
        setDefaultFillMode(config.defaultFillMode || FillMode.AI);
      }
    });

    chrome.storage.sync.get(["snapformSettings"]).then((result) => {
      const settings = result.snapformSettings as SnapFormSettings | undefined;
      setShowFloatingButton(settings?.showFloatingButton ?? true);
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
    setTestStatus("idle");
    setTestLatency(null);
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
        defaultFillMode,
      };
      await saveAIConfig(config);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const handleTestConnection = async () => {
    setTestStatus("testing");
    setTestMessage("");
    setTestLatency(null);
    const finalModel = model === "__custom__" ? customModel : model;
    const config: AIProviderConfig = {
      provider,
      apiKey,
      model: finalModel,
      baseUrl: provider === "custom" ? baseUrl : undefined,
    };
    const result = await testConnection(config);
    if (result.success) {
      setTestStatus("success");
      setTestLatency(result.latencyMs ?? null);
      setTimeout(() => setTestStatus("idle"), 3000);
    } else {
      setTestStatus("failed");
      setTestMessage(result.error || "");
      setTestLatency(result.latencyMs ?? null);
      setTimeout(() => setTestStatus("idle"), 5000);
    }
  };

  const handleToggleFloatingButton = (value: boolean) => {
    setShowFloatingButton(value);
    chrome.storage.sync.set({
      snapformSettings: { showFloatingButton: value } as SnapFormSettings,
    });
  };

  const canSave = apiKey.trim() && (model || customModel) && (provider !== "custom" || baseUrl.trim());

  const providerOptions: SelectOption<AIProvider>[] = PROVIDER_GROUPS.flatMap((g) => [
    { value: g.providers[0], label: <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">{g.label}</span>, group: g.label },
    ...g.providers.map((p) => ({
      value: p,
      label: (
        <div className="flex flex-col">
          <span className="font-medium">{AI_PROVIDER_DEFAULTS[p].name}</span>
          {AI_PROVIDER_DEFAULTS[p].models[0] && (
            <span className="text-[11px] text-neutral-400">{AI_PROVIDER_DEFAULTS[p].models[0]}</span>
          )}
        </div>
      ),
      group: g.label,
    })),
  ]);

  const modelOptions: SelectOption<string>[] =
    providerDefaults.models.length > 0
      ? [
          ...providerDefaults.models.map((m) => ({
            value: m,
            label: <span className="font-medium">{m}</span>,
          })),
          { value: "__custom__", label: <span className="text-neutral-500 italic">{t('customModel')}</span> },
        ]
      : [];

  const finalModelName = model === "__custom__" ? customModel : model;
  const isConfigured = apiKey.trim() && finalModelName.trim() && (provider !== "custom" || baseUrl.trim());

  return (
    <div className="min-h-screen bg-neutral-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Summary Card */}
        <div className={`rounded-xl shadow-lg p-6 text-white ${isConfigured ? "bg-gradient-to-r from-orange-500 to-orange-600" : "bg-gradient-to-r from-neutral-500 to-neutral-600"}`}>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{t('settingsTitle')}</h1>
              <p className="text-white/80 text-sm mt-1">
                {isConfigured
                  ? `${providerDefaults.name} / ${finalModelName || t('model')}`
                  : t('settingsNotConfigured')}
              </p>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-lg px-3 py-1.5 text-sm font-medium">
              {defaultFillMode === FillMode.AI ? t('fillModeAI') : t('fillModeStandard')}
            </div>
          </div>

          {isConfigured && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {testStatus === "success" ? (
                <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur px-2.5 py-1 rounded-md text-sm">
                  <CheckCircle2 size={14} />
                  {t('testSuccess')}
                  {testLatency !== null && <span className="text-white/80">· {testLatency}ms</span>}
                </span>
              ) : testStatus === "failed" ? (
                <span className="inline-flex items-center gap-1.5 bg-red-500/30 backdrop-blur px-2.5 py-1 rounded-md text-sm">
                  <AlertCircle size={14} />
                  {t('testFailed')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur px-2.5 py-1 rounded-md text-sm text-white/80">
                  <Info size={14} />
                  {t('testNotRun')}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Main Settings Card */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="p-6 space-y-8">
            {/* AI Configuration */}
            <section>
              <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Bot size={14} className="text-primary" />
                {t('sectionAIConfig')}
              </h2>

              <div className="space-y-5">
                {/* Provider */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">{t('aiProvider')}</label>
                  <SimpleSelect
                    value={provider}
                    options={providerOptions}
                    onChange={handleProviderChange}
                    renderTrigger={(v) => (
                      <div className="flex flex-col">
                        <span className="font-medium">{AI_PROVIDER_DEFAULTS[v as AIProvider].name}</span>
                        <span className="text-[11px] text-neutral-400">{AI_PROVIDER_DEFAULTS[v as AIProvider].baseUrl}</span>
                      </div>
                    )}
                    placeholder={t('selectProvider')}
                    searchPlaceholder={t('searchProvider')}
                  />
                </div>

                {/* API Key */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">{t('apiKey')}</label>
                  <div className="relative">
                    <input
                      type={showKey ? "text" : "password"}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={t('apiKeyPlaceholder', { provider: providerDefaults.name })}
                      className="w-full px-4 py-3 pr-24 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-primary outline-none transition-all"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {apiKey && (
                        <>
                          <button
                            onClick={() => navigator.clipboard.writeText(apiKey)}
                            className="p-1.5 text-neutral-400 hover:text-neutral-600 rounded-md hover:bg-neutral-100"
                            title={t('copy')}
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            onClick={() => setApiKey("")}
                            className="p-1.5 text-neutral-400 hover:text-red-500 rounded-md hover:bg-neutral-100"
                            title={t('clear')}
                          >
                            <X size={16} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setShowKey(!showKey)}
                        className="p-1.5 text-neutral-400 hover:text-neutral-600 rounded-md hover:bg-neutral-100"
                      >
                        {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
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

                {/* Model */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">{t('model')}</label>
                  {providerDefaults.models.length > 0 ? (
                    <>
                      <SimpleSelect
                        value={model}
                        options={modelOptions}
                        onChange={(v) => {
                          setModel(v);
                          if (v !== "__custom__") setCustomModel("");
                        }}
                        renderTrigger={(v) => (
                          <span className="font-medium">
                            {v === "__custom__" ? t('customModel') : v || t('selectModel')}
                          </span>
                        )}
                        placeholder={t('selectModel')}
                        searchPlaceholder={t('searchModel')}
                      />
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
                    <label className="block text-sm font-semibold text-neutral-700 mb-2">{t('apiUrl')}</label>
                    <input
                      type="text"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder={t('apiUrlPlaceholder')}
                      className="w-full px-4 py-3 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-primary outline-none transition-all"
                    />
                    <p className="mt-2 text-xs text-neutral-500">{t('apiUrlHint')}</p>
                  </div>
                )}
              </div>
            </section>

            <hr className="border-neutral-100" />

            {/* Preferences */}
            <section>
              <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Zap size={14} className="text-primary" />
                {t('sectionPreferences')}
              </h2>

              <div className="space-y-5">
                {/* Default Fill Mode */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-3">{t('defaultFillMode')}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([FillMode.AI, FillMode.STANDARD] as const).map((mode) => {
                      const isActive = defaultFillMode === mode;
                      return (
                        <button
                          key={mode}
                          onClick={() => setDefaultFillMode(mode)}
                          className={`px-4 py-3 rounded-lg border-2 text-left transition-all ${
                            isActive
                              ? "border-primary bg-orange-50 text-primary"
                              : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
                          }`}
                        >
                          <div className="font-medium text-sm">
                            {t(mode === FillMode.AI ? "fillModeAI" : "fillModeStandard")}
                          </div>
                          <div className="text-[11px] text-neutral-400 mt-0.5">
                            {t(mode === FillMode.AI ? "fillModeAIDesc" : "fillModeStandardDesc")}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Floating Button Toggle */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-3">{t('showFloatingButton')}</label>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 bg-white">
                    <div className="text-sm text-neutral-600">{t('showFloatingButtonDesc')}</div>
                    <button
                      onClick={() => handleToggleFloatingButton(!showFloatingButton)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        showFloatingButton ? "bg-primary" : "bg-neutral-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          showFloatingButton ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <hr className="border-neutral-100" />

            {/* About */}
            <section>
              <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Info size={14} className="text-primary" />
                {t('sectionAbout')}
              </h2>
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 text-sm text-neutral-700 space-y-2">
                <p>
                  <span className="font-semibold">{t('aboutAiFill')}</span> {t('aboutAiFillDesc')}
                </p>
                <p>{t('aboutStandardDesc')}</p>
              </div>
            </section>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={!canSave || status === "saving"}
                  className="flex items-center space-x-2 px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={18} />
                  <span>{status === "saving" ? t('saving') : t('saveSettings')}</span>
                </button>

                <button
                  onClick={handleTestConnection}
                  disabled={!canSave || testStatus === "testing"}
                  className="flex items-center space-x-2 px-6 py-3 border-2 border-neutral-300 text-neutral-700 font-semibold rounded-lg hover:border-neutral-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{testStatus === "testing" ? t('testing') : t('testConnection')}</span>
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
                {testStatus === "success" && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <CheckCircle2 size={18} />
                    <span className="text-sm font-medium">
                      {t('testSuccess')}
                      {testLatency !== null && (
                        <span className="ml-1 text-green-600/80">· {testLatency}ms</span>
                      )}
                    </span>
                  </div>
                )}
                {testStatus === "failed" && (
                  <div className="flex items-center space-x-2 text-red-600">
                    <AlertCircle size={18} />
                    <span className="text-sm font-medium">{t('testFailed')}</span>
                  </div>
                )}
              </div>
              {testStatus === "failed" && testMessage && (
                <p className="text-xs text-red-500">{t('testFailedDetail', { detail: testMessage })}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Options;
