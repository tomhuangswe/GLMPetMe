// src/screens/PetProfileScreen.js
// 宠物档案编辑页面

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../store/AppContext';
import { useTranslation } from '../i18n';
import { clearConversations } from '../services/claudeService';

// ─── Pet type options ─────────────────────────────────────────────────────────
const PET_TYPES = [
  { key: 'cat',    emoji: '🐱', labelEn: 'Cat',            labelZh: '猫' },
  { key: 'dog',    emoji: '🐶', labelEn: 'Dog',            labelZh: '狗' },
  { key: 'rabbit', emoji: '🐰', labelEn: 'Rabbit',         labelZh: '兔子' },
  { key: 'turtle', emoji: '🐢', labelEn: 'Turtle',         labelZh: '乌龟' },
  { key: 'boy',    emoji: '👦', labelEn: 'Boy',            labelZh: '男孩' },
  { key: 'girl',   emoji: '👧', labelEn: 'Girl',           labelZh: '女孩' },
  { key: 'custom', emoji: '✨', labelEn: 'Design Your Own', labelZh: '自定义设计' },
];

export default function PetProfileScreen() {
  const navigation = useNavigation();
  const { state, dispatch, savePetProfile } = useApp();
  const s = useTranslation();
  const { petProfile } = state;
  const lang = state.language || 'en';

  const [form, setForm] = useState({
    name:        petProfile.name        || '',
    type:        petProfile.type        || '',
    gender:      petProfile.gender      || 'male',
    background:  petProfile.background  || '',
    personality: petProfile.personality || '',
  });

  const updateField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleTypeSelect = async (key) => {
    if (key === 'custom') {
      // "Design your own" → save profile then enter the AI design flow
      await savePetProfile({ ...form, type: 'custom', gender: form.gender || 'female', avatarUri: null });
      // Clear history so the AI starts fresh as the new custom pet
      await clearConversations();
      dispatch({ type: 'SET_MESSAGES', payload: [] });
      // 'Chat' is nested inside the 'HomeTab' stack, so navigate via the parent tab first
      navigation.navigate('HomeTab', { screen: 'Chat', params: { designMode: true } });
      return;
    }
    updateField('type', key);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert(s.profile_no_name_title, s.profile_no_name_msg);
      return;
    }
    const typeChanged = form.type !== petProfile.type || form.name !== petProfile.name;

    // When switching away from custom, also wipe the saved custom image/video
    // so renderVideoArea falls through to the normal pet video.
    const profileToSave = form.type !== 'custom'
      ? { ...form, avatarUri: null, customImageUrl: null, customVideoUrl: null }
      : { ...form, avatarUri: null };
    await savePetProfile(profileToSave);

    // If type or name changed, clear conversation history so the AI
    // re-reads the new identity from scratch instead of being misled
    // by old messages where it was acting as a different pet.
    if (typeChanged) {
      await clearConversations();
      dispatch({ type: 'SET_MESSAGES', payload: [] });
    }

    Alert.alert(s.profile_saved_title, `${form.name}${s.profile_saved_suffix}`);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{s.profile_title}</Text>
        <TouchableOpacity onPress={handleSave}>
          <LinearGradient colors={['#6B5FE3', '#9B89FF']} style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>{s.profile_save_btn}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>

        {/* ── Pet Type grid ── */}
        <View style={styles.field}>
          <Text style={styles.label}>{s.profile_type_label}</Text>
          <View style={styles.typeGrid}>
            {PET_TYPES.map((pt) => {
              const isSelected = form.type === pt.key;
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
        </View>

        {/* ── Pet Name ── */}
        <View style={styles.field}>
          <Text style={styles.label}>{s.profile_name_label}</Text>
          <TextInput
            style={styles.input}
            placeholder={s.profile_name_placeholder}
            placeholderTextColor="#B0AEC8"
            value={form.name}
            onChangeText={(v) => updateField('name', v)}
          />
        </View>

        {/* ── Gender ── */}
        <View style={styles.field}>
          <Text style={styles.label}>{s.profile_gender_label}</Text>
          <View style={styles.radioGroup}>
            {[
              { value: 'male',   label: s.profile_gender_male },
              { value: 'female', label: s.profile_gender_female },
            ].map((g) => (
              <TouchableOpacity
                key={g.value}
                style={styles.radioOption}
                onPress={() => updateField('gender', g.value)}
              >
                <View style={[styles.radioCircle, form.gender === g.value && styles.radioSelected]}>
                  {form.gender === g.value && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.radioLabel}>{g.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Background ── */}
        <View style={styles.field}>
          <Text style={styles.label}>{s.profile_background_label}</Text>
          <TextInput
            style={styles.input}
            placeholder={s.profile_background_placeholder}
            placeholderTextColor="#B0AEC8"
            value={form.background}
            onChangeText={(v) => updateField('background', v)}
          />
        </View>

        {/* ── Personality ── */}
        <View style={styles.field}>
          <Text style={styles.label}>{s.profile_personality_label}</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder={s.profile_personality_placeholder}
            placeholderTextColor="#B0AEC8"
            value={form.personality}
            onChangeText={(v) => updateField('personality', v)}
            multiline
            numberOfLines={3}
          />
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F4FF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  headerTitle:  { fontSize: 22, fontWeight: '800', color: '#2D2060' },
  saveBtn:      { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  saveBtnText:  { color: '#fff', fontWeight: '700', fontSize: 14 },
  form:         { padding: 20 },
  field:        { marginBottom: 24 },
  label:        { fontSize: 14, fontWeight: '600', color: '#4A4470', marginBottom: 10 },

  // ── Type grid ──────────────────────────────────────────────────────────────
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
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
  typeCardSelected: {
    borderColor: '#6B5FE3',
    backgroundColor: '#F0EEFF',
  },
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
  typeCardCustomSelected: {
    borderColor: '#6B5FE3',
    backgroundColor: '#EDE9FF',
    borderStyle: 'solid',
  },
  typeEmoji:   { fontSize: 28 },
  typeLabel:   { fontSize: 12, fontWeight: '600', color: '#6B6B8A', textAlign: 'center' },
  typeLabelSelected: { color: '#6B5FE3' },
  typeLabelCustom:   { fontSize: 14, fontWeight: '700', color: '#9B89FF' },

  // ── Inputs ─────────────────────────────────────────────────────────────────
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    color: '#2D2060',
    borderWidth: 1,
    borderColor: '#E8E4FF',
  },
  inputMultiline: { textAlignVertical: 'top', minHeight: 80 },

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
});
