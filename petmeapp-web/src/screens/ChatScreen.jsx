// src/screens/ChatScreen.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../store/AppContext';
import { useTranslation } from '../i18n';
import { chatWithPet, generatePetImage, generatePetVideo, clearConversations } from '../services/glmService';

const PET_EMOJIS = {
  cat: '🐱', dog: '🐶', rabbit: '🐰', turtle: '🐢',
  boy: '👦', girl: '👧', custom: '✨', human: '🧑', others: '✨',
};

const PET_VIDEO_URLS = {
  cat:    'https://pub-c451a570c96c42669957d536571c7401.r2.dev/cat_video_pet.mp4',
  dog:    'https://pub-c451a570c96c42669957d536571c7401.r2.dev/dog.mp4',
  rabbit: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/rabbit.mp4',
  turtle: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/turtle.mp4',
  boy:    'https://pub-c451a570c96c42669957d536571c7401.r2.dev/boy.mp4',
  girl:   'https://pub-c451a570c96c42669957d536571c7401.r2.dev/girl.mp4',
};

const PET_TRICK_VIDEO_URLS = {
  somersault: {
    cat: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/cat_somersault.mp4',
    dog: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/dog_somersault.mp4',
    rabbit: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/rabbit_somersault.mp4',
    turtle: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/turtle_somersault.mp4',
    boy: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/boy_somersault.mp4',
    girl: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/girl_somersault.mp4',
  },
  dance: {
    cat: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/cat_dance.mp4',
    dog: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/dog_dance.mp4',
    rabbit: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/rabbit_dance.mp4',
    turtle: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/turtle_dance.mp4',
    boy: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/boy_dance.mp4',
    girl: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/girl_dance.mp4',
  },
  rest: {
    cat: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/cat_rest.mov',
    dog: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/dog_rest.mp4',
    rabbit: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/rabbit_rest.mp4',
    turtle: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/turtle_rest.mp4',
    boy: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/boy_rest.mp4',
    girl: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/girl_rest.mp4',
  },
  tennis: {
    cat: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/cat_tennis.mov',
    dog: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/dog_tennis.mp4',
    rabbit: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/rabbit_tennis.mp4',
    turtle: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/turtle_tennis.mp4',
    boy: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/boy_tennis.mp4',
    girl: 'https://pub-c451a570c96c42669957d536571c7401.r2.dev/girl_tennis.mp4',
  },
};

const TRICKS = ['somersault', 'dance', 'rest', 'tennis'];
const TRICK_LABELS = { somersault: 'trick_somersault', dance: 'trick_dance', rest: 'trick_rest', tennis: 'trick_tennis' };

const VIDEO_TRIGGERS = {
  '翻跟斗': 'somersault', '翻滚': 'somersault', 'somersault': 'somersault', 'cartwheel': 'somersault',
  '跳舞': 'dance', '舞蹈': 'dance', 'dance': 'dance',
  '休息': 'rest', '睡觉': 'rest', '躺下': 'rest', 'rest': 'rest', 'sleep': 'rest', 'nap': 'rest',
  '网球': 'tennis', '打网球': 'tennis', 'tennis': 'tennis',
};

const isYesResponse = (text) => {
  const t = text.toLowerCase().trim();
  if (/\b(yes|yeah|yep|yup|sure|good|ok|okay|great|perfect|love|nice|awesome|beautiful|amazing)\b/.test(t)) return true;
  if (['满意','好的','是的','可以','好看','不错','喜欢','太好了','太棒了','行','就这个','赞'].some(w => t.includes(w))) return true;
  return false;
};
const isNoResponse = (text) => {
  const t = text.toLowerCase().trim();
  if (/\b(no|nope|not really|change|different|again|update|redo|another|try again)\b/.test(t)) return true;
  if (['不满意','不好','不行','不对','重新','换','改','不喜欢'].some(w => t.includes(w))) return true;
  return false;
};
const extractUpdatedDescription = (original, newText) => {
  const cleaned = newText.replace(/^(no|nope|not really|not quite|don'?t like it|不满意|不好|不喜欢)[,\s]*/i, '').trim();
  return cleaned.length > 8 ? `${original}. Additional details: ${cleaned}` : original;
};
const containsShowit = (text) => /\bshowit\b/i.test(text);
const removeShowit   = (text) => text.replace(/[,，。.!！?？]?\s*showit\s*[!！?？]?/gi, '').trim();

const MAX_IMAGE_GEN = 30;
const MAX_VIDEOS    = 20;
const SHOWIT_ACTIONS = ['eat', 'swim', 'cook', 'read'];

// ─── speak via Web Speech Synthesis ───────────────────────────────────────────
function speakText(text, lang, gender) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(
    text.replace(/[\u{1F300}-\u{1FAFF}]/gu, '').replace(/[*_~`#>]/g, '').trim()
  );
  utterance.lang  = lang === 'zh' ? 'zh-CN' : 'en-US';
  utterance.pitch = gender === 'female' ? 1.5 : 1.2;
  utterance.rate  = 1.12;
  window.speechSynthesis.speak(utterance);
}

// ─── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ message, petProfile, s, onActionButton }) {
  const isUser = message.role === 'user';
  return (
    <div style={{ ...bubbleCss.row, ...(isUser ? bubbleCss.rowUser : bubbleCss.rowPet) }}>
      {!isUser && (
        <div style={bubbleCss.petAvatar}>
          <span style={{ fontSize: 20 }}>
            {PET_EMOJIS[petProfile.type] || '🐾'}
          </span>
        </div>
      )}
      <div style={{ flexShrink: 1 }}>
        <div style={{ ...bubbleCss.bubble, ...(isUser ? bubbleCss.userBubble : bubbleCss.petBubble) }}>
          <span style={{ ...bubbleCss.bubbleText, ...(isUser ? bubbleCss.userBubbleText : bubbleCss.petBubbleText) }}>
            {message.content}
          </span>
        </div>
        {/* showit 快捷按钮 */}
        {message.showActionButtons && !isUser && onActionButton && (
          <div style={bubbleCss.showitRow}>
            {SHOWIT_ACTIONS.map(action => (
              <button key={action} style={bubbleCss.showitBtn} onClick={() => onActionButton(action)}>
                {s[`showit_btn_${action}`] || action}
              </button>
            ))}
          </div>
        )}
        <span style={{ ...bubbleCss.timestamp, ...(isUser ? bubbleCss.tsRight : bubbleCss.tsLeft) }}>
          {new Date(message.timestamp).toLocaleTimeString(s.chat_time_locale, { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

// ─── Design mode sparkle animation overlay ─────────────────────────────────────
function DressUpOverlay({ s }) {
  return (
    <div style={dressCss.overlay}>
      <span style={{ ...dressCss.sparkle, top: '8%', left: '12%' }}>✨</span>
      <span style={{ ...dressCss.sparkle, top: '15%', right: '15%' }}>💫</span>
      <span style={{ ...dressCss.sparkle, top: '60%', left: '8%' }}>⭐</span>
      <span style={{ ...dressCss.sparkle, top: '55%', right: '10%' }}>✨</span>
      <div style={dressCss.center}>
        <span style={dressCss.emoji}>🎨</span>
        <p style={dressCss.text}>{s.design_dressed_up}</p>
      </div>
    </div>
  );
}

export default function ChatScreen() {
  const { state, dispatch, savePetProfile, saveDesignedPet, updateDesignedPetVideos, incrementVideoCount } = useApp();
  const s = useTranslation();
  const { petProfile, messages } = state;

  const [inputText,        setInputText]        = useState('');
  const [isTyping,         setIsTyping]          = useState(false);
  const [activeTrick,      setActiveTrick]       = useState(null);
  const [isRecording,      setIsRecording]       = useState(false);
  const messagesEndRef = useRef(null);
  const isMountedRef   = useRef(true);

  // ── Design mode ───────────────────────────────────────────────────────────
  const [isDesignMode,       setIsDesignMode]       = useState(false);
  const [designFlowState,    setDesignFlowState]    = useState('idle');
  const designFlowStateRef   = useRef('idle');
  const [customImageUrl,     setCustomImageUrl]     = useState(null);
  const customImageUrlRef    = useRef(null);
  const [customVideoUrl,     setCustomVideoUrl]     = useState(null);
  const customVideoUrlRef    = useRef(null);
  const [customVideoUrls,    setCustomVideoUrls]    = useState([]);
  const customVideoUrlsRef   = useRef([]);
  const [isGeneratingImage,  setIsGeneratingImage]  = useState(false);
  const [isGeneratingVideo,  setIsGeneratingVideo]  = useState(false);
  const [imageGenCount,      setImageGenCount]      = useState(0);
  const [petDescription,     setPetDescription]     = useState('');
  const petDescriptionRef    = useRef('');

  const updateDesignFlowState = (val) => { designFlowStateRef.current = val; setDesignFlowState(val); };
  const updateCustomImageUrl  = (url) => { customImageUrlRef.current  = url; setCustomImageUrl(url); };
  const updatePetDescription  = (desc) => { petDescriptionRef.current = desc; setPetDescription(desc); };
  const updateCustomVideo = (url) => {
    customVideoUrlRef.current = url; setCustomVideoUrl(url);
    if (url && !customVideoUrlsRef.current.includes(url)) {
      const next = [...customVideoUrlsRef.current, url];
      customVideoUrlsRef.current = next; setCustomVideoUrls(next);
    }
  };

  // Restore custom pet video on mount
  useEffect(() => {
    if (petProfile.type === 'custom' && customVideoUrlsRef.current.length === 0) {
      const savedUrls = (petProfile.customVideoUrls?.length > 0)
        ? petProfile.customVideoUrls
        : (petProfile.customVideoUrl ? [petProfile.customVideoUrl] : []);
      if (savedUrls.length > 0) {
        customVideoUrlsRef.current = savedUrls; setCustomVideoUrls(savedUrls);
        const latest = savedUrls[savedUrls.length - 1];
        customVideoUrlRef.current = latest; setCustomVideoUrl(latest);
      }
    }
    if (petProfile.customImageUrl) updateCustomImageUrl(petProfile.customImageUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Read initialMessage from sessionStorage (set by HomeScreen)
  useEffect(() => {
    const initMsg = sessionStorage.getItem('initialMessage');
    if (initMsg) {
      sessionStorage.removeItem('initialMessage');
      setTimeout(() => sendTextDirectly(initMsg), 300);
    }
    // Greet if first visit
    if (messages.length === 0) {
      const petType = petProfile.type || 'cat';
      const greetSound = petType === 'cat' ? s.chat_greet_cat : petType === 'dog' ? s.chat_greet_dog : s.chat_greet_other;
      const greetMsg = {
        id: Date.now().toString(), role: 'assistant',
        content: greetSound + s.chat_greet_suffix,
        timestamp: Date.now(),
      };
      dispatch({ type: 'ADD_MESSAGE', payload: greetMsg });
    }
    // Design mode flag
    const designFlag = sessionStorage.getItem('designMode');
    if (designFlag === 'true') {
      sessionStorage.removeItem('designMode');
      setIsDesignMode(true);
      updateDesignFlowState('awaiting_description');
      dispatch({ type: 'SET_MESSAGES', payload: [] });
      setTimeout(() => {
        const initDesignMsg = {
          id: Date.now().toString(), role: 'assistant',
          content: s.design_initial_message, timestamp: Date.now(),
        };
        dispatch({ type: 'ADD_MESSAGE', payload: initDesignMsg });
      }, 300);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { return () => { isMountedRef.current = false; }; }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // ── Image generation flow ─────────────────────────────────────────────────
  const generateImageAndAsk = async (description) => {
    if (imageGenCount >= MAX_IMAGE_GEN) {
      updateDesignFlowState('image_generated');
      const msg = { id: Date.now().toString(), role: 'assistant', content: s.design_limit_message, timestamp: Date.now() };
      dispatch({ type: 'ADD_MESSAGE', payload: msg });
      generateVideoInBackground(customImageUrlRef.current, description);
      return;
    }
    setIsGeneratingImage(true);
    updateDesignFlowState('generating_image');
    const generatingMsg = { id: Date.now().toString(), role: 'assistant', content: s.design_generating, timestamp: Date.now() };
    dispatch({ type: 'ADD_MESSAGE', payload: generatingMsg });
    try {
      const imageUrl = await generatePetImage(description);
      if (!isMountedRef.current) return;
      setImageGenCount(c => c + 1);
      updateCustomImageUrl(imageUrl);
      await savePetProfile({ customImageUrl: imageUrl, avatarUri: null });
      dispatch({ type: 'SET_MESSAGES', payload: state.messages.filter(m => m.content !== s.design_generating) });
      const approveMsg = { id: Date.now().toString(), role: 'assistant', content: s.design_approve_message, timestamp: Date.now() };
      dispatch({ type: 'ADD_MESSAGE', payload: approveMsg });
      updateDesignFlowState('image_generated');
    } catch (e) {
      if (!isMountedRef.current) return;
      const errMsg = { id: Date.now().toString(), role: 'assistant', content: s.design_error_image, timestamp: Date.now() };
      dispatch({ type: 'ADD_MESSAGE', payload: errMsg });
      updateDesignFlowState('awaiting_description');
    } finally { if (isMountedRef.current) setIsGeneratingImage(false); }
  };

  const generateVideoInBackground = async (imageUrl, description) => {
    if (!imageUrl) return;
    if (state.totalVideosGenerated >= MAX_VIDEOS) {
      alert(s.video_limit_msg || 'Video limit reached!');
      return;
    }
    updateDesignFlowState('generating_video');
    setIsGeneratingVideo(true);
    const hintMsg = { id: Date.now().toString(), role: 'assistant', content: s.design_video_generating_hint, timestamp: Date.now() };
    dispatch({ type: 'ADD_MESSAGE', payload: hintMsg });
    try {
      const videoUrl = await generatePetVideo(imageUrl, description);
      if (!isMountedRef.current) return;
      updateCustomVideo(videoUrl);
      await incrementVideoCount();
      await savePetProfile({ customVideoUrl: videoUrl, customVideoUrls: customVideoUrlsRef.current });
      await saveDesignedPet({
        id: Date.now().toString(),
        label: `Pet #${(state.designedPets?.length || 0) + 1}`,
        name: petProfile.name || '',
        gender: petProfile.gender || 'female',
        imageUrl, videoUrl, videoUrls: customVideoUrlsRef.current,
      });
      updateDesignFlowState('video_ready');
      dispatch({ type: 'SET_MESSAGES', payload: state.messages.filter(m => m.content !== s.design_video_generating_hint) });
      const readyMsg = {
        id: Date.now().toString(), role: 'assistant',
        content: s.design_video_ready_message, timestamp: Date.now(),
        showActionButtons: true,
      };
      dispatch({ type: 'ADD_MESSAGE', payload: readyMsg });
      setIsDesignMode(false);
    } catch (e) {
      if (!isMountedRef.current) return;
      updateDesignFlowState('video_ready');
      const errMsg = { id: Date.now().toString(), role: 'assistant', content: s.design_error_video, timestamp: Date.now() };
      dispatch({ type: 'ADD_MESSAGE', payload: errMsg });
      setIsDesignMode(false);
    } finally { if (isMountedRef.current) setIsGeneratingVideo(false); }
  };

  // ── showit on-demand video ─────────────────────────────────────────────────
  const handleShowit = async (rawText) => {
    const imageUrl = customImageUrlRef.current || petProfile.customImageUrl;
    if (!imageUrl || isGeneratingVideo) return;
    if (state.totalVideosGenerated >= MAX_VIDEOS) { alert(s.video_limit_msg); return; }
    const actionDesc = removeShowit(rawText);
    dispatch({ type: 'ADD_MESSAGE', payload: { id: Date.now().toString(), role: 'user', content: rawText, timestamp: Date.now() } });
    dispatch({ type: 'ADD_MESSAGE', payload: { id: (Date.now()+1).toString(), role: 'assistant', content: s.showit_generating, timestamp: Date.now() } });
    setIsGeneratingVideo(true);
    try {
      const videoUrl = await generatePetVideo(imageUrl, actionDesc);
      if (!isMountedRef.current) return;
      updateCustomVideo(videoUrl);
      await incrementVideoCount();
      await savePetProfile({ customVideoUrl: videoUrl, customVideoUrls: customVideoUrlsRef.current });
      await updateDesignedPetVideos(imageUrl, videoUrl, customVideoUrlsRef.current);
      dispatch({ type: 'SET_MESSAGES', payload: state.messages.filter(m => m.content !== s.showit_generating) });
      dispatch({ type: 'ADD_MESSAGE', payload: {
        id: (Date.now()+2).toString(), role: 'assistant',
        content: s.showit_video_ready_message, timestamp: Date.now(), showActionButtons: true,
      }});
    } catch (e) {
      if (!isMountedRef.current) return;
      dispatch({ type: 'ADD_MESSAGE', payload: { id: (Date.now()+3).toString(), role: 'assistant', content: s.design_error_video, timestamp: Date.now() } });
    } finally { if (isMountedRef.current) setIsGeneratingVideo(false); }
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const sendTextDirectly = useCallback(async (text) => {
    if (!text.trim() || isTyping) return;

    // Design mode handling
    if (isDesignMode || designFlowStateRef.current !== 'idle') {
      const state_ = designFlowStateRef.current;
      if (state_ === 'awaiting_description') {
        const desc = text.trim();
        dispatch({ type: 'ADD_MESSAGE', payload: { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() } });
        updatePetDescription(desc);
        await generateImageAndAsk(desc);
        return;
      }
      if (state_ === 'image_generated') {
        dispatch({ type: 'ADD_MESSAGE', payload: { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() } });
        if (isYesResponse(text)) {
          const confirmMsg = { id: (Date.now()+1).toString(), role: 'assistant', content: s.design_confirm_message, timestamp: Date.now() };
          dispatch({ type: 'ADD_MESSAGE', payload: confirmMsg });
          // Web app: skip video generation, save pet and continue chat directly
          await savePetProfile({ customImageUrl: customImageUrlRef.current, customVideoUrl: null });
          await saveDesignedPet({
            id: Date.now().toString(),
            label: `Pet #${(state.designedPets?.length || 0) + 1}`,
            name: petProfile.name || '',
            gender: petProfile.gender || 'female',
            imageUrl: customImageUrlRef.current,
            videoUrl: null,
            videoUrls: [],
          });
          updateDesignFlowState('video_ready');
          setIsDesignMode(false);
          return;
        }
        if (isNoResponse(text)) {
          const newDesc = extractUpdatedDescription(petDescriptionRef.current, text);
          updatePetDescription(newDesc);
          await generateImageAndAsk(newDesc);
          return;
        }
        const newDesc = extractUpdatedDescription(petDescriptionRef.current, text);
        updatePetDescription(newDesc);
        await generateImageAndAsk(newDesc);
        return;
      }
      if (state_ === 'generating_image' || state_ === 'generating_video') return;
    }

    // showit check - web app skips video generation, strips keyword and continues as normal chat
    if (containsShowit(text) && petProfile.type === 'custom' && (customImageUrlRef.current || petProfile.customImageUrl)) {
      text = removeShowit(text) || text;
      // fall through to normal chat below
    }

    const userMsg = { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() };
    dispatch({ type: 'ADD_MESSAGE', payload: userMsg });

    // Video trigger
    let videoTrigger = null;
    for (const [kw, action] of Object.entries(VIDEO_TRIGGERS)) {
      if (text.includes(kw)) { videoTrigger = action; break; }
    }
    if (videoTrigger) setActiveTrick(videoTrigger);

    setIsTyping(true);
    try {
      const { reply, newMemory, petTypeChange } = await chatWithPet(text, petProfile);
      if (!isMountedRef.current) return;
      const petMsg = { id: (Date.now()+1).toString(), role: 'assistant', content: reply, timestamp: Date.now(), videoTrigger };
      dispatch({ type: 'ADD_MESSAGE', payload: petMsg });
      if (newMemory) dispatch({ type: 'ADD_MEMORY', payload: newMemory });
      if (petTypeChange) {
        savePetProfile({ type: petTypeChange });
        setActiveTrick(null);
      }
      if (state.voiceConversationEnabled) speakText(reply, state.language, petProfile.gender);
    } catch (e) {
      if (!isMountedRef.current) return;
      const errMsg = { id: (Date.now()+2).toString(), role: 'assistant', content: s.chat_error_prefix + (e.message || ''), timestamp: Date.now() };
      dispatch({ type: 'ADD_MESSAGE', payload: errMsg });
    } finally { if (isMountedRef.current) setIsTyping(false); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTyping, isDesignMode, petProfile, state.language, state.voiceConversationEnabled, s]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    const msg = inputText.trim();
    setInputText('');
    sendTextDirectly(msg);
  };

  const handleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert(s.voice_not_available); return; }
    const recognition = new SR();
    recognition.lang = state.language === 'zh' ? 'zh-CN' : 'en-US';
    setIsRecording(true);
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setIsRecording(false);
      if (text) { setInputText(''); sendTextDirectly(text); }
    };
    recognition.onerror = () => { setIsRecording(false); alert(s.voice_not_available); };
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  const handleVideoTap = () => {
    if (petProfile.type === 'custom') {
      const urls = customVideoUrlsRef.current;
      if (urls.length <= 1) return;
      const others = urls.filter(u => u !== customVideoUrlRef.current);
      if (others.length > 0) {
        const next = others[Math.floor(Math.random() * others.length)];
        customVideoUrlRef.current = next; setCustomVideoUrl(next);
      }
      return;
    }
    const random = TRICKS[Math.floor(Math.random() * TRICKS.length)];
    setActiveTrick(random);
  };

  // Determine current video URL
  const currentVideoUrl = (() => {
    if (petProfile.type === 'custom' && customVideoUrl) return customVideoUrl;
    if (petProfile.type === 'custom') return null;
    const base = PET_VIDEO_URLS[petProfile.type];
    if (activeTrick) return PET_TRICK_VIDEO_URLS[activeTrick]?.[petProfile.type] || base;
    return base;
  })();

  const currentImageUrl = petProfile.type === 'custom' ? (customImageUrl || petProfile.customImageUrl) : null;
  const showDressUp = isDesignMode && designFlowState === 'generating_image';

  return (
    <div style={css.container}>
      {/* ── Video/image background (top half) ── */}
      <div style={css.petArea} onClick={handleVideoTap}>
        {showDressUp ? (
          <DressUpOverlay s={s} />
        ) : currentImageUrl && !currentVideoUrl ? (
          <img src={currentImageUrl} alt="pet" style={css.petBgImg} />
        ) : currentVideoUrl ? (
          <video
            key={currentVideoUrl}
            src={currentVideoUrl} autoPlay loop muted playsInline
            style={css.petBgVideo}
            onEnded={() => activeTrick && setActiveTrick(null)}
          />
        ) : (
          <div style={css.petBgFallback}>
            <span style={{ fontSize: 80 }}>{PET_EMOJIS[petProfile.type] || '🐾'}</span>
          </div>
        )}

        {/* Trick buttons overlay */}
        {petProfile.type !== 'custom' && (
          <div style={css.trickButtons}>
            {TRICKS.map(trick => (
              <button
                key={trick}
                style={{ ...css.trickBtn, ...(activeTrick === trick ? css.trickBtnActive : {}) }}
                onClick={(e) => { e.stopPropagation(); setActiveTrick(activeTrick === trick ? null : trick); }}
              >
                {s[TRICK_LABELS[trick]] || trick}
              </button>
            ))}
          </div>
        )}

        {/* Custom pet video gen status indicator */}
        {(isGeneratingImage || isGeneratingVideo) && (
          <div style={css.genIndicator}>
            <span style={css.genDot} />
            <span style={css.genText}>{s.design_generating}</span>
          </div>
        )}
      </div>

      {/* ── Chat messages ── */}
      <div style={css.chatArea}>
        {messages.map(msg => (
          <MessageBubble
            key={msg.id} message={msg} petProfile={petProfile} s={s}
            onActionButton={(action) => sendTextDirectly(`${action}, showit`)}
          />
        ))}
        {isTyping && (
          <div style={{ ...bubbleCss.row, ...bubbleCss.rowPet }}>
            <div style={bubbleCss.petAvatar}><span style={{ fontSize: 20 }}>{PET_EMOJIS[petProfile.type] || '🐾'}</span></div>
            <div style={{ ...bubbleCss.bubble, ...bubbleCss.petBubble }}>
              <span style={bubbleCss.petBubbleText}>{s.chat_thinking}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input bar ── */}
      <div style={css.inputBar}>
        <input
          style={css.input}
          placeholder={s.chat_placeholder}
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          disabled={isGeneratingImage || isGeneratingVideo}
        />
        <button
          style={{ ...css.voiceBtn, ...(isRecording ? css.voiceBtnActive : {}) }}
          onClick={handleVoice} disabled={isTyping}
        >
          {isRecording ? '🔴' : '🎤'}
        </button>
        <button style={css.sendBtn} onClick={handleSend} disabled={isTyping || isGeneratingImage || isGeneratingVideo}>➤</button>
      </div>
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const css = {
  container: { display: 'flex', flexDirection: 'column', height: '100%', background: '#1a1030' },
  petArea: {
    position: 'relative', flexShrink: 0, height: '42%', minHeight: 200,
    cursor: 'pointer', overflow: 'hidden', background: '#1a1030',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  petBgVideo:   { width: '100%', height: '100%', objectFit: 'cover' },
  petBgImg:     { width: '100%', height: '100%', objectFit: 'cover' },
  petBgFallback: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' },
  trickButtons: {
    position: 'absolute', bottom: 12, left: 0, right: 0,
    display: 'flex', justifyContent: 'center', gap: 8,
  },
  trickBtn: {
    padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
    background: 'rgba(255,255,255,0.22)', color: '#fff', fontSize: 13, fontWeight: 600,
    backdropFilter: 'blur(4px)',
  },
  trickBtnActive: { background: '#6B5FE3' },
  genIndicator: {
    position: 'absolute', top: 12, left: 12,
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'rgba(0,0,0,0.55)', borderRadius: 12, padding: '4px 10px',
  },
  genDot: {
    width: 8, height: 8, borderRadius: '50%', background: '#9B89FF',
    animation: 'pulse 1s infinite',
  },
  genText: { color: '#fff', fontSize: 12 },
  chatArea: {
    flex: 1, overflowY: 'auto', padding: '12px 16px', background: '#fff',
    display: 'flex', flexDirection: 'column', gap: 4,
  },
  inputBar: {
    display: 'flex', alignItems: 'center', padding: '10px 14px',
    background: 'rgba(255,255,255,0.97)', borderTop: '1px solid rgba(107,95,227,0.12)',
    gap: 8,
  },
  input: {
    flex: 1, height: 44, background: '#F3F1FF', borderRadius: 22,
    border: 'none', outline: 'none', paddingLeft: 16, paddingRight: 16,
    fontSize: 15, color: '#2D2060',
  },
  voiceBtn: {
    width: 40, height: 40, borderRadius: '50%', border: 'none',
    background: 'transparent', fontSize: 22, cursor: 'pointer',
  },
  voiceBtnActive: { background: '#FFE8E8' },
  sendBtn: {
    width: 44, height: 44, borderRadius: '50%', border: 'none',
    background: 'linear-gradient(135deg, #6B5FE3, #9B89FF)', color: '#fff',
    fontSize: 18, cursor: 'pointer',
  },
};

const bubbleCss = {
  row:         { display: 'flex', alignItems: 'flex-end', marginBottom: 12, gap: 8 },
  rowUser:     { flexDirection: 'row-reverse' },
  rowPet:      { flexDirection: 'row' },
  petAvatar:   { width: 32, height: 32, borderRadius: '50%', background: '#F0EEFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bubble:      { maxWidth: '72%', minWidth: 80, padding: '10px 14px', borderRadius: 18, wordBreak: 'normal', overflowWrap: 'break-word' },
  userBubble:  { background: 'linear-gradient(135deg, #6B5FE3, #9B89FF)', borderBottomRightRadius: 4 },
  petBubble:   { background: '#F0EEFF', borderBottomLeftRadius: 4 },
  bubbleText:  { fontSize: 15, lineHeight: 1.55, whiteSpace: 'pre-wrap' },
  userBubbleText: { color: '#fff' },
  petBubbleText:  { color: '#2D2060' },
  timestamp:   { fontSize: 11, color: '#aaa', marginTop: 3, display: 'block' },
  tsRight:     { textAlign: 'right' },
  tsLeft:      { textAlign: 'left' },
  showitRow:   { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  showitBtn:   {
    padding: '6px 14px', borderRadius: 16, border: '1px solid #9B89FF',
    background: '#F5F3FF', color: '#6B5FE3', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
};

const dressCss = {
  overlay: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(135deg, #160d35, #2d1b69, #160d35)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  sparkle:  { position: 'absolute', fontSize: 24 },
  center:   { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 },
  emoji:    { fontSize: 60 },
  text:     { color: '#fff', fontSize: 18, fontWeight: 700, textAlign: 'center', opacity: 0.9 },
};
