// src/screens/MemoryScreen.jsx
import React from 'react';
import { useApp } from '../store/AppContext';
import { useTranslation } from '../i18n';
import { deleteMemory } from '../services/glmService';

const PET_EMOJIS = { cat: '🐱', dog: '🐶', rabbit: '🐰', turtle: '🐢', human: '🧑' };

export default function MemoryScreen() {
  const { state, dispatch } = useApp();
  const s = useTranslation();
  const { memories, petProfile } = state;

  const petEmoji = PET_EMOJIS[petProfile.type] || '🐾';
  const petName  = petProfile.name || s.memory_default_pet_name;

  const subtitleText = state.language === 'zh'
    ? `${petEmoji} ${petName} 记住了 ${memories.length} 件事`
    : `${petEmoji} ${petName} remembers ${memories.length} thing${memories.length !== 1 ? 's' : ''}`;

  const emptyText = state.language === 'zh'
    ? `和${petName}多聊聊吧！\n它会自动记住你分享的生活点滴 💕`
    : `Chat more with ${petName}!\nIt will remember the little moments you share 💕`;

  const handleDelete = (id) => {
    if (!window.confirm(s.memory_delete_msg)) return;
    deleteMemory(id);
    dispatch({ type: 'DELETE_MEMORY', payload: id });
  };

  const handleClearAll = () => {
    if (!window.confirm(s.memory_clear_all_msg)) return;
    memories.forEach(m => deleteMemory(m.id));
    dispatch({ type: 'SET_MEMORIES', payload: [] });
  };

  return (
    <div style={css.container}>
      {/* 头部 */}
      <div style={css.header}>
        <div>
          <h2 style={css.title}>{s.memory_page_title}</h2>
          <p style={css.subtitle}>{subtitleText}</p>
        </div>
        {memories.length > 0 && (
          <button style={css.clearBtn} onClick={handleClearAll}>
            {s.memory_clear_all_btn}
          </button>
        )}
      </div>

      <p style={css.hint}>{s.memory_hint}</p>

      {memories.length === 0 ? (
        <div style={css.emptyState}>
          <span style={css.emptyEmoji}>🧠</span>
          <p style={css.emptyTitle}>{s.memory_empty_title}</p>
          <p style={css.emptyText}>{emptyText}</p>
        </div>
      ) : (
        <div style={css.list}>
          {[...memories].reverse().map(memory => {
            const date = new Date(memory.createdAt).toLocaleDateString(s.memory_date_locale, {
              year: 'numeric', month: 'short', day: 'numeric',
            });
            return (
              <div key={memory.id} style={css.card}>
                <div style={css.cardDot} />
                <div style={css.cardContent}>
                  <p style={css.cardText}>{memory.content}</p>
                  <p style={css.cardDate}>{date}</p>
                </div>
                <button style={css.deleteBtn} onClick={() => handleDelete(memory.id)}>✕</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const css = {
  container:  { flex: 1, background: '#FFFDF5', overflowY: 'auto', display: 'flex', flexDirection: 'column' },
  header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '40px 20px 8px' },
  title:      { fontSize: 24, fontWeight: 800, color: '#2D2000', fontStyle: 'italic', margin: 0 },
  subtitle:   { fontSize: 14, color: '#8A7A50', marginTop: 4 },
  clearBtn:   { padding: '6px 12px', background: '#FFE0E0', border: 'none', borderRadius: 12, color: '#D06060', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  hint:       { fontSize: 13, color: '#A09060', textAlign: 'center', padding: '0 20px 20px', fontStyle: 'italic' },
  list:       { display: 'flex', flexDirection: 'column', gap: 16, padding: '0 20px 40px' },
  card: {
    background: '#FFFACD', borderRadius: 16, padding: 16,
    display: 'flex', alignItems: 'flex-start', gap: 12,
    boxShadow: '0 2px 12px rgba(192,160,0,0.10)',
    border: '1px solid #F5E680',
  },
  cardDot:     { width: 12, height: 12, borderRadius: '50%', background: '#F5A623', marginTop: 5, flexShrink: 0 },
  cardContent: { flex: 1 },
  cardText:    { fontSize: 15, color: '#3D3000', lineHeight: 1.55, margin: 0 },
  cardDate:    { fontSize: 12, color: '#A09060', marginTop: 6 },
  deleteBtn:   { width: 24, height: 24, borderRadius: '50%', background: '#F5A623', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 },
  emptyState:  { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 40px' },
  emptyEmoji:  { fontSize: 64, marginBottom: 16, display: 'block' },
  emptyTitle:  { fontSize: 20, fontWeight: 700, color: '#4A3A00', marginBottom: 10, textAlign: 'center' },
  emptyText:   { fontSize: 15, color: '#8A7A50', textAlign: 'center', lineHeight: 1.6, whiteSpace: 'pre-line' },
};
