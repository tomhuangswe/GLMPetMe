// src/services/customPetService.js
// DALL-E 3 image generation + fal.ai (Wan 2.1 480p) image-to-video

// ─── API Key（统一在 src/config.js 管理） ────────────────────────────────────
import { OPENAI_API_KEY as SHARED_OPENAI_KEY, FAL_KEY } from '../config';

// 使用 Wan 2.1 480p 图生视频模型，$0.20/个视频（默认 720p 为 $0.40，这里强制 480p）
// 文档: https://fal.ai/models/fal-ai/wan-i2v/api
const FAL_MODEL_ID   = 'fal-ai/wan-i2v';
const FAL_QUEUE_BASE = `https://queue.fal.run/${FAL_MODEL_ID}`;
// ─────────────────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 带有超时控制的 fetch 包装器
 */
async function fetchWithTimeout(url, options, timeoutMs = 120000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(`请求超时：超过了 ${timeoutMs / 1000} 秒`);
    }
    throw error;
  }
}

/**
 * 判断用户描述中是否已经指定了背景/场景。
 * 如果包含表示地点、环境、背景的关键词，则返回 true。
 */
function _hasBackground(desc) {
  if (!desc) return false;
  // 中英文常见背景关键词
  const keywords = [
    // 中文
    '草地', '森林', '海边', '海滩', '山', '花园', '公园', '室内', '室外', '户外',
    '沙发', '床', '桌子', '椅子', '地板', '阳台', '天空', '沙漠', '雪地', '雨中',
    '街道', '城市', '乡村', '田野', '河边', '湖边', '背景', '场景', '环境', '站在',
    '坐在', '躺在', '趴在', '处于', '位于',
    // English
    'grass', 'forest', 'beach', 'ocean', 'sea', 'mountain', 'garden', 'park',
    'indoor', 'outdoor', 'outside', 'inside', 'sofa', 'couch', 'bed', 'floor',
    'desert', 'snow', 'rain', 'street', 'city', 'field', 'lake', 'river',
    'background', 'scene', 'setting', 'standing on', 'sitting on', 'lying on',
    'in the', 'on the', 'at the', 'under the', 'next to',
  ];
  const lower = desc.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

export async function generatePetImage(description) {
  const key = SHARED_OPENAI_KEY;
  if (!key) throw new Error('OpenAI API key is not set in claudeService.js.');

  // 如果用户描述中已经包含背景信息，则尊重用户的设定，不再强制设定沙发场景
  const hasBackground = _hasBackground(description);
  const backgroundLines = hasBackground
    ? [
        // 用户已指定背景，只保留光照和画质要求
        'Natural lighting that fits the scene.',
      ]
    : [
        // 用户未指定背景，默认设定为客厅沙发
        'The character is sitting comfortably on a living room sofa, looking directly at the viewer with a warm and friendly expression.',
        'Cozy indoor living room setting, soft natural lighting.',
      ];

  const prompt = [
    `A lifelike, photorealistic character: ${description}.`,
    ...backgroundLines,
    'Highly realistic, photo-quality render — NOT cartoon, NOT anime, NOT illustrated.',
    'Full body visible, sharp details, cinematic realism.',
    'No text, no letters, no words, no captions, no watermarks anywhere in the image.',
  ].join(' ');

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model:   'dall-e-3',
      prompt,
      n:       1,
      size:    '1024x1024',
      quality: 'standard',
    }),
  });

  if (!response.ok) {
    let errMsg = `HTTP ${response.status}`;
    try {
      const e = await response.json();
      errMsg = e.error?.message || e.error?.code || errMsg;
    } catch (_) {}
    console.error('[DALL-E] Error response:', response.status, errMsg);
    throw new Error(`DALL-E HTTP ${response.status}: ${errMsg}`);
  }

  const data = await response.json();
  const url  = data?.data?.[0]?.url;
  if (!url) throw new Error('No image URL returned from DALL-E 3');
  return url;
}

// ─── fal.ai Wan 2.1 图生视频 ──────────────────────────────────────────────────
/**
 * 使用 fal.ai Wan 2.1 模型将宠物图片生成视频。
 *
 * fal.ai Queue REST API 流程：
 *   1. POST /queue → 提交任务，得到 request_id
 *   2. GET  /queue/requests/{id}/status → 轮询状态
 *   3. GET  /queue/requests/{id}        → 获取结果
 *
 * @param {string} imageUrl   - 宠物静态图片的公开 URL（DALL-E 返回的 URL）
 * @param {string} description - 宠物描述文字（用于 prompt）
 * @returns {Promise<string>}  生成的视频 URL
 */
export async function generatePetVideo(imageUrl, description) {
  if (!FAL_KEY || FAL_KEY === 'YOUR_FAL_API_KEY_HERE') {
    throw new Error('fal.ai API Key 未配置，请在 customPetService.js 中填入 FAL_KEY。');
  }

  const falHeaders = {
    'Authorization': `Key ${FAL_KEY}`,
    'Content-Type':  'application/json',
  };

  // ── 步骤 1：提交任务 ───────────────────────────────────────────────────────
  // 图生视频模型已经从上传的图片中获知角色外观，无需在 prompt 中重复描述宠物。
  // 只需描述动作内容和运动风格，最后强调视频角色与图片中保持一致。
  const action = description ? description.trim() : null;
  const prompt = action
    ? `The character in the uploaded image is ${action} naturally and expressively. Fluid, life-like movement with a comfortable pace — noticeable body motion, head turns, and gestures that feel organic and realistic. The character in the video must look exactly the same as the character in the uploaded image.`
    : 'The character in the uploaded image moves naturally and expressively — relaxed but clearly animated, with visible head turns, body sways, and gestures. Fluid, life-like motion at a comfortable pace. The character in the video must look exactly the same as the character in the uploaded image.';

  const submitBody = JSON.stringify({
    image_url:  imageUrl,
    prompt,
    resolution: '480p',
    // num_frames は指定しない → デフォルト 81 フレーム（≈5 秒）を維持
  });

  console.log('[fal.ai] Submitting video task...');
  const submitResp = await fetchWithTimeout(
    FAL_QUEUE_BASE,
    { method: 'POST', headers: falHeaders, body: submitBody },
    30000,
  );

  const submitText = await submitResp.text();
  if (!submitResp.ok) {
    throw new Error(`fal.ai submit failed (${submitResp.status}): ${submitText}`);
  }

  const submitData = JSON.parse(submitText);
  const requestId  = submitData?.request_id;
  if (!requestId) throw new Error('fal.ai did not return a request_id');
  console.log('[fal.ai] Task submitted, request_id:', requestId);

  // ── 步骤 2：轮询任务状态 ───────────────────────────────────────────────────
  // Wan 2.1 通常 60–120 秒完成；最多等待 5 分钟（60次 × 5秒）
  const STATUS_URL = `${FAL_QUEUE_BASE}/requests/${requestId}/status`;
  const MAX_ATTEMPTS = 60;

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    await sleep(5000);

    try {
      const statusResp = await fetchWithTimeout(
        STATUS_URL,
        { method: 'GET', headers: falHeaders },
        15000,
      );

      if (!statusResp.ok) {
        console.warn(`[fal.ai] 轮询第 ${i + 1} 次状态请求失败 (${statusResp.status})`);
        continue;
      }

      const statusData = await statusResp.json();
      const status = (statusData?.status || '').toUpperCase();
      console.log(`[fal.ai] 轮询第 ${i + 1} 次: ${status}`);

      if (status === 'COMPLETED') {
        // ── 步骤 3：获取结果 ───────────────────────────────────────────────
        const resultResp = await fetchWithTimeout(
          `${FAL_QUEUE_BASE}/requests/${requestId}`,
          { method: 'GET', headers: falHeaders },
          15000,
        );

        const resultText = await resultResp.text();
        if (!resultResp.ok) {
          throw new Error(`fal.ai result fetch failed (${resultResp.status}): ${resultText}`);
        }

        const resultData = JSON.parse(resultText);
        const videoUrl   = resultData?.video?.url || resultData?.videos?.[0]?.url;
        if (!videoUrl) {
          throw new Error(`fal.ai returned no video URL. Response: ${resultText}`);
        }

        console.log('[fal.ai] Video ready:', videoUrl);
        return videoUrl;
      }

      if (status === 'FAILED') {
        const errMsg = statusData?.error || statusData?.detail || '未知错误';
        throw new Error(`fal.ai video generation failed: ${errMsg}`);
      }

      // IN_QUEUE 或 IN_PROGRESS → 继续等待
    } catch (pollErr) {
      if (pollErr.message.includes('failed:') || pollErr.message.includes('failed')) {
        // 非超时类的致命错误直接抛出
        if (!pollErr.message.includes('超时')) throw pollErr;
      }
      console.warn(`[fal.ai] 轮询第 ${i + 1} 次出错:`, pollErr.message);
    }
  }

  throw new Error('fal.ai video generation timed out after 5 minutes');
}
