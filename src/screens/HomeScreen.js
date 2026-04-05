// src/screens/HomeScreen.js
// 首页：选择宠物类型，展示宠物形象，快速进入对话

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  NativeModules,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useApp } from '../store/AppContext';
import { useTranslation } from '../i18n';

const SpeechInput = NativeModules.SpeechInput;

const { width } = Dimensions.get('window');

const PET_TYPES = [
  { key: 'cat',    label: 'cat',            emoji: '🐱' },
  { key: 'dog',    label: 'dog',            emoji: '🐶' },
  { key: 'rabbit', label: 'rabbit',         emoji: '🐰' },
  { key: 'turtle', label: 'turtle',         emoji: '🐢' },
  { key: 'boy',    label: 'boy',            emoji: '👦' },
  { key: 'girl',   label: 'girl',           emoji: '👧' },
  { key: 'custom', label: 'design your own', emoji: '✨' },
];

const PET_EMOJIS = {
  cat: '🐱', dog: '🐶', rabbit: '🐰', turtle: '🐢',
  boy: '👦', girl: '👧', custom: '✨',
  // 向后兼容旧数据
  human: '🧑', others: '✨',
};

export default function HomeScreen({ navigation }) {
  const { state, savePetProfile } = useApp();
  const s = useTranslation();
  const [inputText, setInputText] = useState('');
  const [selectedType, setSelectedType] = useState(state.petProfile.type || 'cat');
  const [isRecording, setIsRecording] = useState(false);
  const pulseAnim = new Animated.Value(1);

  const startPulse = () => {
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.08, duration: 300, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const handleTypeSelect = (type) => {
    if (type === 'custom') {
      // "design your own" → 跳转到聊天页面，进入 AI 宠物设计流程
      savePetProfile({ type: 'custom', gender: 'female' });
      navigation.navigate('Chat', { designMode: true });
      return;
    }
    setSelectedType(type);
    // boy/girl 自动对应性别，避免后续 TTS 音调错误
    const gender = type === 'girl' ? 'female' : 'male';
    savePetProfile({ type, gender });
    startPulse();
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    const lower = inputText.toLowerCase();
    const matched = PET_TYPES.find((p) => lower.includes(p.key));
    if (matched) handleTypeSelect(matched.key);
    const textToSend = inputText.trim();
    setInputText('');
    // 将首页输入的文字作为 initialMessage 传给 ChatScreen
    navigation.navigate('Chat', { initialMessage: textToSend });
  };

  const handleVoice = async () => {
    if (!SpeechInput) {
      Alert.alert('语音识别不可用', '原生模块未加载，请重新编译 App');
      return;
    }
    try {
      const available = await SpeechInput.isAvailable();
      if (!available) {
        Alert.alert('语音识别不可用', '请在设备上安装 Google 应用或 Google 语音服务后重试。');
        return;
      }
    } catch (e) {
      Alert.alert('语音识别不可用', String(e?.message || e));
      return;
    }
    try {
      setIsRecording(true);
      const locale = state.language === 'zh' ? 'zh-CN' : 'en-US';
      const result = await SpeechInput.start(locale);
      if (result) {
        // 识别成功 → 直接跳转聊天界面并发送
        navigation.navigate('Chat', { initialMessage: result });
      }
    } catch (e) {
      Alert.alert('语音识别失败', e?.message || String(e));
    } finally {
      setIsRecording(false);
    }
  };

  const petName = state.petProfile.name || s.home_default_name;
  const hasSetupPet = state.petProfile.name && state.petProfile.type;
  const petEmoji = PET_EMOJIS[selectedType] || '🐾';

  const chatBtnText = state.language === 'zh'
    ? `💬 和${petName}聊天`
    : `💬 Chat with ${petName}`;

  return (
    // KeyboardAvoidingView 包裹整个页面，键盘弹出时自动压缩高度，
    // 让处于普通流中的 inputBar 随之上移，不再被键盘遮挡
    <KeyboardAvoidingView
      style={styles.kvContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={['#EEF0FF', '#E8E0FF', '#F0EEFF']} style={styles.container}>

        {/* 可滚动内容区 */}
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity onPress={() => navigation.navigate('Chat')} activeOpacity={0.9}>
            <Animated.View style={[styles.avatarWrapper, { transform: [{ scale: pulseAnim }] }]}>
              <LinearGradient colors={['#ffffff', '#f0eeff']} style={styles.avatarCircle}>
                {state.petProfile.avatarUri ? (
                  <Image source={{ uri: state.petProfile.avatarUri }} style={styles.avatar} />
                ) : (
                  <Text style={styles.avatarEmoji}>{petEmoji}</Text>
                )}
              </LinearGradient>
              {hasSetupPet && (
                <View style={styles.nameBadge}>
                  <Text style={styles.nameBadgeText}>{petName}</Text>
                </View>
              )}
            </Animated.View>
          </TouchableOpacity>

          <Text style={styles.titleText}>
            {hasSetupPet ? `Hi, I'm ${petName}! 🐾` : s.home_title_new}
          </Text>
          {!hasSetupPet && (
            <Text style={styles.subtitleText}>{s.home_subtitle}</Text>
          )}

          <View style={styles.chipsContainer}>
            {PET_TYPES.map((p) => (
              <TouchableOpacity
                key={p.key}
                style={[styles.chip, selectedType === p.key && styles.chipSelected]}
                onPress={() => handleTypeSelect(p.key)}
              >
                <Text style={[styles.chipText, selectedType === p.key && styles.chipTextSelected]}>
                  {p.emoji} {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {hasSetupPet && (
            <TouchableOpacity style={styles.chatButton} onPress={() => navigation.navigate('Chat')}>
              <LinearGradient colors={['#6B5FE3', '#9B89FF']} style={styles.chatButtonGradient}>
                <Text style={styles.chatButtonText}>{chatBtnText}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* 输入栏：普通流布局（非 absolute），键盘弹出时随容器压缩自动上移 */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder={s.home_placeholder}
            placeholderTextColor="#aaa"
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.voiceBtn, isRecording && styles.voiceBtnActive]}
            onPress={handleVoice}
            disabled={isRecording}
          >
            <Text style={styles.iconText}>{isRecording ? '🔴' : '🎤'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <LinearGradient colors={['#6B5FE3', '#9B89FF']} style={styles.sendGradient}>
              <Text style={styles.sendIcon}>➤</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // KeyboardAvoidingView 需要独立的 flex:1 样式
  kvContainer: { flex: 1 },
  container: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 24,   // 不再需要为 absolute inputBar 预留 120px
    paddingHorizontal: 24,
  },
  avatarWrapper: { alignItems: 'center', marginBottom: 32 },
  avatarCircle: { width: 200, height: 200, borderRadius: 100, justifyContent: 'center', alignItems: 'center', shadowColor: '#6B5FE3', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.25, shadowRadius: 24, elevation: 12 },
  avatarEmoji: { fontSize: 100 },
  avatar: { width: 170, height: 170, borderRadius: 85, resizeMode: 'cover' },
  nameBadge: { position: 'absolute', bottom: -6, backgroundColor: '#6B5FE3', paddingHorizontal: 16, paddingVertical: 4, borderRadius: 20 },
  nameBadgeText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  titleText: { fontSize: 20, fontWeight: '700', color: '#2D2060', textAlign: 'center', marginBottom: 10 },
  subtitleText: { fontSize: 15, color: '#6B6B8A', textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 28 },
  chip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.8)', borderWidth: 1, borderColor: 'rgba(107, 95, 227, 0.2)' },
  chipSelected: { backgroundColor: '#6B5FE3', borderColor: '#6B5FE3' },
  chipText: { fontSize: 14, color: '#5A5480', fontWeight: '500' },
  chipTextSelected: { color: '#fff' },
  chatButton: { width: '80%', borderRadius: 28, overflow: 'hidden', marginTop: 8 },
  chatButtonGradient: { paddingVertical: 16, alignItems: 'center' },
  chatButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // inputBar：去掉 position/bottom/left/right，改为普通流
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(107, 95, 227, 0.1)',
  },
  input: { flex: 1, height: 46, backgroundColor: '#F3F1FF', borderRadius: 23, paddingHorizontal: 18, fontSize: 15, color: '#2D2060', marginRight: 8 },
  voiceBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 4 },
  voiceBtnActive: { backgroundColor: '#FFE8E8' },
  iconText: { fontSize: 22 },
  sendBtn: { borderRadius: 23, overflow: 'hidden' },
  sendGradient: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  sendIcon: { color: '#fff', fontSize: 18 },
});
