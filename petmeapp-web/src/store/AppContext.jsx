// src/store/AppContext.jsx  — Web 版（localStorage 替代 AsyncStorage）
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { loadMemories } from '../services/glmService';

const initialState = {
  petProfile: {
    name: '', type: 'cat', gender: 'male', background: '', personality: '',
    avatarUri: null, customImageUrl: null, customVideoUrl: null, customVideoUrls: [],
  },
  messages: [],
  memories: [],
  isLoading: false,
  language: 'en',
  voiceConversationEnabled: false,
  designedPets: [],
  totalVideosGenerated: 0,
  activeTab: 'home',
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_PET_PROFILE':      return { ...state, petProfile: { ...state.petProfile, ...action.payload } };
    case 'ADD_MESSAGE':          return { ...state, messages: [...state.messages, action.payload] };
    case 'SET_MESSAGES':         return { ...state, messages: action.payload };
    case 'SET_MEMORIES':         return { ...state, memories: action.payload };
    case 'ADD_MEMORY':           return { ...state, memories: [...state.memories, action.payload] };
    case 'DELETE_MEMORY':        return { ...state, memories: state.memories.filter(m => m.id !== action.payload) };
    case 'SET_LOADING':          return { ...state, isLoading: action.payload };
    case 'SET_LANGUAGE':         return { ...state, language: action.payload };
    case 'SET_VOICE_CONVERSATION': return { ...state, voiceConversationEnabled: action.payload };
    case 'SET_DESIGNED_PETS':    return { ...state, designedPets: action.payload };
    case 'SET_TOTAL_VIDEOS':     return { ...state, totalVideosGenerated: action.payload };
    case 'SET_ACTIVE_TAB':       return { ...state, activeTab: action.payload };
    default: return state;
  }
};

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // 初始化：从 localStorage 加载
  useEffect(() => {
    try {
      const profileRaw     = localStorage.getItem('pet_profile');
      const memoriesRaw    = localStorage.getItem('pet_memories');
      const langRaw        = localStorage.getItem('app_language');
      const voiceRaw       = localStorage.getItem('voice_conversation_enabled');
      const designedRaw    = localStorage.getItem('designed_pets');
      const totalVideosRaw = localStorage.getItem('total_videos_generated');

      if (profileRaw)     dispatch({ type: 'SET_PET_PROFILE',       payload: JSON.parse(profileRaw) });
      if (memoriesRaw)    dispatch({ type: 'SET_MEMORIES',          payload: JSON.parse(memoriesRaw) });
      if (langRaw)        dispatch({ type: 'SET_LANGUAGE',          payload: langRaw });
      if (voiceRaw)       dispatch({ type: 'SET_VOICE_CONVERSATION', payload: voiceRaw !== 'false' });
      if (designedRaw)    dispatch({ type: 'SET_DESIGNED_PETS',     payload: JSON.parse(designedRaw) });
      if (totalVideosRaw) dispatch({ type: 'SET_TOTAL_VIDEOS',      payload: parseInt(totalVideosRaw, 10) || 0 });
    } catch (e) { console.log('Init load error:', e); }
  }, []);

  const savePetProfile = (profile) => {
    const updated = { ...state.petProfile, ...profile };
    dispatch({ type: 'SET_PET_PROFILE', payload: profile });
    localStorage.setItem('pet_profile', JSON.stringify(updated));
  };

  const saveLanguage = (lang) => {
    dispatch({ type: 'SET_LANGUAGE', payload: lang });
    localStorage.setItem('app_language', lang);
  };

  const saveVoiceConversation = (enabled) => {
    dispatch({ type: 'SET_VOICE_CONVERSATION', payload: enabled });
    localStorage.setItem('voice_conversation_enabled', enabled ? 'true' : 'false');
  };

  const saveDesignedPet = (pet) => {
    const existingIdx = state.designedPets.findIndex(p => p.imageUrl === pet.imageUrl);
    let newList;
    if (existingIdx >= 0) {
      newList = state.designedPets.map((p, i) =>
        i === existingIdx ? { ...p, videoUrl: pet.videoUrl, videoUrls: pet.videoUrls } : p
      );
    } else {
      newList = [...state.designedPets, pet];
    }
    dispatch({ type: 'SET_DESIGNED_PETS', payload: newList });
    localStorage.setItem('designed_pets', JSON.stringify(newList));
  };

  const updateDesignedPetVideos = (imageUrl, videoUrl, videoUrls) => {
    const existingIdx = state.designedPets.findIndex(p => p.imageUrl === imageUrl);
    if (existingIdx < 0) return;
    const newList = state.designedPets.map((p, i) =>
      i === existingIdx ? { ...p, videoUrl, videoUrls } : p
    );
    dispatch({ type: 'SET_DESIGNED_PETS', payload: newList });
    localStorage.setItem('designed_pets', JSON.stringify(newList));
  };

  const incrementVideoCount = () => {
    const next = state.totalVideosGenerated + 1;
    dispatch({ type: 'SET_TOTAL_VIDEOS', payload: next });
    localStorage.setItem('total_videos_generated', String(next));
    return next;
  };

  const navigateTo = (tab) => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab });

  return (
    <AppContext.Provider value={{
      state, dispatch,
      savePetProfile, saveLanguage, saveVoiceConversation,
      saveDesignedPet, updateDesignedPetVideos, incrementVideoCount,
      navigateTo,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
