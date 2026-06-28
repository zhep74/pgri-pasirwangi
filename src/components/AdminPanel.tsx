import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  FileText,
  Image,
  Users,
  Calendar,
  Download as DownloadIcon,
  Mail,
  Settings as SettingsIcon,
  UserCheck,
  LogOut,
  Moon,
  Sun,
  Plus,
  Edit2,
  Trash2,
  Upload,
  Check,
  Eye,
  FileDown,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  PlusCircle,
  Hash,
  Database,
  RefreshCw,
  Copy,
  AlertCircle,
  Terminal,
  Cloud,
  CheckCheck
} from 'lucide-react';
import {
  User,
  Slider,
  Profile,
  Category,
  News,
  Gallery,
  Agenda,
  Download,
  ContactMessage,
  Settings,
  Pengurus
} from '../types';
import { AlertConfig } from './CustomAlert';

interface AdminPanelProps {
  token: string;
  onLogout: () => void;
  triggerAlert: (config: Omit<AlertConfig, 'isOpen'>) => void;
}

type AdminTab =
  | 'dashboard'
  | 'profile'
  | 'sliders'
  | 'pengurus'
  | 'news'
  | 'categories'
  | 'galleries'
  | 'agendas'
  | 'downloads'
  | 'contacts'
  | 'settings'
  | 'admins'
  | 'supabase';

const getAdminBgClass = (style: string | undefined) => {
  switch (style) {
    case 'zinc':
      return 'bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100';
    case 'slate':
      return 'bg-slate-200 dark:bg-slate-900 text-slate-950 dark:text-slate-100';
    case 'navy':
      return 'bg-gradient-to-tr from-blue-50 to-indigo-100 dark:from-slate-950 dark:to-slate-900 text-slate-800 dark:text-slate-100';
    case 'forest':
      return 'bg-gradient-to-tr from-emerald-50 to-teal-50 dark:from-slate-950 dark:to-emerald-950/20 text-slate-800 dark:text-slate-100';
    case 'purple':
      return 'bg-gradient-to-tr from-purple-50/70 to-fuchsia-50/70 dark:from-slate-950 dark:to-purple-950/20 text-slate-800 dark:text-slate-100';
    case 'sunset':
      return 'bg-gradient-to-tr from-rose-50 to-amber-50 dark:from-slate-950 dark:to-rose-950/20 text-slate-800 dark:text-slate-100';
    case 'dark':
      return 'bg-slate-950 text-slate-100 dark:bg-slate-950 dark:text-slate-100';
    default:
      return 'bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100';
  }
};

const getYouTubeEmbedUrl = (url: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.includes('youtube.com/embed/')) return trimmed;
  let videoId = '';
  try {
    if (trimmed.includes('youtube.com/shorts/')) {
      videoId = trimmed.split('/shorts/')[1]?.split(/[?#]/)[0] || '';
    } else if (trimmed.includes('youtube.com/watch')) {
      const urlObj = new URL(trimmed);
      videoId = urlObj.searchParams.get('v') || '';
    } else if (trimmed.includes('youtu.be/')) {
      videoId = trimmed.split('youtu.be/')[1]?.split(/[?#]/)[0] || '';
    } else if (trimmed.includes('youtube.com/v/')) {
      videoId = trimmed.split('/v/')[1]?.split(/[?#]/)[0] || '';
    }
  } catch (e) {
    console.error('Error parsing YouTube URL:', e);
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}` : trimmed;
};

export const AdminPanel: React.FC<AdminPanelProps> = ({ token, onLogout, triggerAlert }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('admin-theme') === 'dark';
  });

  // DB States
  const [stats, setStats] = useState({
    newsCount: 0,
    agendaCount: 0,
    galleryCount: 0,
    downloadCount: 0,
    pengurusCount: 0,
    contactCount: 0,
    visitors: 0
  });

  const [sliders, setSliders] = useState<Slider[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pengurus, setPengurus] = useState<Pengurus[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [downloads, setDownloads] = useState<Download[]>([]);
  const [contacts, setContacts] = useState<ContactMessage[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [admins, setAdmins] = useState<User[]>([]);

  // Supabase states
  const [supabaseStatus, setSupabaseStatus] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [supabaseUrlInput, setSupabaseUrlInput] = useState('');
  const [supabaseKeyInput, setSupabaseKeyInput] = useState('');
  const [supabaseProjectIdInput, setSupabaseProjectIdInput] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  // Collapsible states for Supabase tab
  const [collapseKoneksi, setCollapseKoneksi] = useState(false);
  const [collapseConfig, setCollapseConfig] = useState(false);
  const [collapseSync, setCollapseSync] = useState(false);
  const [collapseTables, setCollapseTables] = useState(false);
  const [collapseSqlSetup, setCollapseSqlSetup] = useState(false);

  // Loading state
  const [loading, setLoading] = useState(false);

  // Form Editing Modals / Add States
  const [activeModal, setActiveModal] = useState<'add' | 'edit' | 'view' | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // Form Fields holding state dynamically
  const [formData, setFormData] = useState<any>({});
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Apply dark mode theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('admin-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('admin-theme', 'light');
    }
  }, [darkMode]);

  // Load settings on initial mount for background styling & theme
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/public/settings');
        const data = await res.json();
        setSettings(data);
        if (data.themeMode) {
          if (data.themeMode === 'dark') {
            setDarkMode(true);
          } else if (data.themeMode === 'light') {
            setDarkMode(false);
          } else if (data.themeMode === 'system') {
            const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setDarkMode(isSystemDark);
          }
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      }
    };
    loadSettings();
  }, []);

  // Fetch initial data based on Active Tab
  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      if (activeTab === 'dashboard') {
        const res = await fetch('/api/admin/stats', { headers });
        const data = await res.json();
        setStats(data);
      } else if (activeTab === 'profile') {
        const res = await fetch('/api/public/profile');
        const data = await res.json();
        setProfile(data);
        // Load into form data initially
        setFormData(data);
      } else if (activeTab === 'sliders') {
        const res = await fetch('/api/admin/sliders', { headers });
        const data = await res.json();
        setSliders(data);
      } else if (activeTab === 'pengurus') {
        const res = await fetch('/api/admin/pengurus', { headers });
        const data = await res.json();
        setPengurus(data);
      } else if (activeTab === 'news') {
        const res1 = await fetch('/api/admin/news', { headers });
        const newsData = await res1.json();
        setNews(newsData);

        const res2 = await fetch('/api/public/categories');
        const catData = await res2.json();
        setCategories(catData);
      } else if (activeTab === 'categories') {
        const res = await fetch('/api/admin/categories', { headers });
        const data = await res.json();
        setCategories(data);
      } else if (activeTab === 'galleries') {
        const res = await fetch('/api/admin/galleries', { headers });
        const data = await res.json();
        setGalleries(data);
      } else if (activeTab === 'agendas') {
        const res = await fetch('/api/admin/agendas', { headers });
        const data = await res.json();
        setAgendas(data);
      } else if (activeTab === 'downloads') {
        const res = await fetch('/api/admin/downloads', { headers });
        const data = await res.json();
        setDownloads(data);
      } else if (activeTab === 'contacts') {
        const res = await fetch('/api/admin/contacts', { headers });
        const data = await res.json();
        setContacts(data);
      } else if (activeTab === 'settings') {
        const res = await fetch('/api/public/settings');
        const data = await res.json();
        setSettings(data);
        setFormData(data);
      } else if (activeTab === 'admins') {
        const res = await fetch('/api/admin/admins', { headers });
        const data = await res.json();
        setAdmins(data);
      } else if (activeTab === 'supabase') {
        const res = await fetch('/api/admin/supabase/status', { headers });
        const data = await res.json();
        setSupabaseStatus(data);
        if (data) {
          setSupabaseUrlInput(data.url || '');
          setSupabaseKeyInput(data.keyRaw || '');
          setSupabaseProjectIdInput(data.projectId || '');
        }
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Close modal when changing tabs
    setActiveModal(null);
    setFormData({});
  }, [activeTab]);

  // Handle Form changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as any;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev: any) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev: any) => ({ ...prev, [name]: value }));
    }
  };

  // Handle nested profile mission lists
  const handleMissionChange = (index: number, value: string) => {
    const updatedMisi = [...(formData.misi || [])];
    updatedMisi[index] = value;
    setFormData((prev: any) => ({ ...prev, misi: updatedMisi }));
  };

  const addMissionRow = () => {
    const updatedMisi = [...(formData.misi || []), ''];
    setFormData((prev: any) => ({ ...prev, misi: updatedMisi }));
  };

  const removeMissionRow = (index: number) => {
    const updatedMisi = (formData.misi || []).filter((_: any, i: number) => i !== index);
    setFormData((prev: any) => ({ ...prev, misi: updatedMisi }));
  };

  // Upload handler for photos and documents
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetField: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileFormData = new FormData();
    fileFormData.append('file', file);

    setIsUploading(true);
    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: fileFormData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal mengunggah berkas');
      }

      triggerAlert({
        type: 'success',
        title: 'Berhasil diunggah',
        message: `Berkas "${data.fileName}" berhasil disimpan.`
      });

      // Update form data state
      setFormData((prev: any) => ({
        ...prev,
        [targetField]: data.url,
        // Optional helpers for download docs
        ...(targetField === 'filePath' ? {
          fileName: prev.fileName || data.fileName,
          fileSize: data.fileSize,
          fileType: data.fileName.split('.').pop()?.toLowerCase() || 'pdf'
        } : {})
      }));
    } catch (err: any) {
      triggerAlert({
        type: 'error',
        title: 'Gagal mengunggah',
        message: err.message || 'Gagal terhubung ke server'
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Save changes (Create or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let url = `/api/admin/${activeTab}`;
      let method = 'POST';

      if (activeTab === 'profile' || activeTab === 'settings') {
        method = 'PUT';
      } else if (activeModal === 'edit' && selectedId) {
        url = `/api/admin/${activeTab}/${selectedId}`;
        method = 'PUT';
      }

      const bodyData = { ...formData };
      if (activeTab === 'galleries' && bodyData.type === 'video' && bodyData.url) {
        bodyData.url = getYouTubeEmbedUrl(bodyData.url);
      }

      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bodyData)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal menyimpan perubahan');
      }

      triggerAlert({
        type: 'success',
        title: 'Berhasil Disimpan',
        message: data.message || 'Data berhasil diperbarui.'
      });

      setActiveModal(null);
      setFormData({});
      fetchData();
    } catch (err: any) {
      triggerAlert({
        type: 'error',
        title: 'Kesalahan Pengisian',
        message: err.message || 'Gagal menyimpan data.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Trigger Delete confirmation
  const handleDeletePrompt = (id: number, displayName: string) => {
    triggerAlert({
      type: 'warning',
      title: 'Hapus Item?',
      message: `Apakah Anda yakin ingin menghapus "${displayName}"? Tindakan ini tidak dapat dibatalkan.`,
      confirmText: 'Ya, Hapus',
      cancelText: 'Batal',
      onConfirm: () => executeDelete(id)
    });
  };

  const executeDelete = async (id: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/${activeTab}/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal menghapus item');
      }
      triggerAlert({
        type: 'success',
        title: 'Terhapus',
        message: data.message || 'Item berhasil dihapus.'
      });
      fetchData();
    } catch (err: any) {
      triggerAlert({
        type: 'error',
        title: 'Gagal Menghapus',
        message: err.message || 'Gagal memproses penghapusan.'
      });
    } finally {
      setLoading(false);
    }
  };

  const markContactAsRead = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/contacts/${id}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profile', label: 'Profil Website', icon: FileText },
    { id: 'sliders', label: 'Slider Banner', icon: Image },
    { id: 'pengurus', label: 'Pengurus', icon: Users },
    { id: 'news', label: 'Berita', icon: FileText },
    { id: 'categories', label: 'Kategori Berita', icon: Hash },
    { id: 'galleries', label: 'Galeri', icon: Image },
    { id: 'agendas', label: 'Agenda', icon: Calendar },
    { id: 'downloads', label: 'Download', icon: DownloadIcon },
    { id: 'contacts', label: 'Kontak', icon: Mail },
    { id: 'supabase', label: 'Integrasi Supabase', icon: Database },
    { id: 'settings', label: 'Pengaturan', icon: SettingsIcon },
    { id: 'admins', label: 'Manajemen Admin', icon: UserCheck }
  ];

  return (
    <div className={`min-h-screen flex ${getAdminBgClass(settings?.adminBgStyle)} font-sans transition-all duration-300`}>
      {/* Sidebar - Desktop and Mobile Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 lg:static lg:h-screen`}
      >
        {/* Sidebar Header */}
        <div>
          <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-blue-600 rounded-lg">
                <ShieldCheckIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-black tracking-wider text-white uppercase">PGRI Pasirwangi</h1>
                <span className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">Admin Panel</span>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)] scrollbar-thin scrollbar-thumb-slate-800">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as AdminTab)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.id === 'contacts' && stats.contactCount > 0 && (
                    <span className="px-2 py-0.5 text-[9px] bg-amber-500 text-slate-950 font-black rounded-full">
                      {stats.contactCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          {/* Theme & Logout Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="flex-1 py-2.5 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition cursor-pointer text-xs font-medium"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-400" />}
            </button>
            <button
              onClick={onLogout}
              className="flex-1 py-2.5 flex items-center justify-center rounded-xl bg-red-950/40 hover:bg-red-900/40 text-red-400 hover:text-red-300 border border-red-900/30 transition cursor-pointer text-xs font-bold uppercase tracking-wider"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <header className="h-16 px-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <Menu className="w-5 h-5 text-slate-500" />
            </button>
            <h2 className="text-lg font-bold tracking-tight capitalize text-slate-800 dark:text-slate-100">
              {menuItems.find(m => m.id === activeTab)?.label}
            </h2>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Admin Mode</span>
          </div>
        </header>

        {/* Content Body */}
        <main className="p-6 flex-1 max-w-7xl w-full mx-auto">
          {/* Loading Indicator */}
          {loading && !activeModal && (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}

          {/* Render Active Tabs */}
          {!loading && activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Jumlah Berita', val: stats.newsCount, bg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
                  { label: 'Jumlah Agenda', val: stats.agendaCount, bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' },
                  { label: 'Jumlah Galeri', val: stats.galleryCount, bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
                  { label: 'Jumlah Dokumen', val: stats.downloadCount, bg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
                  { label: 'Jumlah Pengurus', val: stats.pengurusCount, bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
                  { label: 'Pengunjung (Dummy)', val: stats.visitors, bg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' }
                ].map((st, idx) => (
                  <div key={idx} className={`p-5 rounded-2xl border bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between ${st.bg}`}>
                    <span className="text-[10px] font-black uppercase tracking-wider block opacity-70 mb-2">{st.label}</span>
                    <span className="text-3xl font-black">{st.val}</span>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="p-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
                <h3 className="text-base font-bold mb-4">Tindakan Cepat</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <button
                    onClick={() => { setActiveTab('news'); setActiveModal('add'); }}
                    className="p-4 flex items-center gap-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-850 text-left transition cursor-pointer"
                  >
                    <PlusCircle className="w-5 h-5 text-blue-500" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Tulis Berita Baru</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Posting pengumuman atau berita</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { setActiveTab('agendas'); setActiveModal('add'); }}
                    className="p-4 flex items-center gap-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-850 text-left transition cursor-pointer"
                  >
                    <PlusCircle className="w-5 h-5 text-indigo-500" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Tambah Agenda</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Jadwalkan kegiatan organisasi</p>
                    </div>
                  </button>
                  <button
                    onClick={() => { setActiveTab('downloads'); setActiveModal('add'); }}
                    className="p-4 flex items-center gap-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 rounded-2xl border border-slate-200/60 dark:border-slate-850 text-left transition cursor-pointer"
                  >
                    <PlusCircle className="w-5 h-5 text-amber-500" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Upload Dokumen</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">Bagikan PDF, DOC, XLS, ZIP</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Profiles form */}
          {!loading && activeTab === 'profile' && (
            <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Side: Photo upload */}
                <div className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Foto Ketua Cabang</label>
                  <div className="aspect-[3/4] rounded-2xl bg-slate-50 dark:bg-slate-850 border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center p-4 relative overflow-hidden group">
                    {formData.fotoKetua ? (
                      <>
                        <img src={formData.fotoKetua} alt="Foto Ketua" className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white p-4">
                          <Upload className="w-8 h-8 mb-2 animate-bounce" />
                          <span className="text-xs font-bold uppercase">Ganti Foto</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-center text-slate-400">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <span className="text-xs font-bold block uppercase">Unggah Foto</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, 'fotoKetua')}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                  {isUploading && (
                    <p className="text-xs text-blue-500 text-center animate-pulse">Sedang mengunggah berkas...</p>
                  )}
                  <input
                    type="hidden"
                    name="fotoKetua"
                    value={formData.fotoKetua || ''}
                  />
                </div>

                {/* Right Side: Text areas */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Sejarah PGRI Pasirwangi</label>
                    <textarea
                      name="sejarah"
                      value={formData.sejarah || ''}
                      onChange={handleInputChange}
                      rows={6}
                      className="w-full p-4 bg-slate-50 focus:bg-white dark:bg-slate-850 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-500 text-sm font-medium transition"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Sambutan Ketua Cabang</label>
                    <textarea
                      name="sambutanKetua"
                      value={formData.sambutanKetua || ''}
                      onChange={handleInputChange}
                      rows={8}
                      className="w-full p-4 bg-slate-50 focus:bg-white dark:bg-slate-850 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-500 text-sm font-medium transition"
                      required
                    />
                  </div>
                </div>
              </div>

              <hr className="border-slate-100 dark:border-slate-850" />

              {/* Visi & Misi */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Visi Organisasi</label>
                  <textarea
                    name="visi"
                    value={formData.visi || ''}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full p-4 bg-slate-50 focus:bg-white dark:bg-slate-850 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-500 text-sm font-medium transition"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Misi Organisasi</label>
                    <button
                      type="button"
                      onClick={addMissionRow}
                      className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Baris
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(formData.misi || []).map((misiText: string, idx: number) => (
                      <div key={idx} className="flex gap-2">
                        <span className="flex items-center justify-center w-10 h-10 bg-slate-100 dark:bg-slate-800 text-xs font-bold rounded-xl shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={misiText}
                          onChange={(e) => handleMissionChange(idx, e.target.value)}
                          className="flex-1 px-4 py-2 bg-slate-50 focus:bg-white dark:bg-slate-850 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:border-blue-500 text-sm font-medium transition"
                          placeholder={`Misi nomor ${idx + 1}`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => removeMissionRow(idx)}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition cursor-pointer"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 text-sm cursor-pointer"
                >
                  Simpan Perubahan Profil
                </button>
              </div>
            </form>
          )}

          {/* Slider Banner crud */}
          {!loading && activeTab === 'sliders' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-400">Kelola banner slide di halaman depan (hero section).</p>
                <button
                  onClick={() => {
                    setFormData({ active: true, link: '#' });
                    setSelectedId(null);
                    setActiveModal('add');
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Tambah Banner
                </button>
              </div>

              {/* Slider Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sliders.map((s) => (
                  <div key={s.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col justify-between">
                    <div className="relative aspect-[16/9] bg-slate-100 dark:bg-slate-850 overflow-hidden">
                      <img src={s.image} alt={s.title} className="w-full h-full object-cover" />
                      <div className="absolute top-4 right-4 px-3 py-1 text-[9px] font-black tracking-wider uppercase rounded-full bg-slate-900/80 backdrop-blur-md text-white">
                        {s.active ? 'Aktif' : 'Nonaktif'}
                      </div>
                    </div>
                    <div className="p-5 space-y-2">
                      <h4 className="text-sm font-black line-clamp-1">{s.title}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2">{s.subtitle}</p>
                      <span className="inline-block text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-slate-500">Link: {s.link}</span>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-850/50 border-t border-slate-100 dark:border-slate-850 flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setFormData(s);
                          setSelectedId(s.id);
                          setActiveModal('edit');
                        }}
                        className="p-2 text-slate-500 hover:text-blue-500 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-100 dark:border-slate-700 rounded-xl transition cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePrompt(s.id, s.title)}
                        className="p-2 text-red-500 hover:text-red-600 bg-white dark:bg-slate-800 hover:bg-red-50 border border-slate-100 dark:border-slate-700 rounded-xl transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Kepengurusan crud */}
          {!loading && activeTab === 'pengurus' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-400">Kelola foto, nama, jabatan, dan masa bakti pengurus PGRI Pasirwangi.</p>
                <button
                  onClick={() => {
                    setFormData({ orderIndex: pengurus.length + 1, masaBakti: '2025 - 2030' });
                    setSelectedId(null);
                    setActiveModal('add');
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Tambah Pengurus
                </button>
              </div>

              {/* Table list */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-850 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                        <th className="p-4 text-center">Urutan</th>
                        <th className="p-4">Foto</th>
                        <th className="p-4">Nama</th>
                        <th className="p-4">Jabatan</th>
                        <th className="p-4">Masa Bakti</th>
                        <th className="p-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs">
                      {pengurus.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20">
                          <td className="p-4 text-center font-bold font-mono">{p.orderIndex}</td>
                          <td className="p-4">
                            <img src={p.foto} alt={p.name} className="w-10 h-12 object-cover rounded-lg border border-slate-200 dark:border-slate-800" />
                          </td>
                          <td className="p-4 font-bold text-slate-800 dark:text-slate-100">{p.name}</td>
                          <td className="p-4 font-semibold text-blue-600 dark:text-blue-400">{p.jabatan}</td>
                          <td className="p-4 font-medium text-slate-400">{p.masaBakti}</td>
                          <td className="p-4 text-right space-x-1.5">
                            <button
                              onClick={() => {
                                setFormData(p);
                                setSelectedId(p.id);
                                setActiveModal('edit');
                              }}
                              className="p-2 text-slate-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition cursor-pointer inline-flex"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePrompt(p.id, p.name)}
                              className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer inline-flex"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Berita CRUD */}
          {!loading && activeTab === 'news' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-400">Posting berita kegiatan, opini, artikel, atau pengumuman resmi organisasi.</p>
                <button
                  onClick={() => {
                    setFormData({ date: new Date().toISOString().split('T')[0], views: 0 });
                    setSelectedId(null);
                    setActiveModal('add');
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Tulis Berita
                </button>
              </div>

              {/* News Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {news.map((n) => {
                  const categoryName = categories.find(c => c.id === n.categoryId)?.name || 'Tanpa Kategori';
                  return (
                    <div key={n.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col justify-between">
                      <div className="relative aspect-video bg-slate-100 dark:bg-slate-850 overflow-hidden">
                        <img src={n.image} alt={n.title} className="w-full h-full object-cover" />
                        <span className="absolute bottom-4 left-4 px-2.5 py-1 text-[9px] font-black uppercase bg-blue-600 text-white rounded-lg shadow-md">
                          {categoryName}
                        </span>
                      </div>
                      <div className="p-5 space-y-2">
                        <span className="text-[10px] text-slate-400 font-bold block">{n.date} • {n.views || 0} Dilihat</span>
                        <h4 className="text-sm font-black line-clamp-2 text-slate-850 dark:text-slate-100">{n.title}</h4>
                        <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{n.content}</p>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-slate-850/50 border-t border-slate-100 dark:border-slate-850 flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setFormData(n);
                            setSelectedId(n.id);
                            setActiveModal('edit');
                          }}
                          className="p-2 text-slate-500 hover:text-blue-500 bg-white dark:bg-slate-800 hover:bg-blue-50 border border-slate-100 dark:border-slate-700 rounded-xl transition cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePrompt(n.id, n.title)}
                          className="p-2 text-red-500 hover:text-red-600 bg-white dark:bg-slate-800 hover:bg-red-50 border border-slate-100 dark:border-slate-700 rounded-xl transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Kategori Berita CRUD */}
          {!loading && activeTab === 'categories' && (
            <div className="space-y-6 max-w-2xl">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-400">Pengelompokan jenis berita (Pengumuman, Kegiatan Organisasi, dsb).</p>
                <button
                  onClick={() => {
                    setFormData({});
                    setSelectedId(null);
                    setActiveModal('add');
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Tambah Kategori
                </button>
              </div>

              {/* Table */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-850 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      <th className="p-4">ID</th>
                      <th className="p-4">Nama Kategori</th>
                      <th className="p-4">Slug URL</th>
                      <th className="p-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs">
                    {categories.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20">
                        <td className="p-4 font-mono text-slate-400">{c.id}</td>
                        <td className="p-4 font-bold text-slate-800 dark:text-slate-100">{c.name}</td>
                        <td className="p-4 font-mono text-slate-400">{c.slug}</td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => {
                              setFormData(c);
                              setSelectedId(c.id);
                              setActiveModal('edit');
                            }}
                            className="p-2 text-slate-500 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition cursor-pointer inline-flex"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePrompt(c.id, c.name)}
                            className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer inline-flex"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Galeri CRUD */}
          {!loading && activeTab === 'galleries' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-400">Unggah foto album kegiatan atau masukkan link video YouTube embed.</p>
                <button
                  onClick={() => {
                    setFormData({ type: 'photo' });
                    setSelectedId(null);
                    setActiveModal('add');
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Tambah Galeri
                </button>
              </div>

              {/* Galleries list */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {galleries.map((g) => (
                  <div key={g.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col justify-between">
                    <div className="relative aspect-video bg-slate-100 dark:bg-slate-850 flex items-center justify-center overflow-hidden">
                      {g.type === 'video' ? (
                        <div className="w-full h-full relative">
                          <iframe
                            src={getYouTubeEmbedUrl(g.url)}
                            title={g.title}
                            className="w-full h-full pointer-events-none"
                            allowFullScreen
                          />
                          <div className="absolute inset-0 bg-black/10 flex items-center justify-center text-white font-bold text-xs uppercase bg-slate-950/20">
                            Video YouTube
                          </div>
                        </div>
                      ) : (
                        <img src={g.url} alt={g.title} className="w-full h-full object-cover" />
                      )}
                      <span className="absolute top-4 right-4 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-lg bg-slate-900/80 text-white">
                        {g.type === 'photo' ? 'Foto' : 'Video'}
                      </span>
                    </div>
                    <div className="p-5 space-y-1">
                      <h4 className="text-sm font-black line-clamp-1">{g.title}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{g.description}</p>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-850/50 border-t border-slate-100 dark:border-slate-850 flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setFormData(g);
                          setSelectedId(g.id);
                          setActiveModal('edit');
                        }}
                        className="p-2 text-slate-500 hover:text-blue-500 bg-white dark:bg-slate-800 hover:bg-blue-50 border border-slate-100 dark:border-slate-700 rounded-xl transition cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePrompt(g.id, g.title)}
                        className="p-2 text-red-500 hover:text-red-600 bg-white dark:bg-slate-800 hover:bg-red-50 border border-slate-100 dark:border-slate-700 rounded-xl transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Agenda CRUD */}
          {!loading && activeTab === 'agendas' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-400">Jadwal kegiatan atau program kerja yang akan dilaksanakan.</p>
                <button
                  onClick={() => {
                    setFormData({ time: '08:00 - Selesai' });
                    setSelectedId(null);
                    setActiveModal('add');
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Tambah Agenda
                </button>
              </div>

              {/* Table List */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-850 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                        <th className="p-4">Tanggal / Waktu</th>
                        <th className="p-4">Kegiatan</th>
                        <th className="p-4">Tempat</th>
                        <th className="p-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs">
                      {agendas.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20">
                          <td className="p-4">
                            <span className="font-bold block text-slate-800 dark:text-slate-100">{a.date}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{a.time}</span>
                          </td>
                          <td className="p-4">
                            <span className="font-bold block text-slate-800 dark:text-slate-100 text-sm mb-1">{a.title}</span>
                            <span className="text-slate-400 line-clamp-1">{a.description}</span>
                          </td>
                          <td className="p-4 font-semibold text-blue-600 dark:text-blue-400">{a.location}</td>
                          <td className="p-4 text-right space-x-2">
                            <button
                              onClick={() => {
                                setFormData(a);
                                setSelectedId(a.id);
                                setActiveModal('edit');
                              }}
                              className="p-2 text-slate-500 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition cursor-pointer inline-flex"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePrompt(a.id, a.title)}
                              className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer inline-flex"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Downloads CRUD */}
          {!loading && activeTab === 'downloads' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-400">Kelola dan unggah file formulir, panduan, format laporan kepegawaian guru.</p>
                <button
                  onClick={() => {
                    setFormData({ fileType: 'pdf', downloadCount: 0 });
                    setSelectedId(null);
                    setActiveModal('add');
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Tambah Berkas
                </button>
              </div>

              {/* Table downloads list */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-850 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                        <th className="p-4">Ekstensi</th>
                        <th className="p-4">Nama File</th>
                        <th className="p-4">Ukuran</th>
                        <th className="p-4">Dinduh</th>
                        <th className="p-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs">
                      {downloads.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20">
                          <td className="p-4">
                            <span className={`inline-block px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg ${
                              d.fileType === 'pdf' ? 'bg-red-500 text-white' :
                              d.fileType === 'doc' ? 'bg-blue-500 text-white' :
                              d.fileType === 'xls' ? 'bg-emerald-500 text-white' :
                              'bg-amber-500 text-slate-950'
                            }`}>
                              {d.fileType}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-slate-800 dark:text-slate-100">
                            {d.fileName}
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{d.filePath}</span>
                          </td>
                          <td className="p-4 font-semibold font-mono text-slate-500">{d.fileSize}</td>
                          <td className="p-4 font-bold text-slate-700 dark:text-slate-300">{d.downloadCount || 0} kali</td>
                          <td className="p-4 text-right space-x-2">
                            <button
                              onClick={() => {
                                setFormData(d);
                                setSelectedId(d.id);
                                setActiveModal('edit');
                              }}
                              className="p-2 text-slate-500 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition cursor-pointer inline-flex"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePrompt(d.id, d.fileName)}
                              className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer inline-flex"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Contact messages list */}
          {!loading && activeTab === 'contacts' && (
            <div className="space-y-6">
              <p className="text-xs text-slate-400">Daftar pesan dan aspirasi dari pengunjung website / guru melalui form kontak.</p>

              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-850 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                        <th className="p-4">Tanggal</th>
                        <th className="p-4">Pengirim</th>
                        <th className="p-4">Subjek</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-xs">
                      {contacts.map((c) => (
                        <tr key={c.id} className={`${c.read ? 'opacity-70' : 'font-semibold bg-blue-50/20 dark:bg-blue-950/10'} hover:bg-slate-50/50 dark:hover:bg-slate-850/20`}>
                          <td className="p-4 text-slate-400 font-mono">{c.date}</td>
                          <td className="p-4">
                            <span className="font-bold block text-slate-800 dark:text-slate-100">{c.name}</span>
                            <span className="text-[10px] text-slate-400 block font-mono mt-0.5">{c.email} • {c.phone}</span>
                          </td>
                          <td className="p-4 font-bold text-slate-850 dark:text-slate-100">{c.subject}</td>
                          <td className="p-4">
                            <span className={`inline-block px-2 py-0.5 text-[9px] font-black uppercase rounded-md ${
                              c.read ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                            }`}>
                              {c.read ? 'Dibaca' : 'Baru'}
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <button
                              onClick={() => {
                                setFormData(c);
                                setSelectedId(c.id);
                                setActiveModal('view');
                                if (!c.read) markContactAsRead(c.id);
                              }}
                              className="p-2 text-slate-500 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition cursor-pointer inline-flex"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePrompt(c.id, c.name)}
                              className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer inline-flex"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Web settings */}
          {!loading && activeTab === 'settings' && (
            <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-6">
              <h3 className="text-base font-black">Profil & Informasi Kontak Website</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Nama Website</label>
                  <input
                    type="text"
                    name="siteName"
                    value={formData.siteName || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-850 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-500 text-sm font-medium transition"
                    required
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Logo Website Resmi (Pilih Berkas Komputer)</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 bg-slate-50 dark:bg-slate-850 flex flex-col items-center justify-center text-center relative cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition md:col-span-2 h-32">
                      <Upload className="w-6 h-6 text-slate-400 mb-1 animate-pulse" />
                      <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300 block">Pilih File Logo dari Komputer</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">Mendukung: PNG, JPG, JPEG, SVG, WebP (Max 25MB)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'logo')}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                    <div className="flex flex-col items-center justify-center border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-slate-50 dark:bg-slate-850 h-32">
                      {formData.logo ? (
                        <div className="relative w-full h-full flex items-center justify-center">
                          <img src={formData.logo} alt="Logo Preview" className="max-h-24 max-w-full object-contain rounded-lg" />
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Belum Ada Logo</span>
                      )}
                    </div>
                  </div>
                  {isUploading && <p className="text-xs text-blue-500 animate-pulse text-center">Sedang mengunggah logo, mohon tunggu...</p>}
                  <input type="hidden" name="logo" value={formData.logo || ''} required />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Alamat Lengkap Kantor</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-850 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-500 text-sm font-medium transition"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Email Resmi</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-850 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-500 text-sm font-medium transition"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">No. Telepon Kantor</label>
                  <input
                    type="text"
                    name="telephone"
                    value={formData.telephone || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-850 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-500 text-sm font-medium transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">No. WhatsApp (62...)</label>
                  <input
                    type="text"
                    name="whatsapp"
                    value={formData.whatsapp || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-850 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-500 text-sm font-medium transition"
                  />
                </div>
              </div>

              <hr className="border-slate-100 dark:border-slate-850" />

              <h3 className="text-base font-black">Media Sosial</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Facebook URL</label>
                  <input
                    type="text"
                    name="facebook"
                    value={formData.facebook || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-850 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-500 text-sm font-medium transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Instagram URL</label>
                  <input
                    type="text"
                    name="instagram"
                    value={formData.instagram || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-850 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-500 text-sm font-medium transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">YouTube Channel URL</label>
                  <input
                    type="text"
                    name="youtube"
                    value={formData.youtube || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-850 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-500 text-sm font-medium transition"
                  />
                </div>
              </div>

              <hr className="border-slate-100 dark:border-slate-850" />

              <h3 className="text-base font-black">Footer & SEO (Metadata)</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Copyright Footer</label>
                    <input
                      type="text"
                      name="copyright"
                      value={formData.copyright || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-850 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-500 text-sm font-medium transition"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Slogan Footer</label>
                    <input
                      type="text"
                      name="footer"
                      value={formData.footer || ''}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-850 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-500 text-sm font-medium transition"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">SEO Title</label>
                  <input
                    type="text"
                    name="seoTitle"
                    value={formData.seoTitle || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-500 text-sm font-medium transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">SEO Meta Description</label>
                  <textarea
                    name="seoDescription"
                    value={formData.seoDescription || ''}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full p-4 bg-slate-50 focus:bg-white dark:bg-slate-850 dark:focus:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-500 text-sm font-medium transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Meta Keywords (pisahkan dengan koma)</label>
                  <input
                    type="text"
                    name="metaKeywords"
                    value={formData.metaKeywords || ''}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-500 text-sm font-medium transition"
                  />
                </div>
              </div>

              <hr className="border-slate-100 dark:border-slate-850" />

              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Pengaturan Tema & Warna Tampilan (Theme Settings)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Theme Mode Option */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Mode Tampilan Website (Global Theme Mode)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'light', label: 'Terang' },
                        { id: 'dark', label: 'Gelap' },
                        { id: 'system', label: 'Sistem' }
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => {
                            setFormData((prev: any) => ({ ...prev, themeMode: mode.id }));
                            // Apply instantly for dynamic preview
                            if (mode.id === 'dark') {
                              setDarkMode(true);
                            } else if (mode.id === 'light') {
                              setDarkMode(false);
                            } else {
                              const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                              setDarkMode(isSystemDark);
                            }
                          }}
                          className={`py-3 px-2 rounded-2xl text-xs font-bold uppercase tracking-wider transition border cursor-pointer ${
                            formData.themeMode === mode.id || (!formData.themeMode && mode.id === 'light')
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20'
                              : 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400">Mengatur mode terang atau gelap pada website utama dan panel administrator.</p>
                  </div>

                  {/* Primary Color Accent */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Warna Aksen Utama Website (Landing Page Accent)</label>
                    <div className="grid grid-cols-6 gap-2">
                      {[
                        { id: 'blue', color: 'bg-blue-600', name: 'Biru' },
                        { id: 'emerald', color: 'bg-emerald-600', name: 'Hijau' },
                        { id: 'indigo', color: 'bg-indigo-600', name: 'Indigo' },
                        { id: 'purple', color: 'bg-purple-600', name: 'Ungu' },
                        { id: 'amber', color: 'bg-amber-500', name: 'Amber' },
                        { id: 'rose', color: 'bg-rose-600', name: 'Mawar' }
                      ].map((col) => (
                        <button
                          key={col.id}
                          type="button"
                          title={col.name}
                          onClick={() => setFormData((prev: any) => ({ ...prev, primaryColor: col.id }))}
                          className={`w-full aspect-square rounded-2xl flex items-center justify-center transition border-2 cursor-pointer ${col.color} ${
                            formData.primaryColor === col.id || (!formData.primaryColor && col.id === 'blue')
                              ? 'border-slate-900 dark:border-white scale-110 shadow-md'
                              : 'border-transparent opacity-80 hover:opacity-100 hover:scale-105'
                          }`}
                        >
                          {(formData.primaryColor === col.id || (!formData.primaryColor && col.id === 'blue')) && (
                            <Check className="w-4 h-4 text-white" />
                          )}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400">Mengubah warna aksen tombol, banner, dan elemen navigasi pada halaman depan.</p>
                  </div>
                </div>

                {/* Admin BG Style Customizer */}
                <div className="space-y-3 pt-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Pilihan Gaya & Warna Background Halaman Admin (CMS Background)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { id: 'default', label: 'Default Gray', desc: 'Abu-abu klasik', colorClass: 'from-slate-100 to-slate-200 text-slate-800 border-slate-300 dark:border-slate-800' },
                      { id: 'zinc', label: 'Cool Zinc', desc: 'Zinc minimalis', colorClass: 'from-zinc-100 to-zinc-200 text-zinc-800 border-zinc-300 dark:border-zinc-800' },
                      { id: 'slate', label: 'Slate Soft', desc: 'Abu baja lembut', colorClass: 'from-slate-200 to-slate-300 text-slate-900 border-slate-300 dark:border-slate-850' },
                      { id: 'navy', label: 'Ocean Navy', desc: 'Biru laut teduh', colorClass: 'from-blue-50 to-indigo-100 text-slate-800 border-blue-200 dark:border-blue-900/20' },
                      { id: 'forest', label: 'Forest Green', desc: 'Hijau daun segar', colorClass: 'from-emerald-50 to-teal-100 text-slate-800 border-emerald-200 dark:border-emerald-900/20' },
                      { id: 'purple', label: 'Royal Purple', desc: 'Ungu kerajaan', colorClass: 'from-purple-50 to-fuchsia-100 text-slate-800 border-purple-200 dark:border-purple-900/20' },
                      { id: 'sunset', label: 'Sunset Glow', desc: 'Merah sunset hangat', colorClass: 'from-rose-50 to-amber-100 text-slate-800 border-rose-200 dark:border-rose-900/20' },
                      { id: 'dark', label: 'Full Obsidian', desc: 'Hitam legam modern', colorClass: 'from-slate-900 to-slate-950 text-slate-200 border-slate-800 dark:border-slate-850' }
                    ].map((bg) => {
                      const isSelected = formData.adminBgStyle === bg.id || (!formData.adminBgStyle && bg.id === 'default');
                      return (
                        <button
                          key={bg.id}
                          type="button"
                          onClick={() => {
                            setFormData((prev: any) => ({ ...prev, adminBgStyle: bg.id }));
                            // Apply live preview in the admin panel instantly
                            if (settings) {
                              setSettings((prev: any) => ({ ...prev, adminBgStyle: bg.id }));
                            }
                          }}
                          className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between h-24 ${
                            isSelected
                              ? 'border-blue-600 ring-2 ring-blue-500/30 shadow-md scale-[1.02]'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          } bg-gradient-to-br ${bg.colorClass}`}
                        >
                          <span className="text-xs font-black uppercase tracking-wide block">
                            {bg.label}
                          </span>
                          <div className="flex justify-between items-center w-full">
                            <span className="text-[9px] font-medium block leading-tight opacity-70">
                              {bg.desc}
                            </span>
                            {isSelected && (
                              <span className="p-1 bg-blue-600 rounded-full flex items-center justify-center">
                                <Check className="w-3.5 h-3.5 text-white" />
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Pilih warna background terbaik untuk panel CMS. Disinkronkan dan tersimpan aman di database server.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/20 text-sm cursor-pointer"
                >
                  Simpan Semua Pengaturan
                </button>
              </div>
            </form>
          )}

          {/* Admin management */}
          {!loading && activeTab === 'admins' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-400">Daftar pengguna dengan hak akses penuh ke Admin Panel (CMS).</p>
                <button
                  onClick={() => {
                    setFormData({});
                    setSelectedId(null);
                    setActiveModal('add');
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Daftarkan Admin
                </button>
              </div>

              {/* Grid List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {admins.map((adm) => (
                  <div key={adm.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 flex flex-col justify-between shadow-sm">
                    <div className="space-y-2">
                      <div className="inline-flex p-3 bg-blue-500/15 rounded-xl text-blue-600 dark:text-blue-400 mb-2">
                        <UserCheck className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-slate-850 dark:text-slate-100">{adm.fullName}</h4>
                      <p className="text-xs text-slate-400 font-mono">Username: <span className="text-blue-600 dark:text-blue-400 font-bold">{adm.username}</span></p>
                    </div>

                    <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-50 dark:border-slate-850">
                      <button
                        onClick={() => {
                          setFormData({ fullName: adm.fullName });
                          setSelectedId(adm.id);
                          setActiveModal('edit');
                        }}
                        className="p-2 text-slate-500 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-xl transition cursor-pointer"
                      >
                        <Edit2 className="w-4.5 h-4.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePrompt(adm.id, adm.fullName)}
                        className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition cursor-pointer"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Supabase Integration panel */}
          {!loading && activeTab === 'supabase' && (
            <div className="space-y-6">
              {/* Header card with status */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm animate-fade-in">
                <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-850 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                      <Cloud className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-black text-slate-850 dark:text-slate-100 uppercase tracking-tight">Koneksi Backend Supabase Cloud</h3>
                  </div>
                  <button
                    onClick={() => setCollapseKoneksi(!collapseKoneksi)}
                    className="p-2 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  >
                    {collapseKoneksi ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                  </button>
                </div>

                {!collapseKoneksi && (
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <p className="text-xs text-slate-400 max-w-2xl">
                        Website ini terhubung secara real-time ke database cloud Supabase Anda untuk penyimpanan seluruh data keanggotaan, artikel berita, file unduhan, dan kepengurusan secara terpusat.
                      </p>

                      {supabaseStatus?.configured ? (
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 text-xs font-bold whitespace-nowrap">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          Terhubung ke pgri-pasirwangi
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-900/30 text-xs font-bold whitespace-nowrap">
                          <span className="w-2 h-2 rounded-full bg-red-500"></span>
                          Belum Dikonfigurasi
                        </div>
                      )}
                    </div>

                    {supabaseStatus?.configured && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <div className="space-y-2">
                          <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                            <span className="text-slate-400">Project Name:</span>
                            <span className="font-bold text-slate-800 dark:text-slate-100">pgri-pasirwangi</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                            <span className="text-slate-400">Project ID:</span>
                            <span className="font-mono font-bold text-slate-850 dark:text-slate-100">{supabaseStatus.projectId}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                            <span className="text-slate-400">Project URL:</span>
                            <span className="font-mono text-blue-600 dark:text-blue-400 font-bold break-all">{supabaseStatus.url}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-850">
                            <span className="text-slate-400">Public Key:</span>
                            <span className="font-mono text-slate-500">{supabaseStatus.keyObfuscated}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Form Konfigurasi Kredensial Supabase */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm animate-fade-in space-y-4">
                <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-850 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                      <SettingsIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-850 dark:text-slate-100 text-sm uppercase tracking-wide">Pengaturan Kredensial Supabase</h4>
                      <p className="text-[10px] text-slate-400">Atur kredensial API Supabase Anda agar website dapat sinkron ke database cloud secara langsung.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setCollapseConfig(!collapseConfig)}
                    className="p-2 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  >
                    {collapseConfig ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                  </button>
                </div>

                {!collapseConfig && (
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setSavingConfig(true);
                    try {
                      const res = await fetch('/api/admin/supabase/config', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                          url: supabaseUrlInput,
                          key: supabaseKeyInput,
                          projectId: supabaseProjectIdInput
                        })
                      });
                      const result = await res.json();
                      if (res.ok && result.status === 'success') {
                        triggerAlert({
                          title: 'Berhasil',
                          message: result.message,
                          type: 'success'
                        });
                        // Refresh status
                        fetchData();
                      } else {
                        triggerAlert({
                          title: 'Gagal',
                          message: result.message || 'Gagal menyimpan konfigurasi.',
                          type: 'error'
                        });
                      }
                    } catch (err: any) {
                      triggerAlert({
                        title: 'Error',
                        message: 'Terjadi kesalahan saat menyambung ke server.',
                        type: 'error'
                      });
                    } finally {
                      setSavingConfig(false);
                    }
                  }} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">SUPABASE PROJECT ID</label>
                        <input
                          type="text"
                          value={supabaseProjectIdInput}
                          onChange={(e) => setSupabaseProjectIdInput(e.target.value)}
                          placeholder="Contoh: iytzfrjmbvvtylayhflu"
                          required
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">SUPABASE PROJECT URL</label>
                        <input
                          type="url"
                          value={supabaseUrlInput}
                          onChange={(e) => setSupabaseUrlInput(e.target.value)}
                          placeholder="Contoh: https://iytzfrjmbvvtylayhflu.supabase.co"
                          required
                          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">SUPABASE SERVICE ROLE KEY / ANON KEY</label>
                      <input
                        type="password"
                        value={supabaseKeyInput}
                        onChange={(e) => setSupabaseKeyInput(e.target.value)}
                        placeholder="Masukkan Anon/Service Role Key Supabase"
                        required
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono"
                      />
                    </div>
                    
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={savingConfig}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/20 transition text-xs uppercase tracking-wider cursor-pointer"
                      >
                        {savingConfig ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Menghubungkan...
                          </>
                        ) : (
                          <>
                            <Database className="w-4 h-4" />
                            Simpan & Hubungkan Database
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Action sync panel */}
              {supabaseStatus?.configured && (
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-6 text-white shadow-lg shadow-blue-500/25 animate-fade-in space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-white/10 text-white rounded-xl">
                        <RefreshCw className="w-5 h-5" />
                      </div>
                      <h4 className="text-sm font-black uppercase tracking-wide">Sinkronisasi Data Dua Arah</h4>
                    </div>
                    <button
                      onClick={() => setCollapseSync(!collapseSync)}
                      className="p-2 hover:bg-white/10 rounded-xl text-white/80 hover:text-white transition cursor-pointer"
                    >
                      {collapseSync ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </button>
                  </div>

                  {!collapseSync && (
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pt-2">
                      <p className="text-xs text-blue-100 leading-relaxed max-w-xl">
                        Fitur ini membandingkan data lokal Anda dengan database Supabase Cloud. Jika tabel cloud kosong, data lokal yang ada akan diunggah (Seeding). Jika cloud sudah berisi data, data lokal akan disinkronkan agar selalu sama dengan cloud.
                      </p>

                      <button
                        onClick={async () => {
                          setSyncing(true);
                          try {
                            const res = await fetch('/api/admin/supabase/sync', {
                              method: 'POST',
                              headers: { 'Authorization': `Bearer ${token}` }
                            });
                            const result = await res.json();
                            
                            if (result.status === 'success') {
                              triggerAlert({
                                title: 'Sinkronisasi Berhasil',
                                message: result.message,
                                type: 'success'
                              });
                            } else if (result.status === 'partial_success') {
                              triggerAlert({
                                title: 'Sinkronisasi Sebagian',
                                message: result.message,
                                type: 'warning'
                              });
                            } else {
                              triggerAlert({
                                title: 'Perhatian',
                                message: result.message,
                                type: 'warning'
                              });
                            }
                            // Refresh status
                            fetchData();
                          } catch (err: any) {
                            triggerAlert({
                              title: 'Error Koneksi',
                              message: 'Gagal menghubungi server untuk sinkronisasi data.',
                              type: 'error'
                            });
                          } finally {
                            setSyncing(false);
                          }
                        }}
                        disabled={syncing}
                        className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-blue-600 font-black rounded-2xl shadow-xl transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap text-xs uppercase tracking-wider"
                      >
                        {syncing ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Menyinkronkan...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4" />
                            Sinkronisasi Sekarang
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Table check status */}
              {supabaseStatus?.configured && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-850 pb-4 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                        <Database className="w-5 h-5" />
                      </div>
                      <h4 className="font-black text-slate-850 dark:text-slate-100 text-sm uppercase tracking-wide">Status Tabel Database Supabase</h4>
                    </div>
                    <button
                      onClick={() => setCollapseTables(!collapseTables)}
                      className="p-2 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    >
                      {collapseTables ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </button>
                  </div>

                  {!collapseTables && (
                    <>
                      <p className="text-xs text-slate-400 mb-6">Berikut adalah status konektivitas untuk 11 tabel database website PGRI Pasirwangi:</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(supabaseStatus.tables || {}).map(([tableName, s]: [string, any]) => (
                          <div key={tableName} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-850/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <div className="space-y-1">
                              <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-100 capitalize">{tableName}</span>
                              <span className="block text-[10px] text-slate-400 font-mono">Tabel: {tableName}</span>
                            </div>

                            {s.status === 'ok' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-bold border border-emerald-500/20">
                                <Check className="w-3.5 h-3.5" /> Ready
                              </span>
                            ) : s.status === 'missing' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg text-[10px] font-bold border border-amber-500/20">
                                <AlertCircle className="w-3.5 h-3.5" /> Belum Dibuat
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-bold border border-red-500/20" title={s.message}>
                                <AlertCircle className="w-3.5 h-3.5" /> Error
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* SQL Setup Schema Script Panel */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 shadow-sm space-y-4 animate-fade-in">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-slate-50 dark:border-slate-850 pb-4 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300">
                        <Terminal className="w-5 h-5" />
                      </div>
                      <h4 className="font-black text-slate-850 dark:text-slate-100 text-sm uppercase tracking-wide">SQL Schema Setup Script</h4>
                    </div>
                    <p className="text-xs text-slate-400">
                      Salin kode SQL di bawah ini dan jalankan langsung di menu <strong>SQL Editor</strong> di dashboard Supabase Anda untuk membuat seluruh tabel secara otomatis.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                      onClick={() => {
                        const sqlCode = `-- SQL Setup untuk pgri-pasirwangi di Supabase Cloud\n\n-- 1. Tabel users\ncreate table if not exists public.users (\n  id bigint primary key,\n  username text not null unique,\n  "passwordHash" text not null,\n  "fullName" text not null\n);\n\n-- 2. Tabel sliders\ncreate table if not exists public.sliders (\n  id bigint primary key,\n  image text not null,\n  title text not null,\n  subtitle text not null,\n  link text not null,\n  active boolean default true\n);\n\n-- 3. Tabel categories\ncreate table if not exists public.categories (\n  id bigint primary key,\n  name text not null,\n  slug text not null\n);\n\n-- 4. Tabel news\ncreate table if not exists public.news (\n  id bigint primary key,\n  title text not null,\n  slug text not null,\n  content text not null,\n  image text not null,\n  "categoryId" bigint,\n  views bigint default 0,\n  date text not null\n);\n\n-- 5. Tabel galleries\ncreate table if not exists public.galleries (\n  id bigint primary key,\n  type text not null,\n  url text not null,\n  title text not null,\n  description text not null\n);\n\n-- 6. Tabel agendas\ncreate table if not exists public.agendas (\n  id bigint primary key,\n  title text not null,\n  date text not null,\n  time text not null,\n  location text not null,\n  description text not null\n);\n\n-- 7. Tabel downloads\ncreate table if not exists public.downloads (\n  id bigint primary key,\n  "fileName" text not null,\n  "filePath" text not null,\n  "fileType" text not null,\n  "fileSize" text not null,\n  "downloadCount" bigint default 0,\n  date text not null\n);\n\n-- 8. Tabel contacts\ncreate table if not exists public.contacts (\n  id bigint primary key,\n  name text not null,\n  email text not null,\n  phone text not null,\n  subject text not null,\n  message text not null,\n  date text not null,\n  read boolean default false\n);\n\n-- 9. Tabel profiles\ncreate table if not exists public.profiles (\n  id bigint primary key,\n  sejarah text not null,\n  "sambutanKetua" text not null,\n  "fotoKetua" text not null,\n  visi text not null,\n  misi text[] not null\n);\n\n-- 10. Tabel settings\ncreate table if not exists public.settings (\n  id bigint primary key default 1,\n  "siteName" text not null,\n  logo text not null,\n  favicon text not null,\n  address text not null,\n  email text not null,\n  telephone text not null,\n  whatsapp text,\n  facebook text,\n  instagram text,\n  youtube text,\n  footer text,\n  copyright text,\n  "seoTitle" text,\n  "seoDescription" text,\n  "metaKeywords" text,\n  "themeMode" text,\n  "primaryColor" text,\n  "adminBgStyle" text\n);\n\n-- 11. Tabel pengurus\ncreate table if not exists public.pengurus (\n  id bigint primary key,\n  name text not null,\n  jabatan text not null,\n  "masaBakti" text not null,\n  foto text not null,\n  "orderIndex" bigint not null\n);\n\n-- Nonaktifkan RLS (Row Level Security) agar koneksi anonim dapat mengakses tabel\nalter table public.users disable row level security;\nalter table public.sliders disable row level security;\nalter table public.categories disable row level security;\nalter table public.news disable row level security;\nalter table public.galleries disable row level security;\nalter table public.agendas disable row level security;\nalter table public.downloads disable row level security;\nalter table public.contacts disable row level security;\nalter table public.profiles disable row level security;\nalter table public.settings disable row level security;\nalter table public.pengurus disable row level security;`;
                        navigator.clipboard.writeText(sqlCode);
                        setSqlCopied(true);
                        setTimeout(() => setSqlCopied(false), 3000);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition cursor-pointer self-start sm:self-auto"
                    >
                      {sqlCopied ? (
                        <>
                          <CheckCheck className="w-4 h-4 text-emerald-500" />
                          Tersalin!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Salin SQL Script
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setCollapseSqlSetup(!collapseSqlSetup)}
                      className="p-2 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    >
                      {collapseSqlSetup ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {!collapseSqlSetup && (
                  <>
                    {/* Warning Row-Level Security policy info */}
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 rounded-2xl border border-amber-200/50 dark:border-amber-900/30 text-xs leading-relaxed space-y-1">
                      <div className="flex items-center gap-1.5 font-black">
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                        PENTING: CARA MENGATASI ERROR RLS ("new row violates row-level security policy")
                      </div>
                      <p>
                        Supabase secara default mengaktifkan sistem keamanan <strong>Row-Level Security (RLS)</strong> untuk tabel-tabel baru. Jika Anda mendapatkan error RLS saat menyinkronkan data, silakan <strong>salin kembali seluruh SQL script di bawah ini</strong> dan jalankan ulang di menu <strong>SQL Editor</strong> dashboard Supabase Anda. Perintah <code className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1 py-0.5 rounded text-[10px] font-bold">alter table public.[nama_tabel] disable row level security;</code> di bagian bawah akan secara otomatis menonaktifkan batasan RLS tersebut sehingga sinkronisasi data dua arah dapat bekerja dengan lancar.
                      </p>
                    </div>

                    <div className="relative">
                      <pre className="p-5 bg-slate-950 text-slate-100 font-mono text-[11px] leading-relaxed rounded-2xl overflow-x-auto border border-slate-850 max-h-72 scrollbar-thin scrollbar-thumb-slate-800">
{`-- SQL Setup untuk pgri-pasirwangi di Supabase Cloud

-- 1. Tabel users
create table if not exists public.users (
  id bigint primary key,
  username text not null unique,
  "passwordHash" text not null,
  "fullName" text not null
);

-- 2. Tabel sliders
create table if not exists public.sliders (
  id bigint primary key,
  image text not null,
  title text not null,
  subtitle text not null,
  link text not null,
  active boolean default true
);

-- 3. Tabel categories
create table if not exists public.categories (
  id bigint primary key,
  name text not null,
  slug text not null
);

-- 4. Tabel news
create table if not exists public.news (
  id bigint primary key,
  title text not null,
  slug text not null,
  content text not null,
  image text not null,
  "categoryId" bigint,
  views bigint default 0,
  date text not null
);

-- 5. Tabel galleries
create table if not exists public.galleries (
  id bigint primary key,
  type text not null,
  url text not null,
  title text not null,
  description text not null
);

-- 6. Tabel agendas
create table if not exists public.agendas (
  id bigint primary key,
  title text not null,
  date text not null,
  time text not null,
  location text not null,
  description text not null
);

-- 7. Tabel downloads
create table if not exists public.downloads (
  id bigint primary key,
  "fileName" text not null,
  "filePath" text not null,
  "fileType" text not null,
  "fileSize" text not null,
  "downloadCount" bigint default 0,
  date text not null
);

-- 8. Tabel contacts
create table if not exists public.contacts (
  id bigint primary key,
  name text not null,
  email text not null,
  phone text not null,
  subject text not null,
  message text not null,
  date text not null,
  read boolean default false
);

-- 9. Tabel profiles
create table if not exists public.profiles (
  id bigint primary key,
  sejarah text not null,
  "sambutanKetua" text not null,
  "fotoKetua" text not null,
  visi text not null,
  misi text[] not null
);

-- 10. Tabel settings
create table if not exists public.settings (
  id bigint primary key default 1,
  "siteName" text not null,
  logo text not null,
  favicon text not null,
  address text not null,
  email text not null,
  telephone text not null,
  whatsapp text,
  facebook text,
  instagram text,
  youtube text,
  footer text,
  copyright text,
  "seoTitle" text,
  "seoDescription" text,
  "metaKeywords" text,
  "themeMode" text,
  "primaryColor" text,
  "adminBgStyle" text
);

-- 11. Tabel pengurus
create table if not exists public.pengurus (
  id bigint primary key,
  name text not null,
  jabatan text not null,
  "masaBakti" text not null,
  foto text not null,
  "orderIndex" bigint not null
);

-- Nonaktifkan RLS (Row Level Security) agar koneksi anonim dapat mengakses tabel
alter table public.users disable row level security;
alter table public.sliders disable row level security;
alter table public.categories disable row level security;
alter table public.news disable row level security;
alter table public.galleries disable row level security;
alter table public.agendas disable row level security;
alter table public.downloads disable row level security;
alter table public.contacts disable row level security;
alter table public.profiles disable row level security;
alter table public.settings disable row level security;
alter table public.pengurus disable row level security;`}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ==========================================
          MODALS / FORMS POPUPS (CRUD Action Popups)
         ========================================== */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 animate-scale-up">
            <div className="p-6 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h3 className="text-base font-black tracking-tight text-slate-850 dark:text-slate-100 uppercase">
                {activeModal === 'add' ? 'Tambah Data' : activeModal === 'edit' ? 'Edit Data' : 'Detail Data'}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeModal === 'view' && activeTab === 'contacts' ? (
              // Read contact message
              <div className="p-6 space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-slate-400 font-bold block">PENGIRIM</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 block text-base mt-0.5">{formData.name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-bold block">TANGGAL</span>
                    <span className="font-medium text-slate-500 block mt-0.5">{formData.date}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-bold block">EMAIL</span>
                    <span className="font-semibold block text-blue-600 mt-0.5">{formData.email}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-bold block">NO. WHATSAPP</span>
                    <span className="font-semibold block text-slate-700 dark:text-slate-300 mt-0.5">{formData.phone || '-'}</span>
                  </div>
                </div>
                <hr className="border-slate-100 dark:border-slate-800" />
                <div>
                  <span className="text-xs text-slate-400 font-bold block">SUBJEK PESAN</span>
                  <span className="font-extrabold text-slate-800 dark:text-slate-100 block mt-1">{formData.subject}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-bold block">ISI PESAN</span>
                  <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-2xl font-medium leading-relaxed mt-1.5 text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {formData.message}
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => setActiveModal(null)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            ) : (
              // CRUD Input forms based on Active Tab
              <form onSubmit={handleSave} className="p-6 space-y-5">
                {/* Sliders Form */}
                {activeTab === 'sliders' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Gambar Banner Slider (Pilih Berkas Komputer)</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-5 bg-slate-50 dark:bg-slate-850 flex flex-col items-center justify-center text-center relative cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition md:col-span-2 h-28">
                          <Upload className="w-5 h-5 text-slate-400 mb-1" />
                          <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300 block">Pilih Gambar Slider</span>
                          <span className="text-[9px] text-slate-400 mt-0.5">PNG, JPG, JPEG, WebP, GIF (Max 25MB)</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 'image')}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </div>
                        <div className="flex flex-col items-center justify-center border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-850 h-28 overflow-hidden">
                          {formData.image ? (
                            <img src={formData.image} alt="Banner Preview" className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">No Preview</span>
                          )}
                        </div>
                      </div>
                      {isUploading && <p className="text-[10px] text-blue-500 animate-pulse text-center">Sedang mengunggah gambar slider...</p>}
                      <input type="hidden" name="image" value={formData.image || ''} required />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Judul Banner (Title)</label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-blue-500 text-xs font-medium"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Subjudul (Subtitle)</label>
                      <textarea
                        name="subtitle"
                        value={formData.subtitle || ''}
                        onChange={handleInputChange}
                        rows={2}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-blue-500 text-xs font-medium"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Tombol Aksi Link</label>
                        <input
                          type="text"
                          name="link"
                          value={formData.link || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-blue-500 text-xs font-medium"
                        />
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <input
                          type="checkbox"
                          id="active"
                          name="active"
                          checked={formData.active !== false}
                          onChange={handleInputChange}
                          className="w-4 h-4 accent-blue-600 rounded border-slate-300"
                        />
                        <label htmlFor="active" className="text-xs font-bold uppercase tracking-wider text-slate-400 select-none">Tampilkan Banner</label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pengurus Form */}
                {activeTab === 'pengurus' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Nama Pengurus (Gelar Lengkap)</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-blue-500 text-xs font-medium"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Jabatan Kepengurusan</label>
                      <input
                        type="text"
                        name="jabatan"
                        value={formData.jabatan || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-blue-500 text-xs font-medium"
                        placeholder="Ketua, Wakil, Sekretaris, dsb."
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Masa Bakti</label>
                        <input
                          type="text"
                          name="masaBakti"
                          value={formData.masaBakti || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-blue-500 text-xs font-medium"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Urutan Tampil (Urutan Index)</label>
                        <input
                          type="number"
                          name="orderIndex"
                          value={formData.orderIndex || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-blue-500 text-xs font-medium"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Foto Pengurus (Pilih Berkas Komputer)</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-5 bg-slate-50 dark:bg-slate-850 flex flex-col items-center justify-center text-center relative cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition md:col-span-2 h-28">
                          <Upload className="w-5 h-5 text-slate-400 mb-1" />
                          <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300 block">Pilih Foto Pengurus</span>
                          <span className="text-[9px] text-slate-400 mt-0.5">PNG, JPG, JPEG, WebP (Max 25MB)</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 'foto')}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </div>
                        <div className="flex flex-col items-center justify-center border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-850 h-28 overflow-hidden">
                          {formData.foto ? (
                            <img src={formData.foto} alt="Foto Preview" className="h-full w-auto object-cover rounded-lg" />
                          ) : (
                            <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">No Preview</span>
                          )}
                        </div>
                      </div>
                      {isUploading && <p className="text-[10px] text-blue-500 animate-pulse text-center">Sedang mengunggah foto pengurus...</p>}
                      <input type="hidden" name="foto" value={formData.foto || ''} required />
                    </div>
                  </div>
                )}

                {/* News Form */}
                {activeTab === 'news' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Kategori Berita</label>
                        <select
                          name="categoryId"
                          value={formData.categoryId || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-blue-500 text-xs font-semibold text-slate-700 dark:text-slate-300"
                          required
                        >
                          <option value="">-- Pilih Kategori --</option>
                          {categories.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Tanggal Posting</label>
                        <input
                          type="date"
                          name="date"
                          value={formData.date || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-blue-500 text-xs font-medium"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Judul Berita</label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-blue-500 text-xs font-semibold"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Gambar Cover Berita (Pilih Berkas Komputer)</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-5 bg-slate-50 dark:bg-slate-850 flex flex-col items-center justify-center text-center relative cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition md:col-span-2 h-28">
                          <Upload className="w-5 h-5 text-slate-400 mb-1" />
                          <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300 block">Pilih Cover Berita</span>
                          <span className="text-[9px] text-slate-400 mt-0.5">PNG, JPG, JPEG, WebP, GIF (Max 25MB)</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFileUpload(e, 'image')}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </div>
                        <div className="flex flex-col items-center justify-center border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-850 h-28 overflow-hidden">
                          {formData.image ? (
                            <img src={formData.image} alt="Cover Preview" className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">No Preview</span>
                          )}
                        </div>
                      </div>
                      {isUploading && <p className="text-[10px] text-blue-500 animate-pulse text-center">Sedang mengunggah gambar cover...</p>}
                      <input type="hidden" name="image" value={formData.image || ''} required />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Isi Berita Lengkap</label>
                        <span className="text-[10px] text-slate-400">Mendukung format paragraf tulisan.</span>
                      </div>
                      <textarea
                        name="content"
                        value={formData.content || ''}
                        onChange={handleInputChange}
                        rows={8}
                        className="w-full p-4 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded-2xl outline-none focus:border-blue-500 text-xs font-medium leading-relaxed"
                        placeholder="Tuliskan berita lengkap di sini..."
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Categories Form */}
                {activeTab === 'categories' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Nama Kategori Berita</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-blue-500 text-xs font-medium"
                        placeholder="Contoh: Pengumuman, Kegiatan Sekolah"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Galleries Form */}
                {activeTab === 'galleries' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Tipe Galeri</label>
                        <select
                          name="type"
                          value={formData.type || 'photo'}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-blue-500 text-xs font-bold text-slate-700 dark:text-slate-300"
                        >
                          <option value="photo">Foto (Photo)</option>
                          <option value="video">Video YouTube (Embed Link)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Judul Foto / Video</label>
                        <input
                          type="text"
                          name="title"
                          value={formData.title || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-blue-500 text-xs font-medium"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                        {formData.type === 'video' ? 'URL Embed YouTube (misal: https://www.youtube.com/embed/code)' : 'Gambar Cover Galeri (Pilih Berkas Komputer)'}
                      </label>
                      {formData.type === 'video' ? (
                        <input
                          type="text"
                          name="url"
                          value={formData.url || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-blue-500 text-xs font-medium"
                          placeholder="https://www.youtube.com/embed/zpOULjyy-n8"
                          required
                        />
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                          <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-5 bg-slate-50 dark:bg-slate-850 flex flex-col items-center justify-center text-center relative cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition md:col-span-2 h-28">
                            <Upload className="w-5 h-5 text-slate-400 mb-1" />
                            <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300 block">Pilih Foto Galeri</span>
                            <span className="text-[9px] text-slate-400 mt-0.5">PNG, JPG, JPEG, WebP, GIF (Max 25MB)</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, 'url')}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                          </div>
                          <div className="flex flex-col items-center justify-center border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-slate-50 dark:bg-slate-850 h-28 overflow-hidden">
                            {formData.url ? (
                              <img src={formData.url} alt="Galeri Preview" className="w-full h-full object-cover rounded-lg" />
                            ) : (
                              <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">No Preview</span>
                            )}
                          </div>
                        </div>
                      )}
                      {isUploading && formData.type !== 'video' && (
                        <p className="text-[10px] text-blue-500 animate-pulse text-center">Sedang mengunggah foto galeri...</p>
                      )}
                      <input type="hidden" name="url" value={formData.url || ''} required />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Keterangan / Deskripsi Galeri</label>
                      <textarea
                        name="description"
                        value={formData.description || ''}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-blue-500 text-xs font-medium"
                      />
                    </div>
                  </div>
                )}

                {/* Agendas Form */}
                {activeTab === 'agendas' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Nama Kegiatan / Agenda</label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-blue-500 text-xs font-semibold"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Tanggal Pelaksanaan</label>
                        <input
                          type="date"
                          name="date"
                          value={formData.date || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-blue-500 text-xs font-medium"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Waktu Pelaksanaan</label>
                        <input
                          type="text"
                          name="time"
                          value={formData.time || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-blue-500 text-xs font-medium"
                          placeholder="08:00 - 12:00 / Selesai"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Tempat Pelaksanaan (Lokasi)</label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-blue-500 text-xs font-medium"
                        placeholder="Contoh: Gedung Guru Pasirwangi"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Deskripsi / Detail Acara</label>
                      <textarea
                        name="description"
                        value={formData.description || ''}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full p-3 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-blue-500 text-xs font-medium"
                      />
                    </div>
                  </div>
                )}

                {/* Downloads Form */}
                {activeTab === 'downloads' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Unggah Berkas Baru</label>
                      <div className="border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 bg-slate-50 dark:bg-slate-850 flex flex-col items-center justify-center text-center relative cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                        <Upload className="w-8 h-8 text-slate-400 mb-2 animate-pulse" />
                        <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300 block">Pilih Berkas atau Tarik ke Sini</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Dukungan: PDF, DOC, XLS, ZIP (Max 25MB)</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.zip,.rar"
                          onChange={(e) => handleFileUpload(e, 'filePath')}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                      {isUploading && <p className="text-xs text-blue-500 text-center animate-pulse">Mengunggah berkas, mohon tunggu...</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Nama Tampilan File (File Name)</label>
                      <input
                        type="text"
                        name="fileName"
                        value={formData.fileName || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-blue-500 text-xs font-medium"
                        placeholder="Contoh: Formulir Pendaftaran Anggota Baru.pdf"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-1.5 col-span-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Path Simpan File (File Path)</label>
                        <input
                          type="text"
                          name="filePath"
                          value={formData.filePath || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-blue-500 text-xs font-mono text-slate-500"
                          required
                          readOnly
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Tipe Berkas</label>
                        <select
                          name="fileType"
                          value={formData.fileType || 'pdf'}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-blue-500 text-xs font-bold text-slate-700 dark:text-slate-300"
                        >
                          <option value="pdf">PDF</option>
                          <option value="doc">Word (doc)</option>
                          <option value="xls">Excel (xls)</option>
                          <option value="zip">ZIP Archive</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Admins Form */}
                {activeTab === 'admins' && (
                  <div className="space-y-4">
                    {activeModal === 'add' && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Username Admin</label>
                        <input
                          type="text"
                          name="username"
                          value={formData.username || ''}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-blue-500 text-xs font-mono font-bold"
                          placeholder="adminpgri"
                          required
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Nama Lengkap Admin</label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-blue-500 text-xs font-medium"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        {activeModal === 'add' ? 'Password' : 'Password Baru (kosongkan jika tidak diubah)'}
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-850 rounded-xl outline-none focus:border-blue-500 text-xs"
                        placeholder="••••••••"
                        required={activeModal === 'add'}
                      />
                    </div>
                  </div>
                )}

                {/* Submit button footer */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-850">
                  <button
                    type="button"
                    onClick={() => setActiveModal(null)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-bold rounded-xl text-xs cursor-pointer shadow-md"
                  >
                    Simpan Data
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Simple inline duplicate of shield icon to prevent import issues
function ShieldCheckIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l7-2a1 1 0 0 1 .48 0l7 2A1 1 0 0 1 20 6z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
