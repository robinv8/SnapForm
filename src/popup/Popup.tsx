import React, { useState, useCallback, useEffect } from "react";
import {
  generateSmartFormData,
  analyzeFormWithAI,
  getAIConfig,
  hasValidConfig,
  generateLocalData,
} from "../services/aiService";
import { saveFillHistory, getHistory, deleteHistoryEntry, clearHistory, searchHistory } from "../services/historyService";
import ExtensionPopup from "../components/ExtensionPopup";
import { FormFieldDefinition, FormData, FillMode, FillHistoryEntry, LogEntry, AI_PROVIDER_DEFAULTS } from "../types";
import { t } from "../i18n";

const Popup: React.FC = () => {
  const [formFields, setFormFields] = useState<FormFieldDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [history, setHistory] = useState<FillHistoryEntry[]>([]);
  const [fillResult, setFillResult] = useState<{ type: "success"; count: number } | { type: "error" } | null>(null);
  const [aiReady, setAiReady] = useState(false);
  const [providerInfo, setProviderInfo] = useState("");

  useEffect(() => {
    getAIConfig().then(config => {
      const valid = hasValidConfig(config);
      setAiReady(valid);
      if (valid && config) {
        setProviderInfo(`${AI_PROVIDER_DEFAULTS[config.provider].name} / ${config.model}`);
      }
    });
  }, []);

  useEffect(() => {
    getHistory().then(setHistory);
  }, []);

  useEffect(() => {
    detectForms();
  }, []);

  const addLog = (
    message: string,
    type: "info" | "success" | "error" = "info"
  ) => {
    setLogs((prev) => [
      {
        id: Math.random().toString(36).substring(7),
        timestamp: new Date(),
        message,
        type,
      },
      ...prev,
    ]);
  };

  const detectForms = async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab.id) {
        addLog(t('noActiveTab'), "error");
        return;
      }

      if (
        tab.url?.startsWith("chrome://") ||
        tab.url?.startsWith("chrome-extension://")
      ) {
        addLog(t('cannotAccessChrome'), "error");
        return;
      }

      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"],
        });
      } catch (e) {
        // Script might already be injected
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      const response = await chrome.tabs.sendMessage(tab.id, {
        type: "DETECT_FORMS",
      });
      const localFields = response.fields || [];

      if (localFields.length > 0) {
        setFormFields(localFields);
        addLog(t('localDetected', { count: localFields.length }), "success");
        return;
      }

      const aiConfig = await getAIConfig();
      if (hasValidConfig(aiConfig)) {
        addLog(t('aiAnalyzing'), "info");

        const htmlResponse = await chrome.tabs.sendMessage(tab.id, {
          type: "GET_FORM_HTML",
        });

        if (htmlResponse?.html) {
          const aiFields = await analyzeFormWithAI(htmlResponse.html);
          if (aiFields.length > 0) {
            setFormFields(aiFields);
            addLog(t('aiDetected', { count: aiFields.length }), "success");
            return;
          }
        }

        addLog(t('aiNoResult'), "info");
      } else {
        addLog(t('noFieldsDetected'), "info");
      }
    } catch (error) {
      console.error("Error detecting forms:", error);
      addLog(t('detectError'), "error");
    }
  };

  const handleAutoFill = useCallback(async () => {
    if (formFields.length === 0) {
      addLog(t('noFieldsToFill'), "error");
      return;
    }

    setIsLoading(true);
    setFillResult(null);

    try {
      const aiConfig = await getAIConfig();
      const useAI = hasValidConfig(aiConfig);
      const mode = useAI ? FillMode.AI : FillMode.STANDARD;

      addLog(useAI ? t('usingAI') : t('usingLocal'), "info");

      const data = useAI
        ? await generateSmartFormData(formFields)
        : generateLocalData(formFields);

      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab.id) throw new Error("No active tab");

      await chrome.tabs.sendMessage(tab.id, {
        type: "FILL_FORM",
        data,
      });

      const count = Object.keys(data).length;

      try {
        await saveFillHistory(
          tab.url || '',
          tab.title || '',
          formFields,
          data,
          mode
        );
        const updated = await getHistory();
        setHistory(updated);
      } catch (e) {
        console.error('Failed to save history:', e);
      }

      addLog(t('fillSuccessLog', { count }), "success");
      setFillResult({ type: "success", count });
      setTimeout(() => setFillResult(null), 3000);
    } catch (error) {
      console.error(error);
      addLog(t('fillErrorLog'), "error");
      setFillResult({ type: "error" });
      setTimeout(() => setFillResult(null), 3000);
    } finally {
      setIsLoading(false);
    }
  }, [formFields]);

  const handleClear = async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab.id) return;

      const emptyData: FormData = {};
      formFields.forEach((field) => {
        emptyData[field.id] = field.type === "checkbox" ? false : "";
      });

      await chrome.tabs.sendMessage(tab.id, {
        type: "FILL_FORM",
        data: emptyData,
      });

      addLog(t('formCleared'), "info");
    } catch (error) {
      console.error(error);
      addLog(t('clearFormError'), "error");
    }
  };

  const handleOpenOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  const handleRefresh = () => {
    setFormFields([]);
    setLogs([]);
    setFillResult(null);
    detectForms();
  };

  const handleDeleteHistory = async (id: string) => {
    await deleteHistoryEntry(id);
    const updated = await getHistory();
    setHistory(updated);
  };

  const handleClearHistory = async () => {
    await clearHistory();
    setHistory([]);
  };

  const handleSearchHistory = async (query: string) => {
    if (!query.trim()) {
      const all = await getHistory();
      setHistory(all);
    } else {
      const results = await searchHistory(query);
      setHistory(results);
    }
  };

  return (
    <div className="w-[400px] max-h-[600px] flex flex-col">
      <ExtensionPopup
        isLoading={isLoading}
        logs={logs}
        onFill={handleAutoFill}
        onClear={handleClear}
        formFieldsCount={formFields.length}
        onOpenOptions={handleOpenOptions}
        onRefresh={handleRefresh}
        history={history}
        onDeleteHistory={handleDeleteHistory}
        onClearHistory={handleClearHistory}
        onSearchHistory={handleSearchHistory}
        fillResult={fillResult}
        aiReady={aiReady}
        providerInfo={providerInfo}
      />
    </div>
  );
};

export default Popup;
