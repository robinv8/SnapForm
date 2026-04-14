import { generateText } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import { FormFieldDefinition, FormData, AIProviderConfig, AI_PROVIDER_DEFAULTS } from "../types";

const STORAGE_KEY = 'aiProviderConfig';

// ─── Config Management ──────────────────────────────────────────

export async function getAIConfig(): Promise<AIProviderConfig | null> {
    try {
        const result = await chrome.storage.sync.get([STORAGE_KEY]);
        return (result[STORAGE_KEY] as AIProviderConfig) || null;
    } catch {
        return null;
    }
}

export async function saveAIConfig(config: AIProviderConfig): Promise<void> {
    await chrome.storage.sync.set({ [STORAGE_KEY]: config });
}

export function hasValidConfig(config: AIProviderConfig | null): boolean {
    if (!config || !config.apiKey || !config.model) return false;
    if (config.provider === 'custom' && !config.baseUrl) return false;
    return true;
}

// ─── Provider Factory ───────────────────────────────────────────

function getBaseUrl(config: AIProviderConfig): string {
    if (config.provider === 'custom') return config.baseUrl || '';
    return AI_PROVIDER_DEFAULTS[config.provider].baseUrl;
}

function createProvider(config: AIProviderConfig) {
    const baseUrl = getBaseUrl(config);
    return createOpenAICompatible({
        name: config.provider,
        baseURL: baseUrl,
        apiKey: config.apiKey,
    });
}

// ─── Zod Schemas ────────────────────────────────────────────────

const formFieldSchema = z.object({
    fields: z.array(z.object({
        id: z.string(),
        name: z.string(),
        label: z.string(),
        type: z.string(),
        required: z.boolean().optional(),
        options: z.array(z.string()).optional(),
    })),
});

const formDataSchema = z.record(z.string(), z.union([z.string(), z.boolean(), z.number()]));

// ─── Prompts ────────────────────────────────────────────────────

const ANALYZE_PROMPT = (html: string) => `分析以下 HTML 代码，识别所有可填写的表单输入字段（input, select, textarea）。

对于每个字段，返回:
- id: 字段的唯一标识符（使用 id 属性，或 name 属性，或生成一个如 "field_1"）
- name: 字段名称（用于提交）
- label: 字段的中文或英文标签/描述
- type: 字段类型（text, email, tel, number, select, checkbox, date, textarea, url）
- required: 是否必填
- options: 如果是 select，列出选项值

HTML:
${html}

以 {"fields": [...]} 格式返回 JSON，不要其他解释。`;

const GENERATE_PROMPT = (fields: FormFieldDefinition[], customPrompt?: string) => {
    const base = `为以下表单字段生成真实的测试数据:
${JSON.stringify(fields.map(f => ({ id: f.id, label: f.label, type: f.type, options: f.options })), null, 2)}

要求:
- Email 使用有效格式
- URL 使用 https:// 开头的有效格式
- 电话号码使用真实格式
- 文本内容专业、合理
- 如果是中文标签，生成中文数据
- 如果有 options，从中选择一个
- checkbox 类型返回 true 或 false
- number 类型返回数字`;

    const extra = customPrompt?.trim()
        ? `\n\n额外上下文要求（请优先遵循）：\n${customPrompt.trim()}`
        : '';

    return `${base}${extra}\n\n返回一个 JSON 对象，key 是字段 id，value 是生成的值。只返回 JSON，不要其他解释。`;
};

// ─── Helpers ────────────────────────────────────────────────────

function cleanJsonText(text: string): string {
    const trimmed = text.trim();
    if (trimmed.startsWith('```')) {
        const lines = trimmed.split('\n');
        if (lines.length > 1) {
            // Remove first ```json or ``` and last ```
            if (lines[0].startsWith('```')) lines.shift();
            if (lines[lines.length - 1].startsWith('```')) lines.pop();
            return lines.join('\n').trim();
        }
    }
    return trimmed;
}

function buildMessages(instruction: string, prompt: string) {
    // Many OpenAI-compatible Chinese providers do not handle system role well.
    // Combine system instruction into the user message for better compatibility.
    return [
        {
            role: 'user' as const,
            content: `${instruction}\n\n${prompt}`,
        },
    ];
}

// ─── Test Connection ────────────────────────────────────────────

export async function testConnection(config: AIProviderConfig): Promise<{ success: boolean; error?: string; latencyMs?: number }> {
    const start = Date.now();
    try {
        const provider = createProvider(config);
        await generateText({
            model: provider.chatModel(config.model),
            messages: [{ role: 'user', content: 'Hi' }],
            maxTokens: 1,
        });
        return { success: true, latencyMs: Date.now() - start };
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message, latencyMs: Date.now() - start };
    }
}

// ─── Unified Interface ──────────────────────────────────────────

export async function analyzeFormWithAI(formHtml: string): Promise<FormFieldDefinition[]> {
    const config = await getAIConfig();
    if (!hasValidConfig(config)) return [];

    try {
        const provider = createProvider(config!);
        const { text } = await generateText({
            model: provider.chatModel(config!.model),
            messages: buildMessages(
                '你是一个表单分析助手。始终只返回有效的 JSON，不要返回任何其他文本或 markdown 代码块。',
                ANALYZE_PROMPT(formHtml)
            ),
            temperature: 0.7,
        });

        const cleanText = cleanJsonText(text);
        const parsed = formFieldSchema.parse(JSON.parse(cleanText));
        return parsed.fields;
    } catch (error) {
        console.error(`AI Analysis Error (${config!.provider}):`, error);
        return [];
    }
}

export async function generateSmartFormData(fields: FormFieldDefinition[], customPrompt?: string): Promise<{ data: FormData; fallback: boolean }> {
    const config = await getAIConfig();
    if (!hasValidConfig(config)) {
        return { data: generateLocalData(fields), fallback: true };
    }

    try {
        const provider = createProvider(config!);
        const { text } = await generateText({
            model: provider.chatModel(config!.model),
            messages: buildMessages(
                '你是一个表单分析助手。始终只返回有效的 JSON，不要返回任何其他文本或 markdown 代码块。',
                GENERATE_PROMPT(fields, customPrompt)
            ),
            temperature: 0.7,
        });

        const cleanText = cleanJsonText(text);
        const raw = JSON.parse(cleanText) as Record<string, unknown>;

        // Post-process: coerce null/undefined/arrays/objects to strings so Zod won't complain
        const coerced: FormData = {};
        for (const [key, value] of Object.entries(raw)) {
            if (value === null || value === undefined) {
                coerced[key] = '';
            } else if (typeof value === 'boolean' || typeof value === 'number') {
                coerced[key] = value;
            } else if (typeof value === 'string') {
                coerced[key] = value;
            } else {
                coerced[key] = JSON.stringify(value);
            }
        }

        return { data: coerced, fallback: false };
    } catch (error) {
        console.error(`AI Generation Error (${config!.provider}):`, error);
        return { data: generateLocalData(fields), fallback: true };
    }
}

// ─── Local Fallback ─────────────────────────────────────────────

// ─── Random Data Pools ──────────────────────────────────────────

const FIRST_NAMES = ['张伟', '李娜', '王芳', '刘洋', '陈明', '杨静', '赵磊', '黄丽', '周强', '吴敏'];
const LAST_NAMES_EN = ['Chen', 'Li', 'Wang', 'Zhang', 'Liu', 'Yang', 'Zhao', 'Huang', 'Zhou', 'Wu'];
const FIRST_NAMES_EN = ['Alex', 'Jamie', 'Morgan', 'Casey', 'Robin', 'Sam', 'Jordan', 'Taylor', 'Quinn', 'Riley'];
const CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都', '南京', '武汉', '西安', '重庆'];
const STREETS = ['中关村大街', '南京西路', '天河路', '科技园路', '人民路', '解放大道', '长安街', '建设路'];
const DOMAINS = ['gmail.com', 'outlook.com', 'qq.com', '163.com', 'foxmail.com'];
const COMPANIES = ['华为技术', '阿里巴巴', '腾讯科技', '字节跳动', '百度在线', '京东集团', '美团科技', '小米科技'];
const BIOS = [
    '热爱技术，专注于产品研发与用户体验优化。',
    '5年软件开发经验，擅长全栈开发与系统架构设计。',
    '资深产品经理，关注用户增长与商业化策略。',
    '数据分析师，善于从数据中发现业务洞察。',
];

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomDigits(n: number): string {
    return Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
}

export function generateLocalData(fields: FormFieldDefinition[]): FormData {
    const data: FormData = {};

    // Generate a consistent persona for this fill session
    const personName = pick(FIRST_NAMES);
    const enFirst = pick(FIRST_NAMES_EN);
    const enLast = pick(LAST_NAMES_EN);
    const emailUser = `${enFirst.toLowerCase()}.${enLast.toLowerCase()}${randomDigits(2)}`;
    const emailDomain = pick(DOMAINS);
    const city = pick(CITIES);
    const phone = `1${pick(['3', '5', '7', '8', '9'])}${randomDigits(9)}`;

    fields.forEach(field => {
        const nameLower = (field.name || '').toLowerCase();
        const labelLower = (field.label || '').toLowerCase();
        const idLower = (field.id || '').toLowerCase();
        const combined = `${nameLower} ${labelLower} ${idLower}`;

        if (field.type === 'checkbox') {
            data[field.id] = true;
        } else if (field.type === 'select' && field.options && field.options.length > 0) {
            data[field.id] = field.options[Math.floor(Math.random() * field.options.length)];
        } else if (field.type === 'number') {
            if (combined.includes('age') || combined.includes('年龄')) data[field.id] = Math.floor(Math.random() * 30) + 22;
            else if (combined.includes('zip') || combined.includes('postal') || combined.includes('邮编')) data[field.id] = parseInt(`${pick(['1', '2', '3', '4', '5'])}${randomDigits(5)}`);
            else if (combined.includes('amount') || combined.includes('金额') || combined.includes('price') || combined.includes('价格')) data[field.id] = Math.floor(Math.random() * 9000) + 1000;
            else data[field.id] = Math.floor(Math.random() * 100) + 1;
        } else if (combined.includes('email') || combined.includes('邮箱')) {
            data[field.id] = `${emailUser}@${emailDomain}`;
        } else if (combined.includes('phone') || combined.includes('tel') || combined.includes('mobile') || combined.includes('手机') || combined.includes('电话')) {
            data[field.id] = phone;
        } else if (combined.includes('url') || combined.includes('website') || combined.includes('link') || combined.includes('网址')) {
            data[field.id] = `https://www.example.com/${enFirst.toLowerCase()}`;
        } else if (combined.includes('first') && combined.includes('name')) {
            data[field.id] = enFirst;
        } else if (combined.includes('last') && combined.includes('name')) {
            data[field.id] = enLast;
        } else if (combined.includes('name') || combined.includes('名称') || combined.includes('姓名') || combined.includes('用户名') || combined.includes('username')) {
            data[field.id] = personName;
        } else if (combined.includes('company') || combined.includes('公司') || combined.includes('单位') || combined.includes('organization')) {
            data[field.id] = pick(COMPANIES);
        } else if (combined.includes('address') || combined.includes('地址')) {
            data[field.id] = `${city}${pick(STREETS)}${Math.floor(Math.random() * 200) + 1}号`;
        } else if (combined.includes('city') || combined.includes('城市')) {
            data[field.id] = city;
        } else if (combined.includes('province') || combined.includes('省') || combined.includes('state')) {
            data[field.id] = city.endsWith('市') ? city : `${city}市`;
        } else if (combined.includes('password') || combined.includes('密码')) {
            data[field.id] = `Sf${randomDigits(4)}@${enFirst.substring(0, 3)}`;
        } else if (combined.includes('bio') || combined.includes('description') || combined.includes('描述') || combined.includes('简介') || combined.includes('about')) {
            data[field.id] = pick(BIOS);
        } else if (combined.includes('title') || combined.includes('标题') || combined.includes('subject') || combined.includes('主题')) {
            data[field.id] = `关于${pick(['项目进展', '合作方案', '产品反馈', '技术方案', '会议安排'])}的讨论`;
        } else if (field.type === 'date') {
            const d = new Date();
            d.setDate(d.getDate() - Math.floor(Math.random() * 365 * 30));
            data[field.id] = d.toISOString().split('T')[0];
        } else {
            data[field.id] = `${personName}的${field.label || '数据'}`;
        }
    });

    return data;
}
