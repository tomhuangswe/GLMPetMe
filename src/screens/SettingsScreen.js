// src/screens/SettingsScreen.js
// Merged Settings + Pet Profile page (auto-save, no Save button)

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../store/AppContext';
import { useTranslation } from '../i18n';
import { clearConversations } from '../services/claudeService';

// ─── Constants ────────────────────────────────────────────────────────────────
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
// ─────────────────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const navigation  = useNavigation();
  const { state, dispatch, savePetProfile, saveLanguage, saveVoiceConversation } = useApp();
  const s           = useTranslation();
  const designedPets = state.designedPets || [];
  const { petProfile } = state;
  const lang        = state.language || 'en';

  // Local text-field state (saved on blur to avoid excessive writes)
  const [name,        setName]        = useState(petProfile.name        || '');
  const [personality, setPersonality] = useState(petProfile.personality || '');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // ── Pet Type ──────────────────────────────────────────────────────────────
  const handleTypeSelect = useCallback(async (key) => {
    if (key === 'custom') {
      // Check 8-pet limit
      if (designedPets.length >= 8) {
        Alert.alert(
          s.designed_pet_limit_title || 'Design Limit Reached',
          s.designed_pet_limit_msg  || 'Sorry, every user is only allowed to design at most 8 pets!',
          [{ text: s.settings_cancel || 'OK' }]
        );
        return;
      }
      // Enter AI design flow
      await savePetProfile({ type: 'custom', gender: petProfile.gender || 'female', avatarUri: null });
      await clearConversations();
      dispatch({ type: 'SET_MESSAGES', payload: [] });
      navigation.navigate('HomeTab', { screen: 'Chat', params: { designMode: true } });
      return;
    }
    if (key === petProfile.type) return; // no change
    // Switching to a different standard pet type
    const profileToSave = {
      type: key,
      avatarUri: null,
      customImageUrl: null,
      customVideoUrl: null,
      customVideoUrls: [],
    };
    await savePetProfile(profileToSave);
    // Clear chat so AI adopts the new identity from scratch
    await clearConversations();
    dispatch({ type: 'SET_MESSAGES', payload: [] });
  }, [petProfile.type, petProfile.gender, savePetProfile, dispatch, navigation]);

  // ── Gender ────────────────────────────────────────────────────────────────
  const handleGenderSelect = useCallback(async (value) => {
    if (value === petProfile.gender) return;
    await savePetProfile({ gender: value });
  }, [petProfile.gender, savePetProfile]);

  // ── Name (save on blur) ───────────────────────────────────────────────────
  const handleNameBlur = useCallback(async () => {
    const trimmed = name.trim();
    if (trimmed === petProfile.name) return;
    await savePetProfile({ name: trimmed });
  }, [name, petProfile.name, savePetProfile]);

  // ── Personality (save on blur) ────────────────────────────────────────────
  const handlePersonalityBlur = useCallback(async () => {
    if (personality === petProfile.personality) return;
    await savePetProfile({ personality });
  }, [personality, petProfile.personality, savePetProfile]);

  // ── Select a designed pet ─────────────────────────────────────────────────
  const handleSelectDesignedPet = useCallback(async (pet) => {
    await savePetProfile({
      type: 'custom',
      name: pet.name || '',
      gender: pet.gender || 'female',
      avatarUri: null,
      customImageUrl: pet.imageUrl,
      customVideoUrl: pet.videoUrl,
      customVideoUrls: pet.videoUrls || (pet.videoUrl ? [pet.videoUrl] : []),
    });
    await clearConversations();
    dispatch({ type: 'SET_MESSAGES', payload: [] });
    navigation.navigate('HomeTab', { screen: 'Chat' });
  }, [savePetProfile, dispatch, navigation]);

  // ── Clear history ─────────────────────────────────────────────────────────
  const handleClearHistory = () => {
    Alert.alert(s.settings_clear_title, s.settings_clear_msg, [
      { text: s.settings_cancel, style: 'cancel' },
      {
        text: s.settings_clear_action,
        style: 'destructive',
        onPress: async () => {
          await clearConversations();
          dispatch({ type: 'SET_MESSAGES', payload: [] });
          Alert.alert(s.settings_cleared_title, s.settings_cleared_msg);
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{s.settings_header}</Text>
      </View>

      {/* ── Pet Profile section ── */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{s.profile_title || 'Pet Profile'}</Text>

        {/* Pet Type */}
        <Text style={styles.fieldLabel}>{s.profile_type_label}</Text>
        <View style={styles.typeGrid}>
          {PET_TYPES.map((pt) => {
            const isSelected = petProfile.type === pt.key;
            const isCustom   = pt.key === 'custom';
            return (
              <TouchableOpacity
                key={pt.key}
                style={[
                  styles.typeCard,
                  isSelected && styles.typeCardSelected,
                  isCustom   && styles.typeCardCustom,
                  isSelected && isCustom && styles.typeCardCustomSelected,
                ]}
                onPress={() => handleTypeSelect(pt.key)}
                activeOpacity={0.75}
              >
                <Text style={styles.typeEmoji}>{pt.emoji}</Text>
                <Text style={[
                  styles.typeLabel,
                  isSelected && styles.typeLabelSelected,
                  isCustom   && styles.typeLabelCustom,
                ]}>
                  {lang === 'zh' ? pt.labelZh : pt.labelEn}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Designed pets list */}
        {designedPets.length > 0 && (
          <View style={styles.designedPetsContainer}>
            {designedPets.map((pet) => {
              const isActive = petProfile.customImageUrl === pet.imageUrl;
              return (
                <TouchableOpacity
                  key={pet.id}
                  style={[styles.designedPetBtn, isActive && styles.designedPetBtnActive]}
                  onPress={() => handleSelectDesignedPet(pet)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.designedPetEmoji}>✨</Text>
                  <Text style={[styles.designedPetLabel, isActive && styles.designedPetLabelActive]}>
                    {pet.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Pet Name */}
        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>{s.profile_name_label}</Text>
        <TextInput
          style={styles.input}
          placeholder={s.profile_name_placeholder}
          placeholderTextColor="#B0AEC8"
          value={name}
          onChangeText={setName}
          onEndEditing={handleNameBlur}
          returnKeyType="done"
        />

        {/* Gender */}
        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>{s.profile_gender_label}</Text>
        <View style={styles.radioGroup}>
          {[
            { value: 'male',   label: s.profile_gender_male },
            { value: 'female', label: s.profile_gender_female },
          ].map((g) => (
            <TouchableOpacity
              key={g.value}
              style={styles.radioOption}
              onPress={() => handleGenderSelect(g.value)}
            >
              <View style={[styles.radioCircle, petProfile.gender === g.value && styles.radioSelected]}>
                {petProfile.gender === g.value && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioLabel}>{g.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Personality */}
        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>{s.profile_personality_label}</Text>
        <TextInput
          style={[styles.input, styles.inputMultiline]}
          placeholder={s.profile_personality_placeholder}
          placeholderTextColor="#B0AEC8"
          value={personality}
          onChangeText={setPersonality}
          onEndEditing={handlePersonalityBlur}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </View>

      {/* ── Language ── */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{s.settings_lang_section}</Text>
        <View style={styles.langGrid}>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.langOption, state.language === lang.code && styles.langOptionSelected]}
              onPress={() => saveLanguage(lang.code)}
            >
              <Text style={styles.langFlag}>{lang.flag}</Text>
              <Text style={[styles.langLabel, state.language === lang.code && styles.langLabelSelected]}>
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Features ── */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{s.settings_features_section}</Text>
        <View style={styles.switchRow}>
          <View style={styles.switchTextBlock}>
            <Text style={styles.switchLabel}>{s.settings_notif_label}</Text>
            <Text style={styles.switchDesc}>{s.settings_notif_desc}</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#E0DEFF', true: '#6B5FE3' }}
            thumbColor="#fff"
          />
        </View>
        <View style={[styles.switchRow, { borderBottomWidth: 0 }]}>
          <View style={styles.switchTextBlock}>
            <Text style={styles.switchLabel}>{s.settings_voice_label}</Text>
            <Text style={styles.switchDesc}>{s.settings_voice_desc}</Text>
          </View>
          <Switch
            value={state.voiceConversationEnabled}
            onValueChange={saveVoiceConversation}
            trackColor={{ false: '#E0DEFF', true: '#6B5FE3' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* ── Data Management ── */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{s.settings_data_section}</Text>
        <TouchableOpacity style={styles.dangerBtn} onPress={handleClearHistory}>
          <Text style={styles.dangerBtnText}>{s.settings_clear_btn}</Text>
        </TouchableOpacity>
      </View>

      {/* Help */}
      <Text style={styles.helpText}>
        {s.settings_help}
        <Text style={styles.email}>petmehelp@gmail.com</Text>
        {s.settings_help_suffix}
      </Text>
      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F5F4FF' },
  header:      { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 20 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#2D2060' },

  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2D2060', marginBottom: 14 },
  fieldLabel:   { fontSize: 14, fontWeight: '600', color: '#4A4470', marginBottom: 10 },

  // ── Pet type grid ──────────────────────────────────────────────────────────
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E8E4FF',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    elevation: 1,
  },
  typeCardSelected:       { borderColor: '#6B5FE3', backgroundColor: '#F0EEFF' },
  typeCardCustom: {
    width: '100%',
    aspectRatio: undefined,
    paddingVertical: 16,
    flexDirection: 'row',
    gap: 10,
    borderStyle: 'dashed',
    borderColor: '#9B89FF',
    backgroundColor: '#FAF8FF',
  },
  typeCardCustomSelected: { borderColor: '#6B5FE3', backgroundColor: '#EDE9FF', borderStyle: 'solid' },
  typeEmoji:              { fontSize: 28 },
  typeLabel:              { fontSize: 12, fontWeight: '600', color: '#6B6B8A', textAlign: 'center' },
  typeLabelSelected:      { color: '#6B5FE3' },
  typeLabelCustom:        { fontSize: 14, fontWeight: '700', color: '#9B89FF' },

  // ── Inputs ─────────────────────────────────────────────────────────────────
  input: {
    backgroundColor: '#F5F4FF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: '#2D2060',
    borderWidth: 1,
    borderColor: '#E8E4FF',
  },
  inputMultiline: { minHeight: 80 },

  // ── Gender radio ────────────────────────────────────────────────────────────
  radioGroup:  { flexDirection: 'row', gap: 24 },
  radioOption: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radioCircle: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#6B5FE3',
    justifyContent: 'center', alignItems: 'center',
  },
  radioSelected: { borderColor: '#6B5FE3' },
  radioInner:    { width: 10, height: 10, borderRadius: 5, backgroundColor: '#6B5FE3' },
  radioLabel:    { fontSize: 15, color: '#4A4470' },

  // ── Language ───────────────────────────────────────────────────────────────
  langGrid:           { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  langOption:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: '#F5F4FF', borderWidth: 1, borderColor: '#E8E4FF', gap: 6 },
  langOptionSelected: { backgroundColor: '#6B5FE3', borderColor: '#6B5FE3' },
  langFlag:           { fontSize: 16 },
  langLabel:          { fontSize: 14, color: '#5A5480', fontWeight: '500' },
  langLabelSelected:  { color: '#fff' },

  // ── Switches ───────────────────────────────────────────────────────────────
  switchRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0EEFF' },
  switchTextBlock: { flex: 1, marginRight: 12 },
  switchLabel:     { fontSize: 15, color: '#2D2060', fontWeight: '500' },
  switchDesc:      { fontSize: 12, color: '#9B97B8', marginTop: 2 },

  // ── Data ───────────────────────────────────────────────────────────────────
  dangerBtn:     { paddingVertical: 12, backgroundColor: '#FFF0F0', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#FFD0D0' },
  dangerBtnText: { color: '#D06060', fontWeight: '600', fontSize: 14 },

  // ── Help ───────────────────────────────────────────────────────────────────
  helpText: { textAlign: 'center', fontSize: 13, color: '#9B97B8', lineHeight: 20, marginTop: 8, marginHorizontal: 20 },
  email:    { color: '#6B5FE3' },

  // ── Designed pets ──────────────────────────────────────────────────────────
  designedPetsContainer: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  designedPetBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 20, backgroundColor: '#F5F4FF',
    borderWidth: 1.5, borderColor: '#9B89FF',
  },
  designedPetBtnActive: { backgroundColor: '#EDE9FF', borderColor: '#6B5FE3' },
  designedPetEmoji:     { fontSize: 14 },
  designedPetLabel:     { fontSize: 13, fontWeight: '600', color: '#9B89FF' },
  designedPetLabelActive: { color: '#6B5FE3' },
});
