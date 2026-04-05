// src/App.jsx  — Tab navigation shell
import React from 'react';
import { AppProvider, useApp } from './store/AppContext';
import { useTranslation } from './i18n';
import HomeScreen    from './screens/HomeScreen';
import ChatScreen    from './screens/ChatScreen';
import MemoryScreen  from './screens/MemoryScreen';
import SettingsScreen from './screens/SettingsScreen';

const TABS = [
  { key: 'home',     icon: '🏠' },
  { key: 'settings', icon: '⚙️' },
  { key: 'memory',   icon: '🧠' },
  { key: 'vip',      icon: '👑' },
];

function VIPScreen() {
  return (
    <div style={vipStyles.container}>
      <span style={vipStyles.crown}>👑</span>
      <p style={vipStyles.text}>
        VIP features will come soon! Currently due to budget limit, the customized pet video generation is not available yet. We will make it available in a few weeks.
      </p>
    </div>
  );
}

const vipStyles = {
  container: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '40px 32px', textAlign: 'center', height: '100%',
  },
  crown: { fontSize: 64, marginBottom: 24 },
  text: {
    fontSize: 16, lineHeight: 1.7, color: '#5A5380',
    maxWidth: 320, margin: 0,
  },
};

function AppShell() {
  const { state, navigateTo } = useApp();
  const s = useTranslation();
  const activeTab = state.activeTab || 'home';

  const tabLabels = {
    home:     s.tab_home,
    settings: s.tab_settings,
    memory:   s.tab_memory,
    vip:      s.tab_vip,
  };

  return (
    <div style={shell.root}>
      {/* Screen area */}
      <div style={shell.screen}>
        {activeTab === 'home'     && <HomeScreen />}
        {activeTab === 'chat'     && <ChatScreen />}
        {activeTab === 'memory'   && <MemoryScreen />}
        {activeTab === 'settings' && <SettingsScreen />}
        {activeTab === 'vip'      && <VIPScreen />}
      </div>

      {/* Bottom tab bar */}
      <nav style={shell.tabBar}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              style={{ ...shell.tabBtn, ...(isActive ? shell.tabBtnActive : {}) }}
              onClick={() => navigateTo(tab.key)}
            >
              <span style={shell.tabIcon}>{tab.icon}</span>
              <span style={{ ...shell.tabLabel, ...(isActive ? shell.tabLabelActive : {}) }}>
                {tabLabels[tab.key]}
              </span>
              {isActive && <div style={shell.tabActiveDot} />}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

const shell = {
  root: {
    display: 'flex', flexDirection: 'column', height: '100vh', width: '100%',
    maxWidth: 480, margin: '0 auto',
    boxShadow: '0 0 40px rgba(107,95,227,0.1)',
    background: '#fff',
  },
  screen: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' },
  tabBar: {
    display: 'flex', justifyContent: 'space-around', alignItems: 'center',
    padding: '8px 0 12px', background: 'rgba(255,255,255,0.97)',
    borderTop: '1px solid rgba(107,95,227,0.1)',
    flexShrink: 0,
  },
  tabBtn: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 3, padding: '4px 0', border: 'none', background: 'transparent',
    cursor: 'pointer', position: 'relative',
  },
  tabBtnActive: {},
  tabIcon:  { fontSize: 22 },
  tabLabel: { fontSize: 11, color: '#9B97B8', fontWeight: 500 },
  tabLabelActive: { color: '#6B5FE3', fontWeight: 700 },
  tabActiveDot: {
    position: 'absolute', bottom: -4,
    width: 4, height: 4, borderRadius: '50%', background: '#6B5FE3',
  },
};

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
