// src/services/imageGenService.js
// 使用 OpenAI GPT Image 1（低质量档）生成宠物场景双帧图
// 帧A：嘴巴轻闭  帧B：嘴巴微张，在 React Native 中交替 crossfade 形成嘴巴开合动画
// GPT Image 1 低质量档约 $0.005/张，双帧合计约 $0.01/次（并行生成，耗时与单张相当）

import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── API Key（统一在 src/config.js 管理） ────────────────────────────────────
import { OPENAI_API_KEY } from '../config';

const OPENAI_IMAGE_URL = 'https://api.openai.com/v1/images/generations';

// 双帧缓存 Key（v1）
const FRAMES_CACHE_KEY = 'pet_scene_frames_cache_v1';
// 旧单帧缓存（保留供 clearPetSceneCache 一并清除）
const LEGACY_CACHE_KEY = 'pet_scene_image_cache_v2';

/**
 * 每种宠物类型的基础场景描述。
 * 核心要求：宠物坐在卧室床上，直视镜头，像在面对面聊天，背景温馨逼真。
 * 嘴巴状态（帧A/帧B）通过后缀注入，确保两帧整体构图保持一致。
 */
const PET_SCENE_PROMPTS = {
  cat: [
    'A cute fluffy cat sitting comfortably on a cozy bedroom bed,',
    'looking directly at the camera with warm and friendly eyes,',
    'realistic pet photography style, warm amber bedroom lighting,',
    'soft pillows and wrinkled blankets in the background,',
    'shallow depth of field, intimate face-to-face conversation atmosphere,',
    'the cat appears relaxed and attentive, high quality photo',
  ].join(' '),

  dog: [
    'A friendly dog sitting on a cozy bedroom bed,',
    'looking directly at the camera with bright happy eyes,',
    'realistic pet photography, warm ambient bedroom lighting,',
    'soft pillows visible in the background, shallow depth of field,',
    'face-to-face conversation feeling, the dog appears alert and joyful,',
    'high quality photo',
  ].join(' '),

  rabbit: [
    'An adorable fluffy rabbit sitting upright on a cozy bedroom bed,',
    'looking curiously and warmly at the camera,',
    'realistic pet photography, warm soft bedroom lighting,',
    'comfortable bedding with pillows, shallow depth of field,',
    'intimate and cozy atmosphere, high quality photo',
  ].join(' '),

  turtle: [
    'A cute and expressive turtle sitting on a cozy bedroom bed,',
    'looking directly at the camera with friendly eyes,',
    'realistic photography, warm bedroom lighting,',
    'soft blankets and pillows around it, comfortable bedroom setting,',
    'shallow depth of field, high quality photo',
  ].join(' '),

  human: [
    'A friendly young person sitting cross-legged on a cozy bedroom bed,',
    'smiling warmly at the camera, casual comfortable clothes,',
    'warm ambient bedroom lighting, soft pillows in the background,',
    'casual and intimate face-to-face conversation atmosphere,',
    'shallow depth of field, high quality photo',
  ].join(' '),

  others: [
    'A cute fantastical magical creature sitting on a cozy bedroom bed,',
    'looking at the camera with big friendly expressive eyes,',
    'warm bedroom lighting, soft bedding and pillows,',
    'whimsical and magical atmosphere, shallow depth of field,',
    'high quality illustration-meets-photo style',
  ].join(' '),
};

// 嘴巴状态后缀（注入到每种宠物的基础 prompt 末尾，尽量保证两帧整体构图一致）
const MOUTH_CLOSED = ', mouth gently closed, calm and serene expression, still pose';
const MOUTH_OPEN   = ', mouth slightly open as if softly vocalizing or gently speaking, gentle expression, still pose';

/**
 * 内部工具：调用 GPT Image 1 API 生成单张图，返回 data URI。
 * @param {string} prompt
 * @returns {Promise<string>} data:image/png;base64,...
 */
const callImageAPI = async (prompt) => {
  const response = await axios.post(
    OPENAI_IMAGE_URL,
    {
      model: 'gpt-image-1',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'low',  // 低质量档，约 $0.005/张
    },
    {
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 90000,  // 双帧并行时单张最多等 90s
    }
  );
  const base64 = response.data.data[0].b64_json;
  return `data:image/png;base64,${base64}`;
};

/**
 * 并行生成双帧场景图（帧A嘴闭 + 帧B嘴张），并缓存到 AsyncStorage。
 * 两帧使用相同的基础 prompt，仅嘴巴描述不同，尽量保证构图接近。
 * @param {object} petProfile - { type, name, ... }
 * @returns {Promise<{ frameA: string, frameB: string }>} data URI 对象
 */
export const generatePetSceneFrames = async (petProfile) => {
  const petType = petProfile.type || 'cat';
  const basePrompt = PET_SCENE_PROMPTS[petType] || PET_SCENE_PROMPTS.others;

  // 并行生成两张图，总耗时约等于单张生成时间
  const [frameA, frameB] = await Promise.all([
    callImageAPI(basePrompt + MOUTH_CLOSED),
    callImageAPI(basePrompt + MOUTH_OPEN),
  ]);

  // data URI 不会过期，仅在宠物类型变更时才需要重新生成
  await AsyncStorage.setItem(
    FRAMES_CACHE_KEY,
    JSON.stringify({ frameA, frameB, petType, generatedAt: Date.now() })
  );

  return { frameA, frameB };
};

/**
 * 从缓存读取双帧 data URI。
 * 仅当宠物类型变更时才视为无效，否则永久有效（data URI 不过期）。
 * @param {object} petProfile - { type, ... }
 * @returns {Promise<{ frameA: string, frameB: string } | null>}
 */
export const loadCachedPetSceneFrames = async (petProfile) => {
  try {
    const raw = await AsyncStorage.getItem(FRAMES_CACHE_KEY);
    if (!raw) return null;

    const cached = JSON.parse(raw);

    // 兼容性检查：必须同时有两帧
    if (!cached.frameA || !cached.frameB) return null;

    // 宠物类型不同时视为无效，返回 null 触发重新生成
    if (cached.petType !== (petProfile.type || 'cat')) return null;

    return { frameA: cached.frameA, frameB: cached.frameB };
  } catch {
    return null;
  }
};

/**
 * 清除所有场景图缓存（包括旧版单帧缓存）
 */
export const clearPetSceneCache = async () => {
  await AsyncStorage.multiRemove([FRAMES_CACHE_KEY, LEGACY_CACHE_KEY]);
};

// ── 向后兼容（旧版单帧接口，ChatScreen 已不使用，保留以防万一）──────────────
export const generatePetScene = async (petProfile) => {
  const { frameA } = await generatePetSceneFrames(petProfile);
  return frameA;
};

export const loadCachedPetScene = async (petProfile) => {
  const frames = await loadCachedPetSceneFrames(petProfile);
  return frames ? frames.frameA : null;
};
