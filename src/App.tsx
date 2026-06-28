import { useState, useEffect } from 'react';
import { LandingPage } from './components/LandingPage';
import { Login } from './components/Login';
import { AdminPanel } from './components/AdminPanel';
import { CustomAlert, AlertConfig } from './components/CustomAlert';
import { Settings } from './types';

export default function App() {
  // Screen state
  const [currentScreen, setCurrentScreen] = useState<'landing' | 'login' | 'admin'>('landing');

  // Token and logged in user
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('admin_token');
  });
  const [user, setUser] = useState<{ username: string; fullName: string } | null>(() => {
    const saved = localStorage.getItem('admin_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Global settings for dynamic browser head title & logo styling
  const [settings, setSettings] = useState<Settings | null>(null);

  // Custom alert dialog state (SweetAlert-like)
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });

  // Verify and update settings initially
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/public/settings');
        const data = await res.json();
        setSettings(data);
        if (data.siteName) {
          document.title = data.siteName;
        }
        if (data.themeMode) {
          const root = window.document.documentElement;
          if (data.themeMode === 'dark') {
            root.classList.add('dark');
          } else if (data.themeMode === 'light') {
            root.classList.remove('dark');
          } else if (data.themeMode === 'system') {
            const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (isSystemDark) {
              root.classList.add('dark');
            } else {
              root.classList.remove('dark');
            }
          }
        }
      } catch (err) {
        console.error('Error fetching settings:', err);
      }
    };

    fetchSettings();
  }, [currentScreen]);

  // Handle automatic routing on reload if token exists
  useEffect(() => {
    const verifySavedToken = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/auth/verify', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (res.ok) {
          const verifiedUser = await res.json();
          setUser(verifiedUser);
          setCurrentScreen('admin');
        } else {
          // Bad token
          handleLogout();
        }
      } catch (err) {
        // Server unreachable or down, fallback to landing or keep cached
        setCurrentScreen('landing');
      }
    };

    verifySavedToken();
  }, []);

  const handleLoginSuccess = (newToken: string, loggedInUser: { username: string; fullName: string }) => {
    setToken(newToken);
    setUser(loggedInUser);
    localStorage.setItem('admin_token', newToken);
    localStorage.setItem('admin_user', JSON.stringify(loggedInUser));

    // Show nice success prompt
    triggerAlert({
      type: 'success',
      title: 'Selamat Datang!',
      message: `Berhasil masuk sebagai ${loggedInUser.fullName}. Anda diarahkan ke Admin Panel CMS.`
    });

    setCurrentScreen('admin');
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    setCurrentScreen('landing');

    triggerAlert({
      type: 'info',
      title: 'Sesi Selesai',
      message: 'Anda telah berhasil keluar dari akun administrator.'
    });
  };

  const triggerAlert = (config: Omit<AlertConfig, 'isOpen'>) => {
    setAlertConfig({
      ...config,
      isOpen: true
    });
  };

  return (
    <div className="w-full min-h-screen">
      {currentScreen === 'landing' && (
        <LandingPage
          onGoToLogin={() => setCurrentScreen('login')}
          triggerAlert={triggerAlert}
        />
      )}

      {currentScreen === 'login' && (
        <Login
          onLoginSuccess={handleLoginSuccess}
          onBackToLanding={() => setCurrentScreen('landing')}
          settings={settings}
        />
      )}

      {currentScreen === 'admin' && token && (
        <AdminPanel
          token={token}
          onLogout={handleLogout}
          triggerAlert={triggerAlert}
        />
      )}

      {/* Global SweetAlert modal */}
      <CustomAlert
        config={alertConfig}
        onClose={() => setAlertConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
