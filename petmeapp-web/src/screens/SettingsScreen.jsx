// src/screens/SettingsScreen.jsx
import React, { useState } from 'react';
import { useApp } from '../store/AppContext';
import { useTranslation } from '../i18n';
import { clearConversations } from '../services/glmService';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'zh', label: '中文',    flag: '🇨🇳' },
];

const PET_TYPES = [
  { key: 'cat',    emoji: '🐱', labelEn: 'Cat',             labelZh: '猫' },
  { key: 'dog',    emoji: '🐶', labelEn: 'Dog',             labelZh: '狗' },
  { key: 'rabbit', emoji: '🐰', labelEn: 'Rabbit',          labelZh: '兔子' },
  { key: 'turtle', emoji: '🐢', labelEn: 'Turtle',          labelZh: '乌龟' },
  { key: 'boy',    emoji: '👦', labelEn: 'Boy',             labelZh: '男孩' },
  { key: 'girl',   emoji: '👧', labelEn: 'Girl',            labelZh: '女孩' },
  { key: 'custom', emoji: '✨', labelEn: 'Design Your Own', labelZh: '自定义设计' },
];

export default function SettingsScreen() {
  const { state, dispatch, savePetProfile, saveLanguage, saveVoiceConversation, navigateTo } = useApp();
  const s    = useTranslation();
  const lang = state.language || 'en';
  const { petProfile, designedPets = [] } = state;

  const [name,        setName]        = useState(petProfile.name        || '');
  const [personality, setPersonality] = useState(petProfile.personality || '');
  const [notifEnabled, setNotifEnabled] = useState(true);

  const handleTypeSelect = (key) => {
    if (key === 'custom') {
      if (designedPets.length >= 8) {
        alert(s.designed_pet_limit_msg);
        return;
      }
      savePetProfile({ type: 'custom', gender: petProfile.gender || 'female', avatarUri: null });
      clearConversations();
      dispatch({ type: 'SET_MESSAGES', payload: [] });
      sessionStorage.setItem('designMode', 'true');
      navigateTo('chat');
      return;
    }
    if (key === petProfile.type) return;
    savePetProfile({ type: key, avatarUri: null, customImageUrl: null, customVideoUrl: null, customVideoUrls: [] });
    clearConversations();
    dispatch({ type: 'SET_MESSAGES', payload: [] });
  };

  const handleSelectDesignedPet = (pet) => {
    savePetProfile({
      type: 'custom', name: pet.name || '', gender: pet.gender || 'female',
      avatarUri: null, customImageUrl: pet.imageUrl,
      customVideoUrl: pet.videoUrl, customVideoUrls: pet.videoUrls || (pet.videoUrl ? [pet.videoUrl] : []),
    });
    clearConversations();
    dispatch({ type: 'SET_MESSAGES', payload: [] });
    navigateTo('chat');
  };

  const handleNameBlur  = () => { if (name.trim() !== petProfile.name) savePetProfile({ name: name.trim() }); };
  const handlePersonalityBlur = () => { if (personality !== petProfile.personality) savePetProfile({ personality }); };

  const handleClearHistory = () => {
    if (!window.confirm(s.settings_clear_msg)) return;
    clearConversations();
    dispatch({ type: 'SET_MESSAGES', payload: [] });
    alert(s.settings_cleared_msg);
  };

  return (
    <div style={css.container}>
      <div style={css.header}>
        <h2 style={css.headerTitle}>{s.settings_header}</h2>
      </div>

      {/* ── Pet Profile ── */}
      <div style={css.card}>
        <p style={css.sectionTitle}>{s.profile_title || 'Pet Profile'}</p>
        <p style={css.fieldLabel}>{s.profile_type_label}</p>
        <div style={css.typeGrid}>
          {PET_TYPES.map(pt => {
            const isSelected = petProfile.type === pt.key;
            const isCustom   = pt.key === 'custom';
            return (
              <button
                key={pt.key}
                style={{
                  ...css.typeCard,
                  ...(isSelected ? css.typeCardSelected : {}),
                  ...(isCustom ? css.typeCardCustom : {}),
                  ...(isSelected && isCustom ? css.typeCardCustomSelected : {}),
                }}
                onClick={() => handleTypeSelect(pt.key)}
              >
                <span style={{ fontSize: 28 }}>{pt.emoji}</span>
                <span style={{ ...css.typeLabel, ...(isSelected ? css.typeLabelSelected : {}), ...(isCustom ? css.typeLabelCustom : {}) }}>
                  {lang === 'zh' ? pt.labelZh : pt.labelEn}
                </span>
              </button>
            );
          })}
        </div>

        {designedPets.length > 0 && (
          <div style={css.designedPetsRow}>
            {designedPets.map(pet => {
              const isActive = petProfile.customImageUrl === pet.imageUrl;
              return (
                <button
                  key={pet.id}
                  style={{ ...css.designedPetBtn, ...(isActive ? css.designedPetBtnActive : {}) }}
                  onClick={() => handleSelectDesignedPet(pet)}
                >
                  <span>✨</span>
                  <span style={{ ...css.designedPetLabel, ...(isActive ? css.designedPetLabelActive : {}) }}>{pet.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Name */}
        <p style={{ ...css.fieldLabel, marginTop: 20 }}>{s.profile_name_label}</p>
        <input
          style={css.input} placeholder={s.profile_name_placeholder}
          value={name} onChange={e => setName(e.target.value)} onBlur={handleNameBlur}
        />

        {/* Gender */}
        <p style={{ ...css.fieldLabel, marginTop: 16 }}>{s.profile_gender_label}</p>
        <div style={css.radioGroup}>
          {[{ value: 'male', label: s.profile_gender_male }, { value: 'female', label: s.profile_gender_female }].map(g => (
            <label key={g.value} style={css.radioOption}>
              <input
                type="radio" name="gender" value={g.value}
                checked={petProfile.gender === g.value}
                onChange={() => savePetProfile({ gender: g.value })}
                style={{ accentColor: '#6B5FE3' }}
              />
              <span style={css.radioLabel}>{g.label}</span>
            </label>
          ))}
        </div>

        {/* Personality */}
        <p style={{ ...css.fieldLabel, marginTop: 16 }}>{s.profile_personality_label}</p>
        <textarea
          style={{ ...css.input, minHeight: 80, resize: 'vertical' }}
          placeholder={s.profile_personality_placeholder}
          value={personality} onChange={e => setPersonality(e.target.value)} onBlur={handlePersonalityBlur}
        />
      </div>

      {/* ── Language ── */}
      <div style={css.card}>
        <p style={css.sectionTitle}>{s.settings_lang_section}</p>
        <div style={css.langGrid}>
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              style={{ ...css.langOption, ...(state.language === l.code ? css.langOptionSelected : {}) }}
              onClick={() => saveLanguage(l.code)}
            >
              <span>{l.flag}</span>
              <span style={{ ...(state.language === l.code ? { color: '#fff' } : {}) }}>{l.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <div style={css.card}>
        <p style={css.sectionTitle}>{s.settings_features_section}</p>
        <div style={css.switchRow}>
          <div style={css.switchText}>
            <p style={css.switchLabel}>{s.settings_notif_label}</p>
            <p style={css.switchDesc}>{s.settings_notif_desc}</p>
          </div>
          <input type="checkbox" checked={notifEnabled} onChange={e => setNotifEnabled(e.target.checked)} style={{ accentColor: '#6B5FE3', width: 40, height: 22, cursor: 'pointer' }} />
        </div>
        <div style={{ ...css.switchRow, borderBottom: 'none' }}>
          <div style={css.switchText}>
            <p style={css.switchLabel}>{s.settings_voice_label}</p>
            <p style={css.switchDesc}>{s.settings_voice_desc}</p>
          </div>
          <input type="checkbox" checked={state.voiceConversationEnabled} onChange={e => saveVoiceConversation(e.target.checked)} style={{ accentColor: '#6B5FE3', width: 40, height: 22, cursor: 'pointer' }} />
        </div>
      </div>

      {/* ── Data ── */}
      <div style={css.card}>
        <p style={css.sectionTitle}>{s.settings_data_section}</p>
        <button style={css.dangerBtn} onClick={handleClearHistory}>{s.settings_clear_btn}</button>
      </div>

      <p style={css.helpText}>
        {s.settings_help}
        <a href="mailto:petmehelp@gmail.com" style={{ color: '#6B5FE3' }}>petmehelp@gmail.com</a>
        {s.settings_help_suffix}
      </p>
      <div style={{ height: 60 }} />
    </div>
  );
}

const css = {
  container:   { flex: 1, background: '#F5F4FF', overflowY: 'auto' },
  header:      { padding: '40px 20px 20px' },
  headerTitle: { fontSize: 26, fontWeight: 800, color: '#2D2060', margin: 0 },
  card: {
    background: '#fff', margin: '0 16px 16px', borderRadius: 20, padding: 20,
    boxShadow: '0 2px 8px rgba(107,95,227,0.08)',
  },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: '#2D2060', marginBottom: 14 },
  fieldLabel:   { fontSize: 14, fontWeight: 600, color: '#4A4470', marginBottom: 10 },
  typeGrid:     { display: 'flex', flexWrap: 'wrap', gap: 10 },
  typeCard: {
    width: 'calc(33% - 7px)', aspectRatio: '1', background: '#fff', borderRadius: 16,
    border: '1.5px solid #E8E4FF', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer',
  },
  typeCardSelected:       { borderColor: '#6B5FE3', background: '#F0EEFF' },
  typeCardCustom: {
    width: '100%', aspectRatio: 'unset', flexDirection: 'row',
    padding: '14px 16px', borderStyle: 'dashed', borderColor: '#9B89FF', background: '#FAF8FF',
  },
  typeCardCustomSelected: { borderColor: '#6B5FE3', background: '#EDE9FF', borderStyle: 'solid' },
  typeLabel:              { fontSize: 12, fontWeight: 600, color: '#6B6B8A', textAlign: 'center' },
  typeLabelSelected:      { color: '#6B5FE3' },
  typeLabelCustom:        { fontSize: 14, fontWeight: 700, color: '#9B89FF' },
  designedPetsRow:        { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  designedPetBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', borderRadius: 20, border: '1.5px solid #9B89FF',
    background: '#F5F4FF', cursor: 'pointer',
  },
  designedPetBtnActive:   { background: '#EDE9FF', borderColor: '#6B5FE3' },
  designedPetLabel:       { fontSize: 13, fontWeight: 600, color: '#9B89FF' },
  designedPetLabelActive: { color: '#6B5FE3' },
  input: {
    width: '100%', background: '#F5F4FF', borderRadius: 12,
    border: '1px solid #E8E4FF', outline: 'none', padding: '12px 16px',
    fontSize: 15, color: '#2D2060', boxSizing: 'border-box',
  },
  radioGroup:  { display: 'flex', gap: 24 },
  radioOption: { display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 15, color: '#4A4470' },
  radioLabel:  { fontSize: 15, color: '#4A4470' },
  langGrid:    { display: 'flex', flexWrap: 'wrap', gap: 10 },
  langOption:  {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', borderRadius: 20, border: '1px solid #E8E4FF',
    background: '#F5F4FF', cursor: 'pointer', fontSize: 14, color: '#5A5480',
  },
  langOptionSelected: { background: '#6B5FE3', borderColor: '#6B5FE3', color: '#fff' },
  switchRow:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #F0EEFF' },
  switchText:  { flex: 1, marginRight: 12 },
  switchLabel: { fontSize: 15, color: '#2D2060', fontWeight: 500, margin: 0 },
  switchDesc:  { fontSize: 12, color: '#9B97B8', marginTop: 2 },
  dangerBtn:   { width: '100%', padding: '12px 0', background: '#FFF0F0', border: '1px solid #FFD0D0', borderRadius: 12, color: '#D06060', fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  helpText:    { textAlign: 'center', fontSize: 13, color: '#9B97B8', lineHeight: 1.7, padding: '8px 20px', whiteSpace: 'pre-line' },
};
