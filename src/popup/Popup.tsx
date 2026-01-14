import React, { useState, useCallback, useEffect } from "react";
import {
  generateSmartFormData,
  analyzeFormWithAI,
} from "../services/geminiService";
import ExtensionPopup from "../components/ExtensionPopup";
import { FormFieldDefinition, FormData, FillMode, LogEntry } from "../types";

const Popup: React.FC = () => {
  const [formFields, setFormFields] = useState<FormFieldDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fillMode, setFillMode] = useState<FillMode>(FillMode.STANDARD);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [hasApiKey, setHasApiKey] = useState(false);

  // Check if API key is configured
  useEffect(() => {
    chrome.storage.sync.get(["geminiApiKey"], (result) => {
      setHasApiKey(!!result.geminiApiKey);
    });
  }, []);

  // Detect forms on the active tab
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
        addLog("No active tab found", "error");
        return;
      }

      // Check if we can access this tab
      if (
        tab.url?.startsWith("chrome://") ||
        tab.url?.startsWith("chrome-extension://")
      ) {
        addLog("Cannot access Chrome internal pages", "error");
        return;
      }

      // Inject content script if needed
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"],
        });
      } catch (e) {
        // Script might already be injected
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check if we have API key for AI analysis
      const { geminiApiKey } = await chrome.storage.sync.get(["geminiApiKey"]);

      if (geminiApiKey) {
        // Use AI analysis
        addLog("Using AI to analyze form...", "info");

        const htmlResponse = await chrome.tabs.sendMessage(tab.id, {
          type: "GET_FORM_HTML",
        });

        if (htmlResponse?.html) {
          const aiFields = await analyzeFormWithAI(htmlResponse.html);

          if (aiFields.length > 0) {
            setFormFields(aiFields);
            addLog(`AI detected ${aiFields.length} form fields`, "success");
            return;
          }
        }

        addLog("AI analysis failed, using local detection", "info");
      }

      // Fallback to local detection
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: "DETECT_FORMS",
      });
      setFormFields(response.fields || []);

      if (response.fields?.length > 0) {
        addLog(`Detected ${response.fields.length} form fields`, "success");
      } else {
        addLog("No form fields detected on this page", "info");
      }
    } catch (error) {
      console.error("Error detecting forms:", error);
      addLog(
        "Failed to detect forms. Make sure you're on a page with forms.",
        "error"
      );
    }
  };

  const handleAutoFill = useCallback(async () => {
    if (formFields.length === 0) {
      addLog("No form fields to fill", "error");
      return;
    }

    setIsLoading(true);
    addLog(
      `Starting ${fillMode === FillMode.AI ? "AI" : "Standard"} generation...`,
      "info"
    );

    try {
      const data = await generateSmartFormData(formFields);
      console.log("Generated data:", data);

      // Send data to content script to fill the form
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab.id) throw new Error("No active tab");

      await chrome.tabs.sendMessage(tab.id, {
        type: "FILL_FORM",
        data,
      });

      addLog(
        `Successfully filled ${Object.keys(data).length} fields`,
        "success"
      );
    } catch (error) {
      console.error(error);
      addLog("Failed to generate or fill data", "error");
    } finally {
      setIsLoading(false);
    }
  }, [formFields, fillMode]);

  const handleClear = async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab.id) return;

      // Send empty data to clear the form
      const emptyData: FormData = {};
      formFields.forEach((field) => {
        emptyData[field.id] = field.type === "checkbox" ? false : "";
      });

      await chrome.tabs.sendMessage(tab.id, {
        type: "FILL_FORM",
        data: emptyData,
      });

      addLog("Form cleared", "info");
    } catch (error) {
      console.error(error);
      addLog("Failed to clear form", "error");
    }
  };

  const handleOpenOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  const handleRefresh = () => {
    setFormFields([]);
    setLogs([]);
    detectForms();
  };

  return (
    <div className="w-[400px] h-[600px]">
      <ExtensionPopup
        isLoading={isLoading}
        logs={logs}
        currentMode={fillMode}
        onFill={handleAutoFill}
        onClear={handleClear}
        onModeChange={setFillMode}
        formFieldsCount={formFields.length}
        hasApiKey={hasApiKey}
        onOpenOptions={handleOpenOptions}
        onRefresh={handleRefresh}
      />
    </div>
  );
};

export default Popup;
