// src/services/glmService.js
// GLM-4.7-flash 对话服务 + 记忆/历史管理（Web 版，使用 localStorage）

import axios from 'axios';

// ─── API Key（统一在 src/config.js 管理） ────────────────────────────────────
import { GLM_API_KEY, OPENAI_API_KEY, FAL_KEY } from '../config';
export { GLM_API_KEY, OPENAI_API_KEY }; // re-export（保持向后兼容）

const GLM_API_URL = 'https://api.z.ai/api/paas/v4/chat/completions';
const GLM_MODEL   = 'glm-4.7-flash';

const MEMORY_KEY       = 'pet_memories';
const CONVERSATIONS_KEY = 'conversation_history';

// ===== 记忆管理 =====

export const loadMemories = () => {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export const saveMemory = (memory) => {
  const memories = loadMemories();
  const newMemory = { id: Date.now().toString(), content: memory, createdAt: new Date().toISOString() };
  memories.push(newMemory);
  localStorage.setItem(MEMORY_KEY, JSON.stringify(memories));
  return newMemory;
};

export const deleteMemory = (id) => {
  const memories = loadMemories().filter(m => m.id !== id);
  localStorage.setItem(MEMORY_KEY, JSON.stringify(memories));
};

// ===== 对话历史管理 =====

export const loadConversations = () => {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

export const appendMessage = (role, content) => {
  const history = loadConversations();
  history.push({ role, content });
  const trimmed = history.slice(-50);
  localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(trimmed));
  return trimmed;
};

export const clearConversations = () => {
  localStorage.removeItem(CONVERSATIONS_KEY);
};

// ===== 主对话函数 =====

export const chatWithPet = async (userMessage, petProfile) => {
  const memories = loadMemories();
  const history  = loadConversations();

  const memorySummary = memories.length > 0
    ? `\n\n[Your memories about the user]:\n${memories.map(m => `- ${m.content}`).join('\n')}`
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

  const hasChinese = /[\u4e00-\u9fa5]/.test(userMessage);
  const langHint = hasChinese
    ? '\n\n⚠️ LANGUAGE REMINDER: The user\'s current message is in Chinese. Your reply MUST be entirely in Chinese. Do NOT use English.'
    : '\n\n⚠️ LANGUAGE REMINDER: The user\'s current message is in English. Your reply MUST be entirely in English. Do NOT use Chinese.';
  const finalSystemPrompt = systemPrompt + langHint;

  const recentHistory = history.slice(-20).map(m => ({
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

  let parsed;
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
  } catch {
    parsed = { reply: rawText, memory_to_save: null };
  }

  appendMessage('user', userMessage);
  appendMessage('assistant', parsed.reply);

  let newMemory = null;
  if (parsed.memory_to_save) {
    newMemory = saveMemory(parsed.memory_to_save);
  }

  const VALID_TYPES = ['cat', 'dog', 'rabbit', 'turtle', 'human', 'others'];
  const petTypeChange = parsed.pet_type_change && VALID_TYPES.includes(parsed.pet_type_change)
    ? parsed.pet_type_change : null;

  return { reply: parsed.reply, newMemory, petTypeChange };
};

// ===== DALL-E 3 图像生成 =====

function hasBackground(desc) {
  if (!desc) return false;
  const keywords = ['草地','森林','海边','海滩','山','花园','公园','室内','室外','户外',
    '沙发','床','桌子','椅子','地板','阳台','天空','沙漠','雪地','雨中',
    '街道','城市','乡村','田野','河边','湖边','背景','场景','环境','站在',
    '坐在','躺在','趴在','处于','位于',
    'grass','forest','beach','ocean','sea','mountain','garden','park',
    'indoor','outdoor','outside','inside','sofa','couch','bed','floor',
    'desert','snow','rain','street','city','field','lake','river',
    'background','scene','setting','standing on','sitting on','lying on',
    'in the','on the','at the','under the','next to',
  ];
  const lower = desc.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

export async function generatePetImage(description) {
  const key = OPENAI_API_KEY;
  if (!key) throw new Error('OpenAI API key is not set.');
  const bg = hasBackground(description);
  const backgroundLines = bg
    ? ['Natural lighting that fits the scene.']
    : [
        'The character is sitting comfortably on a living room sofa, looking directly at the viewer with a warm and friendly expression.',
        'Cozy indoor living room setting, soft natural lighting.',
      ];
  const prompt = [
    'CRITICAL REQUIREMENT: absolutely zero text, zero letters, zero words, zero numbers, zero captions, zero watermarks, zero labels, zero typography of any kind anywhere in the image. The image must contain only the character and scene, with no written content whatsoever.',
    `A lifelike, photorealistic character: ${description}.`,
    ...backgroundLines,
    'Highly realistic, photo-quality render — NOT cartoon, NOT anime, NOT illustrated.',
    'Full body visible, sharp details, cinematic realism.',
  ].join(' ');

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size: '1024x1024', quality: 'standard' }),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(`DALL-E HTTP ${res.status}: ${e.error?.message || res.statusText}`);
  }
  const data = await res.json();
  const url = data?.data?.[0]?.url;
  if (!url) throw new Error('No image URL returned from DALL-E 3');
  return url;
}

// ===== fal.ai 视频生成 =====

const FAL_QUEUE    = 'https://queue.fal.run/fal-ai/wan-i2v';

const sleep = ms => new Promise(r => setTimeout(r, ms));

export async function generatePetVideo(imageUrl, description) {
  const action = description ? description.trim() : null;
  const prompt = action
    ? `The character in the uploaded image is ${action} naturally and expressively. Fluid, life-like movement with a comfortable pace. The character in the video must look exactly the same as the character in the uploaded image.`
    : 'The character in the uploaded image moves naturally and expressively — relaxed but clearly animated, with visible head turns, body sways, and gestures. The character in the video must look exactly the same as the character in the uploaded image.';

  const headers = { 'Authorization': `Key ${FAL_KEY}`, 'Content-Type': 'application/json' };

  const submitRes = await fetch(FAL_QUEUE, {
    method: 'POST', headers,
    body: JSON.stringify({ image_url: imageUrl, prompt, resolution: '480p' }),
  });
  const submitText = await submitRes.text();
  if (!submitRes.ok) throw new Error(`fal.ai submit failed (${submitRes.status}): ${submitText}`);
  const { request_id } = JSON.parse(submitText);
  if (!request_id) throw new Error('fal.ai did not return a request_id');

  for (let i = 0; i < 60; i++) {
    await sleep(5000);
    const statusRes = await fetch(`${FAL_QUEUE}/requests/${request_id}/status`, { headers });
    if (!statusRes.ok) continue;
    const statusData = await statusRes.json();
    const status = (statusData?.status || '').toUpperCase();
    if (status === 'COMPLETED') {
      const resultRes = await fetch(`${FAL_QUEUE}/requests/${request_id}`, { headers });
      const resultData = await resultRes.json();
      const videoUrl = resultData?.video?.url || resultData?.videos?.[0]?.url;
      if (!videoUrl) throw new Error('fal.ai returned no video URL');
      return videoUrl;
    }
    if (status === 'FAILED') throw new Error(`fal.ai video generation failed: ${statusData?.error || 'unknown'}`);
  }
  throw new Error('fal.ai video generation timed out after 5 minutes');
}
