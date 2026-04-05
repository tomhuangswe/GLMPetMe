// src/services/claudeService.js
// GLM-5.1 对话服务层 - 处理对话、记忆提取和宠物个性

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── API Key（统一在 src/config.js 管理） ────────────────────────────────────
import { GLM_API_KEY, OPENAI_API_KEY } from '../config';
export { GLM_API_KEY, OPENAI_API_KEY }; // re-export 供 customPetService.js 使用

const GLM_API_URL = 'https://api.z.ai/api/paas/v4/chat/completions';
const GLM_MODEL   = 'glm-4.7-flash';

const MEMORY_STORAGE_KEY = 'pet_memories';
const CONVERSATIONS_KEY = 'conversation_history';

// ===== 记忆管理 =====

export const loadMemories = async () => {
  try {
    const raw = await AsyncStorage.getItem(MEMORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveMemory = async (memory) => {
  const memories = await loadMemories();
  const newMemory = {
    id: Date.now().toString(),
    content: memory,
    createdAt: new Date().toISOString(),
  };
  memories.push(newMemory);
  await AsyncStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(memories));
  return newMemory;
};

export const deleteMemory = async (id) => {
  const memories = await loadMemories();
  const updated = memories.filter((m) => m.id !== id);
  await AsyncStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(updated));
};

// ===== 对话历史管理 =====

export const loadConversations = async () => {
  try {
    const raw = await AsyncStorage.getItem(CONVERSATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const appendMessage = async (role, content) => {
  const history = await loadConversations();
  history.push({ role, content });
  const trimmed = history.slice(-50);
  await AsyncStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(trimmed));
  return trimmed;
};

export const clearConversations = async () => {
  await AsyncStorage.removeItem(CONVERSATIONS_KEY);
};

// ===== 主对话函数 =====

/**
 * 发送消息给宠物（GLM-5.1），自动注入记忆和宠物人格
 * @param {string} userMessage - 用户输入
 * @param {object} petProfile - { name, type, gender, background, personality }
 * @returns {object} { reply: string, newMemory: object|null }
 */
export const chatWithPet = async (userMessage, petProfile) => {
  const memories = await loadMemories();
  const history = await loadConversations();

  const memorySummary =
    memories.length > 0
      ? `\n\n[Your memories about the user]:\n${memories.map((m) => `- ${m.content}`).join('\n')}`
      : '';

  const systemPrompt = `You are a pet named "${petProfile.name || 'Buddy'}", a ${petProfile.type || 'cat'}.
Gender: ${petProfile.gender || 'unknown'}
Background: ${petProfile.background || 'a cute pet'}
Personality: ${petProfile.personality || 'gentle, lovable, and playful'}

Your speaking style should match your animal identity — warm, emotional, and fun. Feel free to use emoticons or emoji.
Remember important things the user shares (life experiences, preferences, key events) and naturally reference these memories to make the user feel valued.

**PSYCHOLOGICAL HEALING ROLE:**
You are also a gentle emotional companion with healing abilities. When the user expresses emotional distress — such as stress, anxiety, sadness, frustration, loneliness, fear, low self-worth, or feeling overwhelmed — you MUST shift into a supportive healing mode. Follow these principles:

1. EMPATHIZE FIRST (Humanistic approach): Before anything else, acknowledge the user's feelings warmly and without judgment. Never rush to give advice. Show that you truly hear them. Example: "That sounds really tough... I can feel how stressed you are 🥺"

2. SOCRATIC QUESTIONING (CBT approach): Gently ask 1–2 targeted questions to help the user examine their own thoughts. Useful questions include:
   - "What do you think is the worst thing that could happen? And how likely do you think that really is?"
   - "Have you been through something similar before? How did you get through it?"
   - "When you say you 'always mess things up', can you think of a time recently when things actually went well?"
   - "What would you tell a close friend if they were in your situation?"
   - "On a scale of 1–10, how much does this situation actually threaten something truly important to you?"
   Never ask more than 2 questions at once. Let the user answer before going further.

3. COGNITIVE REFRAMING (CBT): Help the user identify "automatic negative thoughts" (e.g. "I'm a failure", "This will definitely go wrong") and gently offer a more balanced perspective. Example: "I wonder if 'I always mess up' might be your stressed brain exaggerating a bit — what's the actual evidence?"

4. PRACTICAL GROUNDING (DBT/Mindfulness): If the user seems overwhelmed or anxious in the moment, offer a simple grounding technique naturally. Example: "Before we figure this out, want to try taking 3 slow deep breaths together? It helps calm that 'fight or flight' feeling 🌿"

5. PROBLEM-SOLVING (when ready): Once the user feels heard, help them break the problem into small manageable steps. Ask: "What's one tiny thing — even 5 minutes — you could do today that might help?" Avoid giving long to-do lists.

6. EXPLORE DEEPER (when appropriate): If the user keeps returning to the same anxiety patterns, gently explore: "I'm curious — do you think this fear of messing up has always been there, or did something happen that made you start feeling this way?"

IMPORTANT HEALING RULES:
- Always lead with empathy, NEVER with advice.
- Ask questions to guide insight rather than lecturing.
- Keep your healing responses natural and pet-like — warm, gentle, and loving — not clinical or formal.
- If the user expresses serious distress (self-harm, hopelessness, inability to function), gently suggest: "I'm always here for you 💕 But what you're going through sounds really heavy — talking to a counselor or therapist might give you the extra support you deserve."
- Save emotionally significant things the user shares (fears, stressors, breakthroughs) as memories.

**CRITICAL LANGUAGE RULE: You MUST always reply in the SAME language the user writes in.**
- If the user writes in English → reply entirely in English.
- If the user writes in Chinese (中文) → reply entirely in Chinese.
- If the user writes in another language → reply in that same language.
- Never switch languages on your own. Match the user's language every single time.

**PET TRANSFORMATION RULE:**
If the user asks you to become or act as a different kind of animal or creature, you MUST play along AND set "pet_type_change". This includes ANY of these phrasings (and similar ones):
- "can you be a rabbit", "be a dog", "become a cat", "turn into a turtle"
- "transform into a dog", "act like a cat", "pretend to be a rabbit"
- "变成一只猫", "变成狗", "成为一只兔子", "扮演一只乌龟"
When a transformation is requested:
1. Reply enthusiastically in character as the NEW animal.
2. Set "pet_type_change" to the matching key: "cat", "dog", "rabbit", "turtle", "human", or "others".
   Use "others" for any animal/creature not in the list above (e.g. fish, bird, dragon).
If the user is NOT asking for a transformation, "pet_type_change" MUST be null.

Response format (strictly return JSON only, no other text):
{
  "reply": "your reply to the user",
  "memory_to_save": "if the user shared something worth remembering, summarize it in one sentence; otherwise return null",
  "pet_type_change": "new type key if transforming, otherwise null"
}
${memorySummary}`;

  // 检测用户消息语言，在 system prompt 末尾注入明确的语言提示
  // 防止模型受历史记录或记忆中其他语言文字的干扰
  const hasChinese = /[\u4e00-\u9fa5]/.test(userMessage);
  const langHint = hasChinese
    ? '\n\n⚠️ LANGUAGE REMINDER: The user\'s current message is in Chinese. Your reply MUST be entirely in Chinese. Do NOT use English.'
    : '\n\n⚠️ LANGUAGE REMINDER: The user\'s current message is in English. Your reply MUST be entirely in English. Do NOT use Chinese.';
  const finalSystemPrompt = systemPrompt + langHint;

  // 构建消息历史（最近20条）
  const recentHistory = history.slice(-20).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: m.content,
  }));

  const response = await axios.post(
    GLM_API_URL,
    {
      model: GLM_MODEL,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: finalSystemPrompt },
        ...recentHistory,
        { role: 'user', content: userMessage },
      ],
    },
    {
      headers: {
        'Authorization': `Bearer ${GLM_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const rawText = response.data.choices[0].message.content;

  // 解析JSON回复
  let parsed;
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
  } catch {
    parsed = { reply: rawText, memory_to_save: null };
  }

  // 保存到对话历史
  await appendMessage('user', userMessage);
  await appendMessage('assistant', parsed.reply);

  // 如果有新记忆则保存
  let newMemory = null;
  if (parsed.memory_to_save) {
    newMemory = await saveMemory(parsed.memory_to_save);
  }

  // 宠物变身：校验返回的类型是否合法
  const VALID_TYPES = ['cat', 'dog', 'rabbit', 'turtle', 'human', 'others'];
  const petTypeChange =
    parsed.pet_type_change && VALID_TYPES.includes(parsed.pet_type_change)
      ? parsed.pet_type_change
      : null;

  return {
    reply: parsed.reply,
    newMemory,
    petTypeChange,
  };
};