// src/screens/HomeScreen.jsx
import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { useTranslation } from '../i18n';

const PET_TYPES = [
  { key: 'cat',    label: 'cat',             emoji: '🐱' },
  { key: 'dog',    label: 'dog',             emoji: '🐶' },
  { key: 'rabbit', label: 'rabbit',          emoji: '🐰' },
  { key: 'turtle', label: 'turtle',          emoji: '🐢' },
  { key: 'boy',    label: 'boy',             emoji: '👦' },
  { key: 'girl',   label: 'girl',            emoji: '👧' },
  { key: 'custom', label: 'design your own', emoji: '✨' },
];

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

export default function HomeScreen() {
  const { state, savePetProfile, navigateTo, dispatch } = useApp();
  const s = useTranslation();
  const [inputText, setInputText]     = useState('');
  const [selectedType, setSelectedType] = useState(state.petProfile.type || 'cat');
  const [pulse, setPulse]             = useState(false);

  const petName    = state.petProfile.name || s.home_default_name;
  const hasSetup   = !!(state.petProfile.name && state.petProfile.type);
  const petEmoji   = PET_EMOJIS[selectedType] || '🐾';
  const videoUrl   = state.petProfile.customImageUrl
    ? null
    : PET_VIDEO_URLS[selectedType];

  const handleTypeSelect = (type) => {
    if (type === 'custom') {
      savePetProfile({ type: 'custom', gender: 'female' });
      dispatch({ type: 'SET_MESSAGES', payload: [] });
      navigateTo('chat');
      return;
    }
    setSelectedType(type);
    const gender = type === 'girl' ? 'female' : 'male';
    savePetProfile({ type, gender });
    setPulse(true);
    setTimeout(() => setPulse(false), 600);
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    const lower = inputText.toLowerCase();
    const matched = PET_TYPES.find(p => lower.includes(p.key));
    if (matched && matched.key !== 'custom') handleTypeSelect(matched.key);
    const msg = inputText.trim();
    setInputText('');
    // 把初始消息存入全局，Chat 界面读取后自动发送
    dispatch({ type: 'SET_ACTIVE_TAB', payload: 'chat' });
    // 用 sessionStorage 临时传递 initialMessage
    sessionStorage.setItem('initialMessage', msg);
    navigateTo('chat');
  };

  const handleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert(s.voice_not_available); return; }
    const recognition = new SR();
    recognition.lang = state.language === 'zh' ? 'zh-CN' : 'en-US';
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript;
      if (text) {
        sessionStorage.setItem('initialMessage', text);
        navigateTo('chat');
      }
    };
    recognition.onerror = () => alert(s.voice_not_available);
    recognition.start();
  };

  const chatBtnText = state.language === 'zh'
    ? `💬 和${petName}聊天`
    : `💬 Chat with ${petName}`;

  return (
    <div style={css.container}>
      <div style={css.scroll}>
        {/* 宠物头像 */}
        <div
          style={{ ...css.avatarWrapper, transform: pulse ? 'scale(1.08)' : 'scale(1)', transition: 'transform 0.3s' }}
          onClick={() => navigateTo('chat')}
        >
          <div style={css.avatarCircle}>
            {state.petProfile.customImageUrl ? (
              <img src={state.petProfile.customImageUrl} alt="pet" style={css.avatarImg} />
            ) : videoUrl ? (
              <video
                src={videoUrl} autoPlay loop muted playsInline
                style={css.avatarVideo}
              />
            ) : (
              <span style={css.avatarEmoji}>{petEmoji}</span>
            )}
          </div>
          {hasSetup && (
            <div style={css.nameBadge}><span style={css.nameBadgeText}>{petName}</span></div>
          )}
        </div>

        <p style={css.titleText}>
          {hasSetup ? `Hi, I'm ${petName}! 🐾` : s.home_title_new}
        </p>
        {!hasSetup && <p style={css.subtitleText}>{s.home_subtitle}</p>}

        {/* 宠物类型选择器 */}
        <div style={css.chipsContainer}>
          {PET_TYPES.map(p => (
            <button
              key={p.key}
              style={{ ...css.chip, ...(selectedType === p.key ? css.chipSelected : {}) }}
              onClick={() => handleTypeSelect(p.key)}
            >
              {p.emoji} {p.label}
            </button>
          ))}
        </div>

        {/* 已设置宠物时显示进入聊天按钮 */}
        {hasSetup && (
          <button style={css.chatButton} onClick={() => navigateTo('chat')}>
            {chatBtnText}
          </button>
        )}
      </div>

      {/* 底部输入栏 */}
      <div style={css.inputBar}>
        <input
          style={css.input}
          placeholder={s.home_placeholder}
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
        />
        <button style={css.voiceBtn} onClick={handleVoice} title="Voice input">🎤</button>
        <button style={css.sendBtn} onClick={handleSend}>➤</button>
      </div>
    </div>
  );
}

const css = {
  container: {
    display: 'flex', flexDirection: 'column', height: '100%',
    background: 'linear-gradient(160deg, #EEF0FF, #E8E0FF, #F0EEFF)',
    minHeight: 0,
  },
  scroll: {
    flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column',
    alignItems: 'center', paddingTop: 48, paddingBottom: 24, paddingLeft: 24, paddingRight: 24,
  },
  avatarWrapper: {
    position: 'relative', display: 'flex', flexDirection: 'column',
    alignItems: 'center', marginBottom: 32, cursor: 'pointer',
  },
  avatarCircle: {
    width: 180, height: 180, borderRadius: '50%',
    background: 'linear-gradient(#ffffff, #f0eeff)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 12px 32px rgba(107,95,227,0.22)',
    overflow: 'hidden',
  },
  avatarEmoji:  { fontSize: 90 },
  avatarImg:    { width: 150, height: 150, borderRadius: '50%', objectFit: 'cover' },
  avatarVideo:  { width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' },
  nameBadge: {
    position: 'absolute', bottom: -6,
    background: '#6B5FE3', borderRadius: 20, padding: '4px 16px',
  },
  nameBadgeText: { color: '#fff', fontSize: 13, fontWeight: 600 },
  titleText:    { fontSize: 20, fontWeight: 700, color: '#2D2060', textAlign: 'center', marginBottom: 10 },
  subtitleText: { fontSize: 15, color: '#6B6B8A', textAlign: 'center', lineHeight: 1.6, marginBottom: 28 },
  chipsContainer: {
    display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
    gap: 10, marginBottom: 28,
  },
  chip: {
    padding: '10px 18px', borderRadius: 24, cursor: 'pointer', border: '1px solid rgba(107,95,227,0.2)',
    background: 'rgba(255,255,255,0.8)', fontSize: 14, color: '#5A5480', fontWeight: 500,
    transition: 'all 0.2s',
  },
  chipSelected: { background: '#6B5FE3', borderColor: '#6B5FE3', color: '#fff' },
  chatButton: {
    width: '80%', maxWidth: 320, padding: '16px 0', borderRadius: 28,
    background: 'linear-gradient(90deg, #6B5FE3, #9B89FF)', color: '#fff',
    fontSize: 16, fontWeight: 700, border: 'none', cursor: 'pointer', marginTop: 8,
  },
  inputBar: {
    display: 'flex', alignItems: 'center', padding: '12px 16px',
    background: 'rgba(255,255,255,0.95)', borderTop: '1px solid rgba(107,95,227,0.1)',
    gap: 8,
  },
  input: {
    flex: 1, height: 46, background: '#F3F1FF', borderRadius: 23,
    border: 'none', outline: 'none', paddingLeft: 18, paddingRight: 18,
    fontSize: 15, color: '#2D2060',
  },
  voiceBtn: {
    width: 40, height: 40, borderRadius: '50%', border: 'none',
    background: 'transparent', fontSize: 22, cursor: 'pointer',
  },
  sendBtn: {
    width: 46, height: 46, borderRadius: '50%', border: 'none',
    background: 'linear-gradient(135deg, #6B5FE3, #9B89FF)', color: '#fff',
    fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
};
