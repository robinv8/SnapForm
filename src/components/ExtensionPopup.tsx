import React, { useState } from "react";
import {
  Settings,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Info,
  Bot,
  Clock,
  Search,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Globe,
  X,
  Play,
  Eraser,
} from "lucide-react";
import { FillMode, LogEntry, FillHistoryEntry } from "../types";
import { t, getLocale } from "../i18n";

type Tab = "fill" | "history";

interface ExtensionPopupProps {
  isLoading: boolean;
  logs: LogEntry[];
  onFill: () => void;
  onClear: () => void;
  formFieldsCount: number;
  onOpenOptions: () => void;
  onRefresh: () => void;
  history: FillHistoryEntry[];
  onDeleteHistory: (id: string) => void;
  onClearHistory: () => void;
  onSearchHistory: (query: string) => void;
  fillResult?: { type: "success"; count: number } | { type: "error" } | null;
  aiReady: boolean;
  providerInfo: string;
}

const ExtensionPopup: React.FC<ExtensionPopupProps> = ({
  isLoading,
  logs,
  onFill,
  onClear,
  formFieldsCount,
  onOpenOptions,
  onRefresh,
  history,
  onDeleteHistory,
  onClearHistory,
  onSearchHistory,
  fillResult,
  aiReady,
  providerInfo,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>("fill");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const [revealedValues, setRevealedValues] = useState<Set<string>>(new Set());
  const [confirmClear, setConfirmClear] = useState(false);

  const toggleReveal = (key: string) => {
    setRevealedValues(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const isSensitiveField = (name: string, label: string): boolean => {
    const sensitive = ['password', 'passwd', 'pw', 'secret', 'token', 'pin', 'cvv', 'cvc', 'ssn', '密码', '口令'];
    const text = `${name} ${label}`.toLowerCase();
    return sensitive.some(s => text.includes(s));
  };

  const locale = getLocale();

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return t('justNow');
    if (diffMin < 60) return t('minutesAgo', { count: diffMin });
    if (diffHour < 24) return t('hoursAgo', { count: diffHour });
    if (diffDay < 7) return t('daysAgo', { count: diffDay });
    return d.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' });
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    onSearchHistory(q);
  };

  const handleClearHistory = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    onClearHistory();
    setConfirmClear(false);
  };

  const getFillButton = () => {
    if (isLoading) {
      return {
        className: "bg-neutral-400 cursor-not-allowed",
        icon: <RefreshCw size={18} className="animate-spin" />,
        text: t('generating'),
      };
    }
    if (fillResult?.type === "success") {
      return {
        className: "bg-success",
        icon: <CheckCircle2 size={18} />,
        text: t('fillSuccess', { count: fillResult.count }),
      };
    }
    if (fillResult?.type === "error") {
      return {
        className: "bg-error",
        icon: <AlertCircle size={18} />,
        text: t('fillError'),
      };
    }
    return {
      className: "bg-primary hover:bg-primary-hover active:scale-95",
      icon: <Play size={18} />,
      text: t('autoFill'),
    };
  };

  const fillBtn = getFillButton();

  return (
    <div className="w-full h-full bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-primary px-5 py-3.5 flex justify-between items-center text-white">
        <span className="font-semibold tracking-wide text-[15px]">{t('appName')}</span>
        <div className="flex items-center space-x-2">
          <button
            onClick={onRefresh}
            className="text-white/80 hover:text-white transition-colors"
            title={t('refreshDetection')}
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={onOpenOptions}
            className="text-white/80 hover:text-white transition-colors"
            title={t('settings')}
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-neutral-200 bg-white">
        <button
          onClick={() => setActiveTab("fill")}
          className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center space-x-1.5 transition-colors border-b-2 ${
            activeTab === "fill"
              ? "border-primary text-primary"
              : "border-transparent text-neutral-500 hover:text-neutral-700"
          }`}
        >
          <Play size={13} />
          <span>{t('tabFill')}</span>
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center space-x-1.5 transition-colors border-b-2 ${
            activeTab === "history"
              ? "border-primary text-primary"
              : "border-transparent text-neutral-500 hover:text-neutral-700"
          }`}
        >
          <Clock size={13} />
          <span>{t('tabHistory')}</span>
          {history.length > 0 && (
            <span className="bg-neutral-200 text-neutral-600 text-[10px] px-1.5 py-0.5 rounded-full">
              {history.length}
            </span>
          )}
        </button>
      </div>

      {/* Fill Tab */}
      {activeTab === "fill" && (
        <div className="p-4 flex-1 flex flex-col bg-neutral-50 overflow-y-auto">
          {/* Form Detection Status */}
          {formFieldsCount > 0 ? (
            <div className="mb-3 p-3 rounded-lg bg-neutral-100 text-sm flex items-center text-neutral-700">
              <CheckCircle2 size={16} className="mr-2 shrink-0 text-success" />
              <span>{t('fieldsDetected', { count: formFieldsCount })}</span>
            </div>
          ) : (
            <div className="mb-3 p-3 rounded-lg bg-neutral-100 text-sm flex items-center text-neutral-500">
              <Info size={16} className="mr-2 shrink-0" />
              <span>{t('noFormDetected')}</span>
            </div>
          )}

          {/* AI Status */}
          {aiReady && (
            <div className="mb-3 text-xs text-neutral-500 px-3 py-2 rounded-lg bg-neutral-100 flex items-center">
              <Bot size={14} className="mr-2 shrink-0 text-neutral-400" />
              <span className="truncate">{providerInfo}</span>
            </div>
          )}

          {/* Primary Actions */}
          <div className="space-y-2 mb-4">
            <button
              onClick={onFill}
              disabled={isLoading || !!fillResult}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all flex items-center justify-center space-x-2 ${fillBtn.className} disabled:cursor-not-allowed`}
            >
              {fillBtn.icon}
              <span>{fillBtn.text}</span>
            </button>

            <button
              onClick={onClear}
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-lg font-medium text-neutral-600 bg-white border border-neutral-200 hover:bg-neutral-50 transition-colors text-sm flex items-center justify-center space-x-2"
            >
              <Eraser size={14} />
              <span>{t('clearForm')}</span>
            </button>
          </div>

          {/* Activity Log */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <label className="text-xs font-semibold text-neutral-500 tracking-wider mb-2 block">
              {t('activityLog')}
            </label>
            <div className="bg-white border border-neutral-200 rounded-lg flex-1 overflow-y-auto p-3 space-y-2 text-sm">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-400 py-4">
                  <span className="text-xs">{t('noLogs')}</span>
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start space-x-2 animate-fade-in"
                  >
                    <div className="mt-0.5 shrink-0">
                      {log.type === "success" && (
                        <CheckCircle2 size={14} className="text-success" />
                      )}
                      {log.type === "error" && (
                        <AlertCircle size={14} className="text-error" />
                      )}
                      {log.type === "info" && (
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-neutral-300" />
                      )}
                    </div>
                    <div>
                      <p className="text-neutral-700 leading-tight">
                        {log.message}
                      </p>
                      <span className="text-[10px] text-neutral-400">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === "history" && (
        <div className="flex-1 flex flex-col bg-neutral-50 overflow-hidden">
          {/* Search & Clear */}
          <div className="p-3 pb-0 space-y-2">
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="w-full pl-8 pr-8 py-2 text-sm border border-neutral-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-primary"
                />
                {searchQuery && (
                  <button
                    onClick={() => handleSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              {history.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className={`shrink-0 p-2 transition-colors ${
                    confirmClear
                      ? "text-red-500"
                      : "text-neutral-400 hover:text-red-500"
                  }`}
                  title={confirmClear ? t('confirmClearAll') : t('clearAllHistory')}
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            {confirmClear && (
              <p className="text-xs text-red-500 text-center animate-fade-in">
                {t('confirmClearMsg')}
              </p>
            )}
          </div>

          {/* History List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-neutral-400 py-12">
                <Clock size={32} className="mb-3 text-neutral-300" />
                <p className="text-sm">{t('noHistory')}</p>
                <p className="text-xs mt-1">{t('noHistoryHint')}</p>
              </div>
            ) : (
              history.map((entry) => {
                const isExpanded = expandedEntry === entry.id;
                return (
                  <div
                    key={entry.id}
                    className="bg-white border border-neutral-200 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                      className="w-full px-3 py-2.5 flex items-center text-left hover:bg-neutral-50 transition-colors"
                    >
                      <div className="shrink-0 mr-2.5">
                        {isExpanded ? (
                          <ChevronDown size={14} className="text-neutral-400" />
                        ) : (
                          <ChevronRight size={14} className="text-neutral-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <Globe size={12} className="shrink-0 text-neutral-400" />
                          <span className="text-sm font-medium text-neutral-800 truncate">
                            {entry.domain}
                          </span>
                          <span className="shrink-0 text-[10px] text-neutral-400">
                            {formatTime(entry.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 truncate mt-0.5">
                          {entry.pageTitle}
                        </p>
                      </div>
                      <div className="shrink-0 ml-2 flex items-center space-x-1.5">
                        <span className="text-[10px] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded">
                          {t('fieldCount', { count: entry.fields.length })}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteHistory(entry.id);
                          }}
                          className="p-1 text-neutral-300 hover:text-red-500 transition-colors"
                          title={t('delete')}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-neutral-100 px-3 py-2 bg-neutral-50/50">
                        <div className="space-y-1.5">
                          {entry.fields.map((field, i) => {
                            const sensitive = isSensitiveField(field.name, field.label);
                            const revealKey = `${entry.id}_${i}`;
                            const isRevealed = revealedValues.has(revealKey);
                            const displayValue = sensitive && !isRevealed
                              ? '••••••••'
                              : String(field.value);

                            return (
                              <div key={i} className="flex items-center text-xs">
                                <span className="w-24 shrink-0 text-neutral-500 truncate" title={field.label}>
                                  {field.label}
                                </span>
                                <span
                                  className={`flex-1 font-mono px-2 py-1 rounded ${
                                    sensitive
                                      ? 'bg-amber-50 text-amber-800'
                                      : 'bg-white text-neutral-700'
                                  } truncate`}
                                  title={isRevealed || !sensitive ? String(field.value) : undefined}
                                >
                                  {displayValue}
                                </span>
                                {sensitive && (
                                  <button
                                    onClick={() => toggleReveal(revealKey)}
                                    className="shrink-0 ml-1.5 p-1 text-neutral-400 hover:text-neutral-600"
                                    title={isRevealed ? t('hide') : t('show')}
                                  >
                                    {isRevealed ? <EyeOff size={12} /> : <Eye size={12} />}
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-2 pt-2 border-t border-neutral-100 flex items-center justify-between text-[10px] text-neutral-400">
                          <span>{new Date(entry.timestamp).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US')}</span>
                          <span className="flex items-center space-x-1">
                            {entry.mode === FillMode.AI ? <Bot size={10} /> : <Play size={10} />}
                            <span>{entry.mode === FillMode.AI ? t('modeAI') : t('modeStandard')}</span>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExtensionPopup;
