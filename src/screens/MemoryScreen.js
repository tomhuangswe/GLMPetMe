// src/screens/MemoryScreen.js
// 记忆页面：展示和管理宠物对用户的所有记忆

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Animated,
} from 'react-native';
import { useApp } from '../store/AppContext';
import { useTranslation } from '../i18n';
import { deleteMemory } from '../services/claudeService';

function MemoryCard({ memory, onDelete, s }) {
  const scaleAnim = new Animated.Value(1);

  const handleDelete = () => {
    Alert.alert(s.memory_delete_title, s.memory_delete_msg, [
      { text: s.memory_delete_cancel, style: 'cancel' },
      {
        text: s.memory_delete_confirm,
        style: 'destructive',
        onPress: () => {
          Animated.timing(scaleAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start(() => onDelete(memory.id));
        },
      },
    ]);
  };

  const date = new Date(memory.createdAt).toLocaleDateString(s.memory_date_locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
      <View style={styles.cardDot} />
      <View style={styles.cardContent}>
        <Text style={styles.cardText}>{memory.content}</Text>
        <Text style={styles.cardDate}>{date}</Text>
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
        <Text style={styles.deleteBtnText}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function MemoryScreen() {
  const { state, dispatch } = useApp();
  const s = useTranslation();
  const { memories, petProfile } = state;

  const handleDelete = async (id) => {
    await deleteMemory(id);
    dispatch({ type: 'DELETE_MEMORY', payload: id });
  };

  const handleClearAll = () => {
    Alert.alert(s.memory_clear_all_title, s.memory_clear_all_msg, [
      { text: s.memory_delete_cancel, style: 'cancel' },
      {
        text: s.memory_clear_all_confirm,
        style: 'destructive',
        onPress: async () => {
          await Promise.all(memories.map((m) => deleteMemory(m.id)));
          dispatch({ type: 'SET_MEMORIES', payload: [] });
        },
      },
    ]);
  };

  const petEmoji = {
    cat: '🐱', dog: '🐶', rabbit: '🐰', turtle: '🐢', human: '🧑',
  }[petProfile.type] || '🐾';

  const petName = petProfile.name || s.memory_default_pet_name;

  // 副标题："{emoji} {name} remembers 3 things" / "{emoji} {name} 记住了 3 件事"
  const subtitleText = state.language === 'zh'
    ? `${petEmoji} ${petName} 记住了 ${memories.length} 件事`
    : `${petEmoji} ${petName} remembers ${memories.length} thing${memories.length !== 1 ? 's' : ''}`;

  // 空状态文字："Chat more with {name}!" / "和{name}多聊聊吧！"
  const emptyText = state.language === 'zh'
    ? `和${petName}多聊聊吧！\n它会自动记住你分享的生活点滴 💕`
    : `Chat more with ${petName}!\nIt will remember the little moments you share 💕`;

  return (
    <View style={styles.container}>
      {/* 头部 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{s.memory_page_title}</Text>
          <Text style={styles.subtitle}>{subtitleText}</Text>
        </View>
        {memories.length > 0 && (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>{s.memory_clear_all_btn}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.hint}>{s.memory_hint}</Text>

      {memories.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🧠</Text>
          <Text style={styles.emptyTitle}>{s.memory_empty_title}</Text>
          <Text style={styles.emptyText}>{emptyText}</Text>
        </View>
      ) : (
        <FlatList
          data={[...memories].reverse()}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MemoryCard memory={item} onDelete={handleDelete} s={s} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF5' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2D2000',
    fontStyle: 'italic',
  },
  subtitle: { fontSize: 14, color: '#8A7A50', marginTop: 4 },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFE0E0',
    borderRadius: 12,
  },
  clearBtnText: { color: '#D06060', fontSize: 13, fontWeight: '600' },
  hint: {
    fontSize: 13,
    color: '#A09060',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
    fontStyle: 'italic',
  },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  card: {
    backgroundColor: '#FFFACD',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#C0A000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F5E680',
  },
  cardDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F5A623',
    marginTop: 4,
    marginRight: 12,
    flexShrink: 0,
  },
  cardContent: { flex: 1 },
  cardText: { fontSize: 15, color: '#3D3000', lineHeight: 22 },
  cardDate: { fontSize: 12, color: '#A09060', marginTop: 6 },
  deleteBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F5A623',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  deleteBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: -40,
  },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#4A3A00', marginBottom: 10 },
  emptyText: { fontSize: 15, color: '#8A7A50', textAlign: 'center', lineHeight: 22 },
});
