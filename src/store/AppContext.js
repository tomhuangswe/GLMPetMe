// src/store/AppContext.js
// 全局状态管理（使用React Context + useReducer）

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PET_PROFILE_KEY        = 'pet_profile';
const API_KEY_STORAGE        = 'claude_api_key';
const LANGUAGE_KEY           = 'app_language';
const VISITED_CHAT_KEY       = 'has_visited_chat';
const VOICE_CONVERSATION_KEY = 'voice_conversation_enabled';
const DESIGNED_PETS_KEY      = 'designed_pets';
const TOTAL_VIDEOS_KEY       = 'total_videos_generated';

const initialState = {
  petProfile: {
    name: '',
    type: 'cat',
    gender: 'male',
    background: '',
    personality: '',
    avatarUri: null,
    customImageUrl: null,   // AI-generated custom pet image URL
    customVideoUrl: null,   // AI-generated custom pet idle video URL (latest)
    customVideoUrls: [],    // All generated videos for this pet (persisted for tap-to-switch)
  },
  apiKey: '',
  messages: [],          // [{id, role, content, timestamp, videoTrigger}]
  memories: [],          // [{id, content, createdAt}]
  isLoading: false,
  language: 'en',
  hasVisitedChat: false,
  voiceConversationEnabled: false,
  designedPets: [],      // [{id, label, name, gender, imageUrl, videoUrl, videoUrls}]
  totalVideosGenerated: 0, // cumulative count across all pets and sessions (max 20)
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'SET_PET_PROFILE':
      return { ...state, petProfile: { ...state.petProfile, ...action.payload } };
    case 'SET_API_KEY':
      return { ...state, apiKey: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'SET_MEMORIES':
      return { ...state, memories: action.payload };
    case 'ADD_MEMORY':
      return { ...state, memories: [...state.memories, action.payload] };
    case 'DELETE_MEMORY':
      return { ...state, memories: state.memories.filter((m) => m.id !== action.payload) };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_LANGUAGE':
      return { ...state, language: action.payload };
    case 'SET_HAS_VISITED_CHAT':
      return { ...state, hasVisitedChat: true };
    case 'SET_VOICE_CONVERSATION':
      return { ...state, voiceConversationEnabled: action.payload };
    case 'SET_DESIGNED_PETS':
      return { ...state, designedPets: action.payload };
    case 'SET_TOTAL_VIDEOS':
      return { ...state, totalVideosGenerated: action.payload };
    default:
      return state;
  }
};

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // 初始化：从本地存储加载数据
  useEffect(() => {
    const init = async () => {
      try {
        const [
          profileRaw, apiKeyRaw, memoriesRaw, langRaw,
          visitedChatRaw, voiceConvRaw, designedPetsRaw, totalVideosRaw,
        ] = await Promise.all([
          AsyncStorage.getItem(PET_PROFILE_KEY),
          AsyncStorage.getItem(API_KEY_STORAGE),
          AsyncStorage.getItem('pet_memories'),
          AsyncStorage.getItem(LANGUAGE_KEY),
          AsyncStorage.getItem(VISITED_CHAT_KEY),
          AsyncStorage.getItem(VOICE_CONVERSATION_KEY),
          AsyncStorage.getItem(DESIGNED_PETS_KEY),
          AsyncStorage.getItem(TOTAL_VIDEOS_KEY),
        ]);
        if (profileRaw)         dispatch({ type: 'SET_PET_PROFILE',        payload: JSON.parse(profileRaw) });
        if (apiKeyRaw)          dispatch({ type: 'SET_API_KEY',            payload: apiKeyRaw });
        if (memoriesRaw)        dispatch({ type: 'SET_MEMORIES',           payload: JSON.parse(memoriesRaw) });
        if (langRaw)            dispatch({ type: 'SET_LANGUAGE',           payload: langRaw });
        if (visitedChatRaw === 'true') dispatch({ type: 'SET_HAS_VISITED_CHAT' });
        if (voiceConvRaw !== null) dispatch({ type: 'SET_VOICE_CONVERSATION', payload: voiceConvRaw !== 'false' });
        if (designedPetsRaw)    dispatch({ type: 'SET_DESIGNED_PETS',      payload: JSON.parse(designedPetsRaw) });
        if (totalVideosRaw)     dispatch({ type: 'SET_TOTAL_VIDEOS',       payload: parseInt(totalVideosRaw, 10) || 0 });
      } catch (e) {
        console.log('Init load error:', e);
      }
    };
    init();
  }, []);

  const savePetProfile = async (profile) => {
    const updated = { ...state.petProfile, ...profile };
    dispatch({ type: 'SET_PET_PROFILE', payload: profile });
    await AsyncStorage.setItem(PET_PROFILE_KEY, JSON.stringify(updated));
  };

  const saveApiKey = async (key) => {
    dispatch({ type: 'SET_API_KEY', payload: key });
    await AsyncStorage.setItem(API_KEY_STORAGE, key);
  };

  const saveLanguage = async (lang) => {
    dispatch({ type: 'SET_LANGUAGE', payload: lang });
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  };

  const saveVoiceConversation = async (enabled) => {
    dispatch({ type: 'SET_VOICE_CONVERSATION', payload: enabled });
    await AsyncStorage.setItem(VOICE_CONVERSATION_KEY, enabled ? 'true' : 'false');
  };

  const markChatVisited = async () => {
    if (state.hasVisitedChat) return;
    dispatch({ type: 'SET_HAS_VISITED_CHAT' });
    await AsyncStorage.setItem(VISITED_CHAT_KEY, 'true');
  };

  // saveDesignedPet: upsert by imageUrl — prevents duplicate entries even if
  // generateVideoInBackground is somehow called more than once for the same pet.
  const saveDesignedPet = async (pet) => {
    const existingIdx = state.designedPets.findIndex(p => p.imageUrl === pet.imageUrl);
    let newList;
    if (existingIdx >= 0) {
      // Same image already saved → update video info but keep original label/id
      newList = state.designedPets.map((p, i) =>
        i === existingIdx ? { ...p, videoUrl: pet.videoUrl, videoUrls: pet.videoUrls } : p
      );
    } else {
      newList = [...state.designedPets, pet];
    }
    dispatch({ type: 'SET_DESIGNED_PETS', payload: newList });
    await AsyncStorage.setItem(DESIGNED_PETS_KEY, JSON.stringify(newList));
  };

  // updateDesignedPetVideos: called after showit videos to keep the pet's video
  // list in sync without creating a new entry.
  const updateDesignedPetVideos = async (imageUrl, videoUrl, videoUrls) => {
    const existingIdx = state.designedPets.findIndex(p => p.imageUrl === imageUrl);
    if (existingIdx < 0) return; // no matching pet — nothing to update
    const newList = state.designedPets.map((p, i) =>
      i === existingIdx ? { ...p, videoUrl, videoUrls } : p
    );
    dispatch({ type: 'SET_DESIGNED_PETS', payload: newList });
    await AsyncStorage.setItem(DESIGNED_PETS_KEY, JSON.stringify(newList));
  };

  const incrementVideoCount = async () => {
    const next = state.totalVideosGenerated + 1;
    dispatch({ type: 'SET_TOTAL_VIDEOS', payload: next });
    await AsyncStorage.setItem(TOTAL_VIDEOS_KEY, String(next));
    return next;
  };

  return (
    <AppContext.Provider value={{
      state, dispatch,
      savePetProfile, saveApiKey, saveLanguage, saveVoiceConversation,
      markChatVisited, saveDesignedPet, updateDesignedPetVideos, incrementVideoCount,
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
