// src/screens/ChatScreen.js
// 对话页面：宠物视频背景（预生成视频循环播放）+ 聊天气泡

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, Image, ImageBackground, Keyboard, Animated, Dimensions,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import Video from 'react-native-video';
import LinearGradient from 'react-native-linear-gradient';
import { NativeModules } from 'react-native';
const SpeechInput = NativeModules.SpeechInput;
const TtsModule = NativeModules.TtsModule;

// 根据宠物性别返回 TTS 音调（模拟约 15 岁的年轻声音）
const getTtsPitch = (gender) => (gender === 'female' ? 1.5 : 1.2);
const TTS_SPEECH_RATE = 1.12;

const cleanTextForTts = (text) => {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u{FE00}-\u{FEFF}]/gu, '')
    .replace(/[*_~`#>]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useApp } from '../store/AppContext';
import { useTranslation } from '../i18n';
import { chatWithPet } from '../services/claudeService';
import { generatePetImage, generatePetVideo } from '../services/customPetService';

const { width, height } = Dimensions.get('window');

const BEDROOM_BG_URL = 'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=900&q=85';

// Max times we'll regenerate the pet image per design session
const MAX_IMAGE_GEN = 30;

const PET_VIDEO_URLS = {
  cat:    'https://pub-c451a570c96c42669957d536571c7401.r2.dev/cat_video_pet.mp4',
  dog:    'https://pub-c451a570c96c42669957d536571c7401.r2.dev/dog.mp4',
  rabbit: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/rabbit.mp4',
  turtle: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/turtle.mp4',
  boy:    'https://pub-c451a570c96c42669957d536571c7401.r2.dev/boy.mp4',
  girl:   'https://pub-c451a570c96c42669957d536571c7401.r2.dev/girl.mp4',
  custom: 'https://your-cdn.example.com/petme/others.mp4', // ⚠️ 用真实 URL 替换
  human:  'https://your-cdn.example.com/petme/human.mp4',
  others: 'https://your-cdn.example.com/petme/others.mp4',
};

const PET_TRICK_VIDEO_URLS = {
  somersault: {
    cat:    'https://pub-c451a570c96c42669957d536571c7401.r2.dev/cat_somersault.mp4',
    dog:    'https://pub-c451a570c96c42669957d536571c7401.r2.dev/dog_somersault.mp4',
    rabbit: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/rabbit_somersault.mp4',
    turtle: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/turtle_somersault.mp4',
    boy:    'https://pub-c451a570c96c42669957d536571c7401.r2.dev/boy_somersault.mp4',
    girl:   'https://pub-c451a570c96c42669957d536571c7401.r2.dev/girl_somersault.mp4',
    custom: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/others_somersault.mp4',
    human:  'https://pub-c451a570c96c42669957d536571c7401.r2.dev/human_somersault.mp4',
    others: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/others_somersault.mp4',
  },
  dance: {
    cat:    'https://pub-c451a570c96c42669957d536571c7401.r2.dev/cat_dance.mp4',
    dog:    'https://pub-c451a570c96c42669957d536571c7401.r2.dev/dog_dance.mp4',
    rabbit: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/rabbit_dance.mp4',
    turtle: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/turtle_dance.mp4',
    boy:    'https://pub-c451a570c96c42669957d536571c7401.r2.dev/boy_dance.mp4',
    girl:   'https://pub-c451a570c96c42669957d536571c7401.r2.dev/girl_dance.mp4',
    custom: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/others_dance.mp4',
    human:  'https://pub-c451a570c96c42669957d536571c7401.r2.dev/human_dance.mp4',
    others: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/others_dance.mp4',
  },
  rest: {
    cat:    'https://pub-c451a570c96c42669957d536571c7401.r2.dev/cat_rest.mov',
    dog:    'https://pub-c451a570c96c42669957d536571c7401.r2.dev/dog_rest.mp4',
    rabbit: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/rabbit_rest.mp4',
    turtle: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/turtle_rest.mp4',
    boy:    'https://pub-c451a570c96c42669957d536571c7401.r2.dev/boy_rest.mp4',
    girl:   'https://pub-c451a570c96c42669957d536571c7401.r2.dev/girl_rest.mp4',
    custom: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/others_rest.mp4',
    human:  'https://pub-c451a570c96c42669957d536571c7401.r2.dev/human_rest.mp4',
    others: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/others_rest.mp4',
  },
  tennis: {
    cat:    'https://pub-c451a570c96c42669957d536571c7401.r2.dev/cat_tennis.mov',
    dog:    'https://pub-c451a570c96c42669957d536571c7401.r2.dev/dog_tennis.mp4',
    rabbit: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/rabbit_tennis.mp4',
    turtle: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/turtle_tennis.mp4',
    boy:    'https://pub-c451a570c96c42669957d536571c7401.r2.dev/boy_tennis.mp4',
    girl:   'https://pub-c451a570c96c42669957d536571c7401.r2.dev/girl_tennis.mp4',
    custom: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/others_tennis.mp4',
    human:  'https://pub-c451a570c96c42669957d536571c7401.r2.dev/human_tennis.mp4',
    others: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/others_tennis.mp4',
  },
};

const TRICKS = ['somersault', 'dance', 'rest', 'tennis'];

const VIDEO_TRIGGERS = {
  '翻跟斗': 'somersault', '翻滚': 'somersault',
  'somersault': 'somersault', 'cartwheel': 'somersault',
  '跳舞': 'dance', '舞蹈': 'dance',
  'dance': 'dance',
  '休息': 'rest', '睡觉': 'rest', '躺下': 'rest',
  'rest': 'rest', 'sleep': 'rest', 'nap': 'rest',
  '网球': 'tennis', '打网球': 'tennis',
  'tennis': 'tennis',
  '跳一下': 'jump', '打滚': 'roll',
  'jump': 'jump', 'roll': 'roll',
};

const ACTION_DISPLAYS = {
  somersault: ['🐾', '🌀', '🐾', '✨'],
  dance: ['💃', '🎵', '🐾', '🎶'],
  jump: ['🦘', '⬆️', '🐾', '✨'],
  roll: ['🔄', '😸', '🐾', '💕'],
};

// ─── Design mode helpers ──────────────────────────────────────────────────────
const isYesResponse = (text) => {
  const t = text.toLowerCase().trim();
  if (/\b(yes|yeah|yep|yup|sure|good|ok|okay|great|perfect|love|nice|awesome|beautiful|amazing)\b/.test(t)) return true;
  if (['满意', '好的', '是的', '可以', '好看', '不错', '喜欢', '太好了', '太棒了', '行', '就这个', '赞'].some(w => t.includes(w))) return true;
  return false;
};

const isNoResponse = (text) => {
  const t = text.toLowerCase().trim();
  if (/\b(no|nope|not really|change|different|again|update|redo|another|try again)\b/.test(t)) return true;
  if (['不满意', '不好', '不行', '不对', '重新', '换', '改', '不喜欢'].some(w => t.includes(w))) return true;
  return false;
};

/** Strip leading rejection words and return the useful description part */
const extractUpdatedDescription = (originalDesc, newText) => {
  const cleaned = newText
    .replace(/^(no|nope|not really|not quite|don'?t like it|不满意|不好|不喜欢)[,\s]*/i, '')
    .trim();
  if (cleaned.length > 8) {
    // Has real feedback — combine with original for continuity
    return `${originalDesc}. Additional details: ${cleaned}`;
  }
  return originalDesc; // Only "no" with no further info — reuse original
};
// ─────────────────────────────────────────────────────────────────────────────

function PetActionBubble({ action, s }) {
  const [frame, setFrame] = useState(0);
  const frames = ACTION_DISPLAYS[action] || ['🐾'];
  useEffect(() => {
    const timer = setInterval(() => setFrame((f) => (f + 1) % frames.length), 400);
    return () => clearInterval(timer);
  }, []);
  const label = {
    dance: s.action_dance,
    somersault: s.action_somersault,
    jump: s.action_jump,
    roll: s.action_roll,
  }[action] || '🐾';
  return (
    <View style={styles.actionBubble}>
      <Text style={styles.actionEmoji}>{frames[frame]}</Text>
      <Text style={styles.actionLabel}>{label}</Text>
    </View>
  );
}

const SHOWIT_ACTIONS = ['eat', 'swim', 'cook', 'read'];

function MessageBubble({ message, petProfile, s, onActionButton }) {
  const isUser = message.role === 'user';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowPet, { opacity: fadeAnim }]}>
      {!isUser && (
        <View style={styles.petAvatarSmall}>
          <Text style={{ fontSize: 20 }}>
            {{ cat: '🐱', dog: '🐶', rabbit: '🐰', turtle: '🐢', boy: '👦', girl: '👧', custom: '✨', human: '🧑', others: '✨' }[petProfile.type] || '🐾'}
          </Text>
        </View>
      )}
      <View style={{ flexShrink: 1 }}>
        {message.videoTrigger && !isUser && <PetActionBubble action={message.videoTrigger} s={s} />}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.petBubble]}>
          <Text style={[styles.bubbleText, isUser ? styles.userBubbleText : styles.petBubbleText]}>
            {message.content}
          </Text>
        </View>
        {/* "showit" quick-action buttons */}
        {message.showActionButtons && !isUser && onActionButton && (
          <View style={styles.showitButtonRow}>
            {SHOWIT_ACTIONS.map((action) => (
              <TouchableOpacity
                key={action}
                style={styles.showitBtn}
                onPress={() => onActionButton(action)}
                activeOpacity={0.75}
              >
                <Text style={styles.showitBtnText}>
                  {s[`showit_btn_${action}`] || action}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <Text style={[styles.timestamp, isUser ? styles.timestampRight : styles.timestampLeft]}>
          {new Date(message.timestamp).toLocaleTimeString(s.chat_time_locale, { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </Animated.View>
  );
}

// ─── "Let me get dressed up" animation for design mode ───────────────────────
function DressUpAnimation({ s }) {
  const textFade  = useRef(new Animated.Value(0.5)).current;
  const spark1Y   = useRef(new Animated.Value(0)).current;
  const spark2Y   = useRef(new Animated.Value(0)).current;
  const spark3Y   = useRef(new Animated.Value(0)).current;
  const emojiScale= useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Pulsing text
    Animated.loop(
      Animated.sequence([
        Animated.timing(textFade,   { toValue: 1,   duration: 1400, useNativeDriver: true }),
        Animated.timing(textFade,   { toValue: 0.45,duration: 1400, useNativeDriver: true }),
      ])
    ).start();

    // Emoji breathing
    Animated.loop(
      Animated.sequence([
        Animated.timing(emojiScale, { toValue: 1.15, duration: 1200, useNativeDriver: true }),
        Animated.timing(emojiScale, { toValue: 1,    duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    // Floating sparkles (staggered)
    const floatSpark = (anim, delay) => {
      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, { toValue: -14, duration: 2200, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 10,  duration: 2200, useNativeDriver: true }),
          ])
        ).start();
      }, delay);
    };
    floatSpark(spark1Y, 0);
    floatSpark(spark2Y, 700);
    floatSpark(spark3Y, 1400);
  }, []);

  return (
    <LinearGradient
      colors={['#160d35', '#2d1b69', '#160d35']}
      style={styles.petBackground}
    >
      {/* Floating sparkles */}
      <Animated.Text style={[styles.dressUpSparkle, { top: '8%',  left: '12%', transform: [{ translateY: spark1Y }] }]}>✨</Animated.Text>
      <Animated.Text style={[styles.dressUpSparkle, { top: '15%', right: '15%',transform: [{ translateY: spark2Y }] }]}>💫</Animated.Text>
      <Animated.Text style={[styles.dressUpSparkle, { top: '60%', left: '8%',  transform: [{ translateY: spark3Y }] }]}>⭐</Animated.Text>
      <Animated.Text style={[styles.dressUpSparkle, { top: '55%', right: '10%',transform: [{ translateY: spark1Y }] }]}>✨</Animated.Text>
      <Animated.Text style={[styles.dressUpSparkle, { top: '30%', left: '5%',  transform: [{ translateY: spark2Y }] }]}>💎</Animated.Text>

      {/* Centre: emoji + text */}
      <View style={styles.dressUpCenter}>
        <Animated.Text style={[styles.dressUpMagicEmoji, { transform: [{ scale: emojiScale }] }]}>🎨</Animated.Text>
        <Animated.Text style={[styles.dressUpText, { opacity: textFade }]}>
          {s.design_dressed_up || '✨ Let me get dressed up ✨'}
        </Animated.Text>
      </View>
    </LinearGradient>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

const TRANSFORM_KEYWORDS_EN = [
  'be a', 'be an', 'become a', 'become an', 'turn into', 'transform into',
  'act like', 'act as', 'pretend to be', 'change into', 'change to',
];
const TRANSFORM_KEYWORDS_ZH = ['变成', '成为', '变为', '装扮成', '扮演'];
const PET_TYPE_KEYWORD_MAP = {
  cat:    ['cat', 'kitty', 'kitten', '猫', '猫咪', '小猫'],
  dog:    ['dog', 'puppy', 'doggy', 'hound', '狗', '小狗', '狗狗'],
  rabbit: ['rabbit', 'bunny', 'hare', '兔', '兔子', '小兔'],
  turtle: ['turtle', 'tortoise', '龟', '乌龟'],
  boy:    ['boy', 'male', 'man', '男孩', '男生', '男'],
  girl:   ['girl', 'female', 'woman', '女孩', '女生', '女'],
  custom: ['human', 'person', '人', '人类'],
};

function detectPetTypeChange(text) {
  const lower = text.toLowerCase();
  const hasTransformKw =
    TRANSFORM_KEYWORDS_EN.some((kw) => lower.includes(kw)) ||
    TRANSFORM_KEYWORDS_ZH.some((kw) => text.includes(kw));
  if (!hasTransformKw) return null;
  for (const [type, keywords] of Object.entries(PET_TYPE_KEYWORD_MAP)) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) return type;
  }
  return 'others';
}

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { state, dispatch, markChatVisited, savePetProfile, saveDesignedPet, updateDesignedPetVideos, incrementVideoCount } = useApp();
  const MAX_VIDEOS = 20;
  const s = useTranslation();
  const { petProfile, messages } = state;
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef(null);

  // ─── Design mode state ───────────────────────────────────────────────────
  // isDesignMode can be updated via setIsDesignMode when the screen is re-focused
  // with designMode:true after already being mounted (e.g. user switches tabs).
  const [isDesignMode, setIsDesignMode] = useState(() => route.params?.designMode === true);

  // Design flow states:
  //   'idle'                - not in design mode
  //   'awaiting_description'- waiting for user to describe the pet
  //   'generating_image'    - DALL-E 3 running
  //   'image_generated'     - image ready, waiting for yes/no
  //   'generating_video'    - Kling AI running in background
  //   'video_ready'         - done
  const [designFlowState, setDesignFlowState]   = useState(isDesignMode ? 'awaiting_description' : 'idle');
  const designFlowStateRef                       = useRef(isDesignMode ? 'awaiting_description' : 'idle');
  const [customImageUrl,  setCustomImageUrl]     = useState(null);
  const customImageUrlRef                        = useRef(null);
  const [customVideoUrl,  setCustomVideoUrl]     = useState(null);
  const customVideoUrlRef                        = useRef(null);   // mirrors state for use in handlers
  const [customVideoUrls, setCustomVideoUrls]    = useState([]);   // all generated videos for this pet
  const customVideoUrlsRef                       = useRef([]);     // ref version for handlers
  const [isGeneratingImage, setIsGeneratingImage]= useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo]= useState(false);
  const [imageGenCount,   setImageGenCount]      = useState(0);
  const [petDescription,  setPetDescription]     = useState('');
  const petDescriptionRef                        = useRef('');
  const isMountedRef                             = useRef(true);

  // Helper to update both state and ref together
  const updateDesignFlowState = (val) => { designFlowStateRef.current = val; setDesignFlowState(val); };
  const updateCustomImageUrl  = (url) => { customImageUrlRef.current  = url; setCustomImageUrl(url); };
  const updatePetDescription  = (desc)=> { petDescriptionRef.current  = desc; setPetDescription(desc); };
  // Update current video (state + ref) and add to collection if new
  const updateCustomVideo = (url) => {
    customVideoUrlRef.current = url;
    setCustomVideoUrl(url);
    if (url && !customVideoUrlsRef.current.includes(url)) {
      const next = [...customVideoUrlsRef.current, url];
      customVideoUrlsRef.current = next;
      setCustomVideoUrls(next);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  // Video state
  const [videoReady, setVideoReady]   = useState(false);
  const videoOpacity                  = useRef(new Animated.Value(0)).current;
  const [activeTrick, setActiveTrick] = useState(null);

  useEffect(() => {
    setVideoReady(false);
    videoOpacity.setValue(0);
  }, [petProfile.type, activeTrick]);

  // When pet type changes AWAY from custom (e.g. user switched back to cat/dog),
  // clear all local design-mode state so the normal pet video takes over.
  useEffect(() => {
    if (petProfile.type !== 'custom') {
      updateCustomImageUrl(null);
      customVideoUrlRef.current = null;
      setCustomVideoUrl(null);
      customVideoUrlsRef.current = [];
      setCustomVideoUrls([]);
      updateDesignFlowState('idle');
      setIsGeneratingImage(false);
      setIsGeneratingVideo(false);
    }
  }, [petProfile.type]);

  // Returning user: restore full video collection from persisted profile
  useEffect(() => {
    if (petProfile.type === 'custom' && customVideoUrlsRef.current.length === 0) {
      // Prefer the full array if saved, otherwise fall back to the single URL
      const savedUrls = (petProfile.customVideoUrls && petProfile.customVideoUrls.length > 0)
        ? petProfile.customVideoUrls
        : (petProfile.customVideoUrl ? [petProfile.customVideoUrl] : []);
      if (savedUrls.length > 0) {
        customVideoUrlsRef.current = savedUrls;
        setCustomVideoUrls(savedUrls);
        // Start with the latest video
        const latest = savedUrls[savedUrls.length - 1];
        customVideoUrlRef.current = latest;
        setCustomVideoUrl(latest);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset opacity whenever a new custom video URL arrives so the fade-in always plays
  useEffect(() => {
    if (customVideoUrl) {
      videoOpacity.setValue(0);
    }
  }, [customVideoUrl]);

  const handleVideoLoad = () => {
    setVideoReady(true);
    Animated.timing(videoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  };

  // Unmount cleanup
  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  // ─── Voice input ─────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const voicePulse    = useRef(new Animated.Value(1)).current;
  const pulseAnimation= useRef(null);

  const startVoicePulse = () => {
    pulseAnimation.current = Animated.loop(
      Animated.sequence([
        Animated.timing(voicePulse, { toValue: 1.25, duration: 500, useNativeDriver: true }),
        Animated.timing(voicePulse, { toValue: 1,    duration: 500, useNativeDriver: true }),
      ])
    );
    pulseAnimation.current.start();
  };
  const stopVoicePulse = () => { pulseAnimation.current?.stop(); voicePulse.setValue(1); };

  const startVoice = async () => {
    if (!SpeechInput) {
      Alert.alert('语音识别不可用', '原生模块未加载，请重新编译 App');
      return;
    }
    try {
      const available = await SpeechInput.isAvailable();
      if (!available) {
        Alert.alert('语音识别不可用', '请安装 Google 语音服务后重试。');
        return;
      }
    } catch (e) {
      Alert.alert('语音识别不可用', String(e?.message || e));
      return;
    }
    try {
      setIsRecording(true);
      startVoicePulse();
      const locale = state.language === 'zh' ? 'zh-CN' : 'en-US';
      const result = await SpeechInput.start(locale);
      if (result) await sendTextDirectly(result);
    } catch (e) {
      Alert.alert('语音识别失败', e?.message || String(e));
    } finally {
      stopVoicePulse();
      setIsRecording(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  const handleVideoTap = () => {
    // Custom pet mode: tap randomly switches between collected videos
    if (isDesignMode || petProfile.type === 'custom') {
      const urls = customVideoUrlsRef.current;
      if (urls.length <= 1) return; // nothing to switch
      const current = customVideoUrlRef.current;
      const others = urls.filter(u => u !== current);
      if (others.length > 0) {
        const next = others[Math.floor(Math.random() * others.length)];
        customVideoUrlRef.current = next;
        setCustomVideoUrl(next);
      }
      return;
    }
    const random = TRICKS[Math.floor(Math.random() * TRICKS.length)];
    setActiveTrick(random);
  };

  const detectVideoTrigger = (text) => {
    for (const [keyword, action] of Object.entries(VIDEO_TRIGGERS)) {
      if (text.includes(keyword)) return action;
    }
    return null;
  };

  // ─── "showit" on-demand video generation ─────────────────────────────────
  const containsShowit = (text) => /\bshowit\b/i.test(text);
  const removeShowit   = (text) => text.replace(/[,，。.!！?？]?\s*showit\s*[!！?？]?/gi, '').trim();

  const handleShowit = async (rawText) => {
    const imageUrl = customImageUrlRef.current || petProfile.customImageUrl;
    if (!imageUrl || isGeneratingVideo) return;

    // ── 20段视频上限检查 ────────────────────────────────────────────────────
    if (state.totalVideosGenerated >= MAX_VIDEOS) {
      Alert.alert(
        s.video_limit_title || 'Video Limit Reached',
        s.video_limit_msg   || 'Sorry, every user is only allowed to generate at most 20 pet videos!',
        [{ text: 'OK' }],
      );
      return;
    }

    // 只传动作部分，无需重复宠物描述（图生视频模型已从图片中获知角色外观）
    const actionDesc = removeShowit(rawText);

    dispatch({ type: 'ADD_MESSAGE', payload: {
      id: Date.now().toString(), role: 'user', content: rawText, timestamp: Date.now(),
    }});
    dispatch({ type: 'ADD_MESSAGE', payload: {
      id: (Date.now() + 1).toString(), role: 'assistant',
      content: s.showit_generating || '🎬 Generating your video, please wait...',
      timestamp: Date.now(),
    }});

    setIsGeneratingVideo(true);
    try {
      const videoUrl = await generatePetVideo(imageUrl, actionDesc);
      if (!isMountedRef.current) return;
      updateCustomVideo(videoUrl);
      await incrementVideoCount();
      // Persist the growing video collection so tap-to-switch survives app restarts
      await savePetProfile({
        customVideoUrl: videoUrl,
        customVideoUrls: customVideoUrlsRef.current,
      });
      // Sync the designed pet's video list (match by imageUrl → no new entry created)
      await updateDesignedPetVideos(imageUrl, videoUrl, customVideoUrlsRef.current);
      // 使用与首次设计完成相同的消息和按钮
      dispatch({ type: 'ADD_MESSAGE', payload: {
        id: (Date.now() + 2).toString(), role: 'assistant',
        content: s.showit_video_ready_message || "🎉 My video is ready! Let's chat!",
        timestamp: Date.now(),
        showActionButtons: true,
      }});
      speakIfEnabled(s.showit_video_ready_message);
    } catch (e) {
      if (!isMountedRef.current) return;
      dispatch({ type: 'ADD_MESSAGE', payload: {
        id: (Date.now() + 2).toString(), role: 'assistant',
        content: `Video generation failed: ${e.message}`,
        timestamp: Date.now(),
      }});
    } finally {
      if (isMountedRef.current) setIsGeneratingVideo(false);
    }
  };

  const handleShowitButton = (action) => {
    const isZh = state.language === 'zh';
    const text = {
      eat:  isZh ? '吃饭，showit'  : 'eating, showit',
      swim: isZh ? '游泳，showit'  : 'swimming, showit',
      cook: isZh ? '做饭，showit'  : 'cooking, showit',
      read: isZh ? '读书，showit'  : 'reading, showit',
    }[action] || action;
    handleShowit(text);
  };
  // ─────────────────────────────────────────────────────────────────────────

  // ─── TTS helper ──────────────────────────────────────────────────────────
  const speakIfEnabled = (text) => {
    if (state.voiceConversationEnabled && TtsModule) {
      const locale = state.language === 'zh' ? 'zh-CN' : 'en-US';
      TtsModule.speak(cleanTextForTts(text), locale, getTtsPitch(petProfile.gender), TTS_SPEECH_RATE).catch(() => {});
    }
  };

  // ─── Helper: add a pet (assistant) message ───────────────────────────────
  const addBotMessage = (content) => {
    dispatch({
      type: 'ADD_MESSAGE',
      payload: { id: Date.now().toString(), role: 'assistant', content, timestamp: Date.now() },
    });
    speakIfEnabled(content);
  };

  // ─── Design mode: background video generation ────────────────────────────
  const generateVideoInBackground = async (imageUrl, description) => {
    try {
      const videoUrl = await generatePetVideo(imageUrl, description);
      if (!isMountedRef.current) return;
      updateCustomVideo(videoUrl);
      updateDesignFlowState('video_ready');
      await incrementVideoCount();
      // Persist to profile so next session picks it up (save full array for tap-to-switch)
      await savePetProfile({
        type: 'custom',
        customImageUrl: imageUrl,
        customVideoUrl: videoUrl,
        customVideoUrls: customVideoUrlsRef.current,
      });
      // Save this pet to the designed pets collection
      const petIndex = state.designedPets.length + 1;
      await saveDesignedPet({
        id: Date.now().toString(),
        label: `designed pet ${petIndex}`,
        name: petProfile.name || '',
        gender: petProfile.gender || 'female',
        imageUrl,
        videoUrl,
        videoUrls: customVideoUrlsRef.current,
      });
      // Show the "showit" invitation message with action buttons
      dispatch({ type: 'ADD_MESSAGE', payload: {
        id: Date.now().toString(), role: 'assistant',
        content: s.showit_video_ready_message || "🎉 My video is ready! Let's chat!",
        timestamp: Date.now(),
        showActionButtons: true,
      }});
      speakIfEnabled(s.showit_video_ready_message);
    } catch (e) {
      if (!isMountedRef.current) return;
      console.error('[Design] Video generation error:', e?.message || e);
      updateDesignFlowState('image_generated'); // fall back to showing image
      setIsGeneratingVideo(false);
      // Show the actual error so we can diagnose it
      addBotMessage(
        `${s.design_error_video || 'Video generation failed.'}\n\n(Error: ${e?.message || String(e)})`
      );
    } finally {
      if (isMountedRef.current) setIsGeneratingVideo(false);
    }
  };

  // ─── Design mode: handle user messages during design flow ────────────────
  const handleDesignMessage = async (text) => {
    const userMsg = { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() };
    dispatch({ type: 'ADD_MESSAGE', payload: userMsg });

    const currentState = designFlowStateRef.current;

    if (currentState === 'awaiting_description') {
      // ── Step 1: Generate image from description ──────────────────────────
      updatePetDescription(text);
      updateDesignFlowState('generating_image');
      setIsGeneratingImage(true);
      setIsTyping(true);
      try {
        const imageUrl = await generatePetImage(text);
        if (!isMountedRef.current) return;
        updateCustomImageUrl(imageUrl);
        setImageGenCount(1);
        updateDesignFlowState('image_generated');
        addBotMessage(s.design_approve_message);
      } catch (e) {
        if (!isMountedRef.current) return;
        console.error('[Design] Image generation error:', e?.message || e);
        updateDesignFlowState('awaiting_description');
        addBotMessage(`Image generation failed: ${e?.message || String(e)}`);
      } finally {
        if (isMountedRef.current) { setIsGeneratingImage(false); setIsTyping(false); }
      }

    } else if (currentState === 'image_generated') {
      // ── Step 2: User reviews image — yes or no ───────────────────────────
      if (isYesResponse(text)) {
        // User satisfied → start video generation
        addBotMessage(s.design_confirm_message);
        updateDesignFlowState('generating_video');
        setIsGeneratingVideo(true);
        generateVideoInBackground(customImageUrlRef.current, petDescriptionRef.current);

      } else if (imageGenCount >= MAX_IMAGE_GEN) {
        // Reached image generation limit → proceed to video anyway
        addBotMessage(s.design_limit_message);
        updateDesignFlowState('generating_video');
        setIsGeneratingVideo(true);
        generateVideoInBackground(customImageUrlRef.current, petDescriptionRef.current);

      } else {
        // User wants changes → regenerate with updated description
        const newDesc = extractUpdatedDescription(petDescriptionRef.current, text);
        updatePetDescription(newDesc);
        updateDesignFlowState('generating_image');
        setIsGeneratingImage(true);
        setIsTyping(true);
        try {
          const imageUrl = await generatePetImage(newDesc);
          if (!isMountedRef.current) return;
          updateCustomImageUrl(imageUrl);
          setImageGenCount((c) => c + 1);
          updateDesignFlowState('image_generated');
          addBotMessage(s.design_approve_message);
        } catch (e) {
          if (!isMountedRef.current) return;
          console.error('[Design] Image re-generation error:', e?.message || e);
          updateDesignFlowState('image_generated'); // stay in same state
          addBotMessage(`Image generation failed: ${e?.message || String(e)}`);
        } finally {
          if (isMountedRef.current) { setIsGeneratingImage(false); setIsTyping(false); }
        }
      }
    }
    // In 'generating_video' / 'video_ready': fall through to normal chat below
  };
  // ─────────────────────────────────────────────────────────────────────────

  // ─── Normal send ─────────────────────────────────────────────────────────
  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || isTyping || isGeneratingImage) return;
    setInputText('');
    Keyboard.dismiss();

    // Intercept for design flow
    const dsState = designFlowStateRef.current;
    if (isDesignMode && (dsState === 'awaiting_description' || dsState === 'image_generated')) {
      await handleDesignMessage(text);
      return;
    }

    // "showit" keyword: generate on-demand video in custom pet mode
    if (isDesignMode && dsState === 'video_ready' && containsShowit(text)) {
      setInputText('');
      Keyboard.dismiss();
      await handleShowit(text);
      return;
    }

    // Normal chat
    if (activeTrick) setActiveTrick(null);
    const userMsg = { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() };
    dispatch({ type: 'ADD_MESSAGE', payload: userMsg });
    setIsTyping(true);
    try {
      const { reply, newMemory, petTypeChange } = await chatWithPet(text, petProfile);
      const videoTrigger = detectVideoTrigger(reply) || detectVideoTrigger(text);
      dispatch({ type: 'ADD_MESSAGE', payload: { id: (Date.now() + 1).toString(), role: 'assistant', content: reply, timestamp: Date.now(), videoTrigger } });
      if (newMemory) dispatch({ type: 'ADD_MEMORY', payload: newMemory });
      if (videoTrigger && PET_TRICK_VIDEO_URLS[videoTrigger]) setActiveTrick(videoTrigger);
      const effectiveTypeChange = petTypeChange || detectPetTypeChange(text);
      if (effectiveTypeChange && effectiveTypeChange !== petProfile.type) await savePetProfile({ type: effectiveTypeChange });
      speakIfEnabled(reply);
    } catch (error) {
      dispatch({ type: 'ADD_MESSAGE', payload: { id: (Date.now() + 1).toString(), role: 'assistant', content: `${s.chat_error_prefix}${error.message}`, timestamp: Date.now() } });
    } finally {
      setIsTyping(false);
    }
  };

  const sendTextDirectly = async (text) => {
    // Intercept for design flow
    const dsState = designFlowStateRef.current;
    if (isDesignMode && (dsState === 'awaiting_description' || dsState === 'image_generated')) {
      await handleDesignMessage(text);
      return;
    }

    // "showit" keyword: generate on-demand video in custom pet mode
    if (isDesignMode && dsState === 'video_ready' && containsShowit(text)) {
      await handleShowit(text);
      return;
    }

    if (activeTrick) setActiveTrick(null);
    const userMsg = { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() };
    dispatch({ type: 'ADD_MESSAGE', payload: userMsg });
    setIsTyping(true);
    try {
      const { reply, newMemory, petTypeChange } = await chatWithPet(text, petProfile);
      const videoTrigger = detectVideoTrigger(reply) || detectVideoTrigger(text);
      dispatch({ type: 'ADD_MESSAGE', payload: { id: (Date.now() + 1).toString(), role: 'assistant', content: reply, timestamp: Date.now(), videoTrigger } });
      if (newMemory) dispatch({ type: 'ADD_MEMORY', payload: newMemory });
      if (videoTrigger && PET_TRICK_VIDEO_URLS[videoTrigger]) setActiveTrick(videoTrigger);
      const effectiveTypeChange = petTypeChange || detectPetTypeChange(text);
      if (effectiveTypeChange && effectiveTypeChange !== petProfile.type) await savePetProfile({ type: effectiveTypeChange });
      speakIfEnabled(reply);
    } catch (error) {
      dispatch({ type: 'ADD_MESSAGE', payload: { id: (Date.now() + 1).toString(), role: 'assistant', content: `${s.chat_error_prefix}${error.message}`, timestamp: Date.now() } });
    } finally {
      setIsTyping(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  // ─── Design mode: activate whenever the screen is focused with designMode param ─
  // useFocusEffect fires on mount AND every time the screen comes back into focus,
  // so it correctly handles the case where Chat is already mounted but the user
  // navigated back from Settings with designMode:true.
  useFocusEffect(
    useCallback(() => {
      const dm = route.params?.designMode;
      if (!dm) return; // nothing to do
      // Entering (or re-entering) design mode
      setIsDesignMode(true);
      designFlowStateRef.current = 'awaiting_description';
      setDesignFlowState('awaiting_description');
      // Reset any leftover design artefacts from a previous session
      setCustomImageUrl(null);
      customImageUrlRef.current = null;
      setCustomVideoUrl(null);
      customVideoUrlRef.current = null;
      customVideoUrlsRef.current = [];
      setCustomVideoUrls([]);
      setIsGeneratingImage(false);
      setIsGeneratingVideo(false);
      setImageGenCount(0);
      dispatch({ type: 'SET_MESSAGES', payload: [] });
      navigation.setParams({ designMode: undefined }); // consume the param
      setTimeout(() => {
        if (isMountedRef.current) {
          dispatch({
            type: 'ADD_MESSAGE',
            payload: { id: `design_intro_${Date.now()}`, role: 'assistant', content: s.design_initial_message, timestamp: Date.now() },
          });
          speakIfEnabled(s.design_initial_message);
        }
      }, 300);
    }, [route.params?.designMode]), // re-run whenever the param changes
  );

  // ─── Initialisation ──────────────────────────────────────────────────────
  useEffect(() => {
    markChatVisited();

    const initialMessage = route.params?.initialMessage;

    if (initialMessage) {
      navigation.setParams({ initialMessage: undefined });
      sendTextDirectly(initialMessage);
      return;
    }

    if (messages.length === 0 && petProfile.name) {
      const greet = petProfile.type === 'cat' ? s.chat_greet_cat
        : petProfile.type === 'dog' ? s.chat_greet_dog
        : s.chat_greet_other;
      dispatch({
        type: 'ADD_MESSAGE',
        payload: { id: 'greeting', role: 'assistant', content: `${greet}  ${state.language === 'zh' ? '我是' : "I'm "}${petProfile.name}${s.chat_greet_suffix}`, timestamp: Date.now() },
      });
    }
  }, []);
  // ─────────────────────────────────────────────────────────────────────────

  const petEmoji = { cat: '🐱', dog: '🐶', rabbit: '🐰', turtle: '🐢', boy: '👦', girl: '👧', custom: '✨', human: '🧑', others: '✨' }[petProfile.type] || '🐾';
  const trickUrls       = activeTrick ? PET_TRICK_VIDEO_URLS[activeTrick] : null;
  const currentVideoUrl = trickUrls
    ? (trickUrls[petProfile.type] || trickUrls.others)
    : (PET_VIDEO_URLS[petProfile.type] || PET_VIDEO_URLS.others);

  // ─── Video area renderer ─────────────────────────────────────────────────
  const renderVideoArea = () => {
    // Priority 1: design mode dress-up animation (before any image is generated)
    if (isDesignMode && !customImageUrl) {
      return <DressUpAnimation s={s} />;
    }

    // Priority 2: design mode with a generated image (video fades in silently when ready)
    if (isDesignMode && customImageUrl) {
      return (
        <View style={styles.petBackground}>
          {/* Image stays visible at all times as the base layer */}
          <Image
            source={{ uri: customImageUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          {/* Video fades in on top once it becomes available — no overlay, no loading indicator */}
          {customVideoUrl ? (
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: videoOpacity }]}>
              <Video
                source={{ uri: customVideoUrl }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                repeat
                muted={false}
                paused={false}
                onLoad={handleVideoLoad}
                onError={() => {}}
              />
            </Animated.View>
          ) : null}
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleVideoTap} />
        </View>
      );
    }

    // Priority 3: custom type with a previously saved image/video (returning user)
    if (petProfile.type === 'custom' && petProfile.customImageUrl) {
      // Prefer the locally-tracked URL (showit videos update this), fall back to saved profile URL
      const displayVideoUrl = customVideoUrl || petProfile.customVideoUrl;
      return (
        <View style={styles.petBackground}>
          <Image
            source={{ uri: petProfile.customImageUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          {displayVideoUrl && (
            <Animated.View style={[StyleSheet.absoluteFill, { opacity: videoOpacity }]}>
              <Video
                source={{ uri: displayVideoUrl }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                repeat
                muted
                paused={false}
                onLoad={handleVideoLoad}
                onError={() => {}}
              />
            </Animated.View>
          )}
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleVideoTap} />
        </View>
      );
    }

    // Priority 4: user uploaded a custom avatar (static background + portrait)
    if (petProfile.avatarUri) {
      return (
        <ImageBackground source={{ uri: BEDROOM_BG_URL }} style={styles.petBackground} resizeMode="cover">
          <LinearGradient
            colors={['transparent', 'rgba(248,246,255,0.25)', 'rgba(248,246,255,0.92)']}
            style={styles.bgGradient}
          />
          <View style={styles.petOnBed}>
            <Image source={{ uri: petProfile.avatarUri }} style={styles.petPortrait} />
          </View>
        </ImageBackground>
      );
    }

    // Priority 5: default pre-generated video mode
    return (
      <View style={styles.petBackground}>
        {!videoReady && (
          <View style={[StyleSheet.absoluteFill, styles.videoLoadingBg]}>
            <Text style={styles.videoLoadingEmoji}>{petEmoji}</Text>
          </View>
        )}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: videoOpacity }]}>
          <Video
            source={{ uri: currentVideoUrl }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            repeat
            muted
            paused={false}
            onLoad={handleVideoLoad}
            onError={() => setVideoReady(false)}
          />
        </Animated.View>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleVideoTap} />
      </View>
    );
  };
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
    >
      {/* Video / image area */}
      {renderVideoArea()}

      {/* Gradient transition strip */}
      <LinearGradient
        colors={['transparent', '#ffffff']}
        style={styles.transitionGradient}
        pointerEvents="none"
      />

      {/* Trick buttons — hidden during design mode */}
      {!isDesignMode && (
        <View style={styles.trickButtonRow}>
          {TRICKS.map((trick) => (
            <TouchableOpacity
              key={trick}
              style={[styles.trickBtn, activeTrick === trick && styles.trickBtnActive]}
              onPress={() => setActiveTrick(activeTrick === trick ? null : trick)}
            >
              <Text style={[styles.trickBtnLabel, activeTrick === trick && styles.trickBtnLabelActive]}>
                {s[`trick_${trick}`] || trick}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Chat messages */}
      <View style={styles.chatArea}>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              petProfile={petProfile}
              s={s}
              onActionButton={handleShowitButton}
            />
          )}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          showsVerticalScrollIndicator={false}
        />
        {/* Typing / generating indicator */}
        {(isTyping || isGeneratingImage) && (
          <View style={[styles.messageRow, styles.messageRowPet]}>
            <View style={styles.petAvatarSmall}>
              <Text style={{ fontSize: 20 }}>{petEmoji}</Text>
            </View>
            <View style={[styles.bubble, styles.petBubble, styles.typingBubble]}>
              <ActivityIndicator size="small" color="#6B5FE3" />
              <Text style={styles.typingText}>
                {isGeneratingImage
                  ? (s.design_generating || 'Generating...')
                  : s.chat_thinking}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Recording status bar */}
      {isRecording && (
        <View style={styles.recordingBar}>
          <Text style={styles.recordingText}>{s.voice_listening}</Text>
          <Text style={styles.recordingHint}>{s.voice_release}</Text>
        </View>
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder={s.chat_placeholder}
          placeholderTextColor="#aaa"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
          multiline
          maxLength={500}
        />
        <Animated.View style={{ transform: [{ scale: voicePulse }] }}>
          <TouchableOpacity
            style={[styles.voiceBtn, isRecording && styles.voiceBtnActive]}
            onPress={startVoice}
            disabled={isRecording}
          >
            <Text style={{ fontSize: 22 }}>{isRecording ? '🔴' : '🎤'}</Text>
          </TouchableOpacity>
        </Animated.View>
        <TouchableOpacity
          style={[styles.sendBtn, (!inputText.trim() || isTyping || isGeneratingImage) && styles.sendBtnDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || isTyping || isGeneratingImage}
        >
          <Text style={styles.sendBtnText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  petBackground: { height: height * 0.40, overflow: 'hidden', justifyContent: 'flex-end', alignItems: 'center' },
  bgGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%' },
  transitionGradient: { height: 28, marginTop: -28 },
  videoLoadingBg: { backgroundColor: '#E8E4FF', justifyContent: 'center', alignItems: 'center' },
  videoLoadingEmoji: { fontSize: 80, opacity: 0.5 },
  petOnBed: { alignItems: 'center', marginBottom: -10 },
  petPortrait: {
    width: 130, height: 130, borderRadius: 65,
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 8,
  },
  // Video generating overlay
  videoGenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  videoGenText: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center', paddingHorizontal: 24 },
  // Dress-up animation
  dressUpSparkle: { position: 'absolute', fontSize: 22 },
  dressUpCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  dressUpMagicEmoji: { fontSize: 52, marginBottom: 14 },
  dressUpText: { fontSize: 17, color: '#E0D0FF', fontWeight: '700', textAlign: 'center', letterSpacing: 0.8 },
  // Trick buttons
  // showit quick-action buttons (below chat bubble)
  showitButtonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, paddingLeft: 2 },
  showitBtn: {
    backgroundColor: '#6B5FE3', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 6,
  },
  showitBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  // Trick buttons
  trickButtonRow: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8, backgroundColor: '#fff' },
  trickBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#F0EEFF', borderWidth: 1, borderColor: '#E0DAFF',
  },
  trickBtnActive: { backgroundColor: '#6B5FE3', borderColor: '#6B5FE3' },
  trickBtnLabel: { fontSize: 12, color: '#6B5FE3', fontWeight: '600' },
  trickBtnLabelActive: { color: '#fff' },
  // Chat
  chatArea: { flex: 1, backgroundColor: '#F8F6FF' },
  messageList: { padding: 16, paddingBottom: 8 },
  messageRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  messageRowUser: { justifyContent: 'flex-end' },
  messageRowPet: { justifyContent: 'flex-start' },
  petAvatarSmall: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0EEFF', justifyContent: 'center', alignItems: 'center', marginRight: 8, marginBottom: 4 },
  bubble: { maxWidth: width * 0.68, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  userBubble: { backgroundColor: '#FFF9C4', borderBottomRightRadius: 4 },
  petBubble: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  userBubbleText: { color: '#3D3000' },
  petBubbleText: { color: '#2D2060' },
  timestamp: { fontSize: 11, color: '#aaa', marginTop: 3 },
  timestampRight: { textAlign: 'right', marginRight: 4 },
  timestampLeft: { textAlign: 'left', marginLeft: 44 },
  typingBubble: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  typingText: { color: '#9090B0', fontSize: 13 },
  actionBubble: { backgroundColor: '#F0EEFF', borderRadius: 16, padding: 12, marginBottom: 6, alignItems: 'center', marginLeft: 44 },
  actionEmoji: { fontSize: 48 },
  actionLabel: { fontSize: 13, color: '#6B5FE3', marginTop: 4, fontWeight: '600' },
  // Input
  inputBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F0EEFF',
  },
  input: {
    flex: 1, minHeight: 44, maxHeight: 100,
    backgroundColor: '#F3F1FF', borderRadius: 22,
    paddingHorizontal: 18, paddingVertical: 10,
    fontSize: 15, color: '#2D2060', marginRight: 8,
  },
  voiceBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 6, backgroundColor: 'transparent' },
  voiceBtnActive: { backgroundColor: '#FFE8E8' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#6B5FE3', justifyContent: 'center', alignItems: 'center' },
  sendBtnDisabled: { backgroundColor: '#C8C4E8' },
  sendBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  recordingBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 8, backgroundColor: '#FFF0F0', borderTopWidth: 1, borderTopColor: '#FFD0D0' },
  recordingText: { fontSize: 14, color: '#E03030', fontWeight: '600' },
  recordingHint: { fontSize: 12, color: '#E03030', opacity: 0.7 },
});
