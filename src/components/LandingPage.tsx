import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  MapPin,
  Phone,
  Mail,
  Download,
  Calendar,
  ChevronRight,
  Search,
  MessageSquare,
  Facebook,
  Instagram,
  Youtube,
  Send,
  Eye,
  Info,
  Clock,
  Menu,
  X,
  FileText,
  User,
  ShieldAlert,
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import {
  Slider,
  Profile,
  Category,
  News,
  Gallery,
  Agenda,
  Download as DownloadType,
  Settings,
  Pengurus
} from '../types';

const getPrimaryHex = (color: string | undefined) => {
  switch (color) {
    case 'emerald': return '#059669';
    case 'indigo': return '#4f46e5';
    case 'purple': return '#9333ea';
    case 'amber': return '#d97706';
    case 'rose': return '#e11d48';
    default: return '#2563eb'; // blue
  }
};

const getPrimaryHoverHex = (color: string | undefined) => {
  switch (color) {
    case 'emerald': return '#047857';
    case 'indigo': return '#4338ca';
    case 'purple': return '#7e22ce';
    case 'amber': return '#b45309';
    case 'rose': return '#be123c';
    default: return '#1d4ed8'; // blue
  }
};

const getPrimaryShadow = (color: string | undefined) => {
  switch (color) {
    case 'emerald': return 'rgba(16, 185, 129, 0.2)';
    case 'indigo': return 'rgba(99, 102, 241, 0.2)';
    case 'purple': return 'rgba(168, 85, 247, 0.2)';
    case 'amber': return 'rgba(245, 158, 11, 0.2)';
    case 'rose': return 'rgba(244, 63, 94, 0.2)';
    default: return 'rgba(59, 130, 246, 0.2)'; // blue
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

interface LandingPageProps {
  onGoToLogin: () => void;
  triggerAlert: (config: { type: 'success' | 'error'; title: string; message: string }) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onGoToLogin, triggerAlert }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // States from DB
  const [sliders, setSliders] = useState<Slider[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [pengurus, setPengurus] = useState<Pengurus[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [news, setNews] = useState<News[]>([]);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [downloads, setDownloads] = useState<DownloadType[]>([]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [newsPage, setNewsPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Active slideshow index
  const [activeSlide, setActiveSlide] = useState(0);

  // Read News Modal details
  const [viewingNews, setViewingNews] = useState<News | null>(null);

  // Contact Form State
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [sendingContact, setSendingContact] = useState(false);

  // Fetch standard data
  const fetchLandingData = async () => {
    try {
      const [
        resSliders,
        resProfile,
        resSettings,
        resPengurus,
        resCategories,
        resGalleries,
        resAgendas,
        resDownloads
      ] = await Promise.all([
        fetch('/api/public/sliders'),
        fetch('/api/public/profile'),
        fetch('/api/public/settings'),
        fetch('/api/public/pengurus'),
        fetch('/api/public/categories'),
        fetch('/api/public/galleries'),
        fetch('/api/public/agendas'),
        fetch('/api/public/downloads')
      ]);

      setSliders(await resSliders.json());
      setProfile(await resProfile.json());
      setSettings(await resSettings.json());
      setPengurus(await resPengurus.json());
      setCategories(await resCategories.json());
      setGalleries(await resGalleries.json());
      setAgendas(await resAgendas.json());
      setDownloads(await resDownloads.json());
    } catch (err) {
      console.error('Error loading landing page data:', err);
    }
  };

  // Separated News fetch with custom query strings
  const fetchNewsList = async () => {
    try {
      let url = `/api/public/news?page=${newsPage}&limit=6`;
      if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
      if (selectedCategory) url += `&categoryId=${selectedCategory}`;

      const res = await fetch(url);
      const data = await res.json();
      setNews(data.news || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Error fetching news:', err);
    }
  };

  useEffect(() => {
    fetchLandingData();
  }, []);

  useEffect(() => {
    fetchNewsList();
  }, [newsPage, searchQuery, selectedCategory]);

  // Slideshow automated timer
  useEffect(() => {
    if (sliders.length === 0) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % sliders.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [sliders]);

  // Handle Contact Submit
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      triggerAlert({
        type: 'error',
        title: 'Formulir Kurang Lengkap',
        message: 'Nama, Email, dan Isi Pesan wajib diisi sebelum dikirim.'
      });
      return;
    }

    setSendingContact(true);
    try {
      const res = await fetch('/api/public/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(contactForm)
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal mengirim pesan');
      }

      triggerAlert({
        type: 'success',
        title: 'Pesan Dikirim',
        message: 'Pesan Anda berhasil diterima oleh Pengurus Cabang Pasirwangi.'
      });

      // Clear Form
      setContactForm({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
    } catch (err: any) {
      triggerAlert({
        type: 'error',
        title: 'Pengiriman Gagal',
        message: err.message || 'Terjadi kesalahan sistem'
      });
    } finally {
      setSendingContact(false);
    }
  };

  // Read news detail (loads dynamic counts on click)
  const openNewsDetail = async (n: News) => {
    setViewingNews(n);
    try {
      const res = await fetch(`/api/public/news/${n.slug}`);
      if (res.ok) {
        const freshNews = await res.json();
        // Update local state views
        setNews((prev) =>
          prev.map((item) => (item.id === freshNews.id ? { ...item, views: freshNews.views } : item))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadClick = async (d: DownloadType) => {
    window.open(`/api/public/downloads/${d.id}/download`, '_blank');
    // Increment downloadCount locally for immediate UI response
    setDownloads((prev) =>
      prev.map((item) => (item.id === d.id ? { ...item, downloadCount: (item.downloadCount || 0) + 1 } : item))
    );
  };

  const navLinks = [
    { label: 'Beranda', href: '#beranda' },
    { label: 'Profil', href: '#profil' },
    { label: 'Visi & Misi', href: '#visimisi' },
    { label: 'Kepengurusan', href: '#kepengurusan' },
    { label: 'Berita', href: '#berita' },
    { label: 'Galeri', href: '#galeri' },
    { label: 'Agenda', href: '#agenda' },
    { label: 'Dokumen', href: '#download' },
    { label: 'Kontak', href: '#kontak' }
  ];

  return (
    <div className="bg-slate-50 text-slate-800 font-sans min-h-screen flex flex-col selection:bg-blue-600 selection:text-white">
      {settings?.primaryColor && (
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --primary-color: ${getPrimaryHex(settings.primaryColor)};
            --primary-hover: ${getPrimaryHoverHex(settings.primaryColor)};
            --primary-shadow: ${getPrimaryShadow(settings.primaryColor)};
          }
          .bg-blue-600 { background-color: var(--primary-color) !important; }
          .hover\\:bg-blue-700:hover { background-color: var(--primary-hover) !important; }
          .text-blue-600 { color: var(--primary-color) !important; }
          .hover\\:text-blue-700:hover { color: var(--primary-hover) !important; }
          .border-blue-600 { border-color: var(--primary-color) !important; }
          .focus\\:ring-blue-500:focus { --tw-ring-color: var(--primary-color) !important; }
          .shadow-blue-500\\/20 { --tw-shadow-color: var(--primary-shadow) !important; }
          .selection\\:bg-blue-600::selection { background-color: var(--primary-color) !important; }
        `}} />
      )}
      {/* 1. Header & Navigation */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-100 shadow-sm transition-all">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 xl:px-16 h-20 flex items-center justify-between">
          {/* Brand/Logo */}
          <a href="#beranda" className="flex items-center gap-3">
            <img
              src={settings?.logo || 'https://images.unsplash.com/photo-1594608661623-aa0bd3a69d98?auto=format&fit=crop&w=120&h=120&q=80'}
              alt="Logo PGRI"
              className="w-12 h-12 object-cover rounded-xl"
            />
            <div>
              <span className="text-xs font-black tracking-widest text-blue-600 uppercase block leading-none">Official Site</span>
              <h1 className="text-sm font-black text-slate-900 tracking-tight uppercase leading-snug mt-1">
                {settings?.siteName || 'PGRI Pasirwangi'}
              </h1>
            </div>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link, idx) => (
              <a
                key={idx}
                href={link.href}
                className="px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition duration-150"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Admin Login Button */}
          <div className="hidden lg:flex items-center">
            <button
              onClick={onGoToLogin}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-md hover:shadow-lg hover:shadow-blue-500/25 transition duration-150 active:scale-[0.98] cursor-pointer"
            >
              Admin Portal
            </button>
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5.5 h-5.5" /> : <Menu className="w-5.5 h-5.5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-100 animate-slide-down">
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-blue-600 hover:bg-slate-50 transition"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-4 pb-2 border-t border-slate-100 px-4">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onGoToLogin();
                  }}
                  className="w-full py-3 bg-blue-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl text-center block cursor-pointer"
                >
                  Admin Portal
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* 2. Hero Slideshow Section */}
      <section id="beranda" className="relative h-[650px] bg-slate-900 overflow-hidden flex items-center justify-center">
        {sliders.length > 0 ? (
          sliders.map((slide, idx) => {
            const isCurrent = idx === activeSlide;
            return (
              <div
                key={slide.id}
                className={`absolute inset-0 transition-all duration-1000 transform ${
                  isCurrent ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
                }`}
              >
                {/* Background image & gradient overlays */}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/80 to-transparent z-10" />
                <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />

                {/* Banner Content */}
                <div className="absolute inset-0 z-20 flex items-center">
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
                    <div className="max-w-2xl space-y-5 animate-scale-up">
                      <span className="inline-block px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 uppercase">
                        Sinergi Pengabdian Guru
                      </span>
                      <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none uppercase">
                        {slide.title}
                      </h2>
                      <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium">
                        {slide.subtitle}
                      </p>
                      <div className="pt-2">
                        <a
                          href={slide.link}
                          className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition shadow-lg shadow-blue-600/25 inline-flex items-center gap-2"
                        >
                          Selengkapnya
                          <ArrowRight className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center text-slate-400 animate-pulse">Memuat banner...</div>
        )}

        {/* Indicators */}
        {sliders.length > 1 && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-30 flex gap-2">
            {sliders.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveSlide(idx)}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === activeSlide ? 'w-8 bg-blue-500' : 'w-2 bg-slate-500'
                }`}
              />
            ))}
          </div>
        )}
      </section>

      {/* 3. Profil & Sambutan Section */}
      <section id="profil" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase block">Tentang Organisasi</span>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Profil {settings?.siteName || 'PGRI Pasirwangi'}</h2>
            <div className="h-1 w-20 bg-blue-600 mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Sejarah Text */}
            <div className="space-y-6">
              <h3 className="text-xl font-black tracking-tight text-slate-900 uppercase flex items-center gap-2">
                <span className="w-1.5 h-6 bg-blue-600 rounded-full" />
                Sejarah Singkat
              </h3>
              <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-line font-medium">
                {profile?.sejarah || 'Memuat sejarah...'}
              </p>
            </div>

            {/* Sambutan Ketua */}
            <div className="p-6 sm:p-8 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col sm:flex-row gap-6 items-start">
              <div className="w-full sm:w-44 shrink-0 aspect-[3/4] bg-slate-200 rounded-2xl overflow-hidden border border-slate-200">
                <img
                  src={profile?.fotoKetua || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&h=380&q=80'}
                  alt="Foto Ketua"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-4 flex-1">
                <span className="text-[10px] font-black tracking-widest text-amber-500 uppercase block">Sambutan Ketua Cabang</span>
                <h3 className="text-base font-black text-slate-900 leading-tight">Assalamu'alaikum Warahmatullahi Wabarakatuh</h3>
                <p className="text-xs text-slate-500 italic line-clamp-6 leading-relaxed font-medium">
                  {profile?.sambutanKetua}
                </p>
                <button
                  onClick={() => {
                    triggerAlert({
                      type: 'success',
                      title: 'Sambutan Lengkap Ketua',
                      message: profile?.sambutanKetua || ''
                    });
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  Baca Sambutan Lengkap <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Visi & Misi Section */}
      <section id="visimisi" className="py-20 bg-slate-950 text-white relative overflow-hidden">
        {/* Decorator glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase block">Landasan Nilai</span>
            <h2 className="text-3xl font-black tracking-tight uppercase">Visi & Misi</h2>
            <div className="h-1 w-20 bg-amber-400 mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-stretch">
            {/* Visi */}
            <div className="lg:col-span-2 p-8 bg-white/5 border border-white/5 rounded-3xl flex flex-col justify-center space-y-4">
              <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase block">Visi Utama</span>
              <p className="text-lg sm:text-xl font-black tracking-tight leading-snug">
                "{profile?.visi}"
              </p>
            </div>

            {/* Misi */}
            <div className="lg:col-span-3 space-y-4">
              <span className="text-[10px] font-black tracking-widest text-blue-400 uppercase block mb-2">Misi Perjuangan</span>
              <div className="space-y-3">
                {profile?.misi.map((m, idx) => (
                  <div key={idx} className="flex gap-4 p-4 bg-white/5 border border-white/5 hover:border-blue-500/20 rounded-2xl transition duration-200">
                    <span className="flex items-center justify-center w-10 h-10 bg-blue-600 text-sm font-black rounded-xl shrink-0">
                      {idx + 1}
                    </span>
                    <p className="text-sm font-semibold text-slate-300 leading-relaxed self-center">{m}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Kepengurusan Section */}
      <section id="kepengurusan" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase block">Struktur Organisasi</span>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Pengurus Cabang PGRI</h2>
            <div className="h-1 w-20 bg-blue-600 mx-auto rounded-full" />
          </div>

          {/* Members grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {pengurus.map((p) => (
              <div key={p.id} className="group bg-slate-50 hover:bg-white rounded-3xl overflow-hidden border border-slate-100 hover:border-slate-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-center flex flex-col justify-between">
                <div className="aspect-[3/4] bg-slate-100 overflow-hidden relative">
                  <img src={p.foto} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-4 right-4 px-2.5 py-1 text-[9px] font-black tracking-wider uppercase bg-blue-600 text-white rounded-lg">
                    {p.masaBakti}
                  </div>
                </div>
                <div className="p-5 space-y-1 bg-white">
                  <h4 className="text-xs font-black uppercase text-blue-600 tracking-wider leading-snug">{p.jabatan}</h4>
                  <h3 className="text-sm font-black text-slate-900 leading-tight line-clamp-2">{p.name}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Berita Section */}
      <section id="berita" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase block">Kabar Informasi</span>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Berita & Artikel</h2>
            <div className="h-1 w-20 bg-blue-600 mx-auto rounded-full" />
          </div>

          {/* Search, Categories Filter, & Listing controls */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
            {/* Search */}
            <div className="relative w-full md:max-w-sm">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-5 h-5" />
              </span>
              <input
                type="text"
                placeholder="Cari berita..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setNewsPage(1); }}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-2xl outline-none text-xs font-medium transition"
              />
            </div>

            {/* Categories scrollable pill row */}
            <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
              <button
                onClick={() => { setSelectedCategory(null); setNewsPage(1); }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shrink-0 transition cursor-pointer ${
                  selectedCategory === null
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                Semua Kategori
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategory(cat.id); setNewsPage(1); }}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shrink-0 transition cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* News Cards list */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {news.length > 0 ? (
              news.map((n) => {
                const categoryName = categories.find(c => c.id === n.categoryId)?.name || 'Kabar';
                return (
                  <div key={n.id} className="group bg-white rounded-3xl overflow-hidden border border-slate-100 hover:border-slate-200 hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
                    <div className="aspect-video bg-slate-100 overflow-hidden relative">
                      <img src={n.image} alt={n.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <span className="absolute bottom-4 left-4 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-blue-600 text-white rounded-lg shadow-md">
                        {categoryName}
                      </span>
                    </div>

                    <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-2">
                        <span className="text-[10px] text-slate-400 font-bold block">{n.date} • {n.views || 0} Dilihat</span>
                        <h3 className="text-base font-black text-slate-900 leading-snug line-clamp-2 uppercase">
                          {n.title}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed font-medium">
                          {n.content}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-slate-50">
                        <button
                          onClick={() => openNewsDetail(n)}
                          className="text-xs font-black text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 cursor-pointer hover:underline"
                        >
                          Baca Selengkapnya
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-16 text-center text-slate-400">
                <ShieldAlert className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-semibold">Tidak ada berita yang cocok dengan pencarian.</p>
              </div>
            )}
          </div>

          {/* News Pagination UI */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <button
                disabled={newsPage === 1}
                onClick={() => setNewsPage(prev => Math.max(1, prev - 1))}
                className="px-4 py-2 bg-white disabled:bg-slate-100 disabled:text-slate-300 border border-slate-200 text-xs font-bold uppercase rounded-xl transition cursor-pointer"
              >
                Sebelumnya
              </button>
              <span className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-100 text-xs font-bold rounded-xl flex items-center">
                Halaman {newsPage} dari {totalPages}
              </span>
              <button
                disabled={newsPage === totalPages}
                onClick={() => setNewsPage(prev => Math.min(totalPages, prev + 1))}
                className="px-4 py-2 bg-white disabled:bg-slate-100 disabled:text-slate-300 border border-slate-200 text-xs font-bold uppercase rounded-xl transition cursor-pointer"
              >
                Selanjutnya
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 7. Galeri Section */}
      <section id="galeri" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase block">Dokumentasi</span>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Galeri Foto & Video</h2>
            <div className="h-1 w-20 bg-blue-600 mx-auto rounded-full" />
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {galleries.map((g) => (
              <div key={g.id} className="group bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-3xl overflow-hidden shadow-sm flex flex-col justify-between">
                <div className="aspect-video bg-slate-200 overflow-hidden relative">
                  {g.type === 'video' ? (
                    <iframe src={getYouTubeEmbedUrl(g.url)} title={g.title} className="w-full h-full" allowFullScreen />
                  ) : (
                    <img src={g.url} alt={g.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  )}
                  <span className="absolute top-3 right-3 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded bg-slate-900/80 text-white">
                    {g.type === 'photo' ? 'Foto' : 'Video'}
                  </span>
                </div>
                <div className="p-4 bg-white space-y-1">
                  <h4 className="text-xs font-black line-clamp-1">{g.title}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed font-medium">{g.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Agenda Section */}
      <section id="agenda" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase block">Kalender Kerja</span>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Agenda & Kegiatan Mendatang</h2>
            <div className="h-1 w-20 bg-blue-600 mx-auto rounded-full" />
          </div>

          {/* Grid and list */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {agendas.map((a) => (
              <div key={a.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between hover:shadow-lg hover:border-blue-500/20 transition-all duration-300">
                <div className="space-y-4">
                  {/* Elegant Date Box */}
                  <div className="flex gap-3 items-center">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl flex flex-col items-center justify-center font-black min-w-14">
                      <Calendar className="w-5 h-5 text-blue-600 mb-0.5" />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 font-bold block uppercase tracking-wider">Tanggal & Waktu</span>
                      <span className="text-sm font-black text-slate-800 block mt-0.5">{a.date}</span>
                      <span className="text-xs text-slate-400 font-mono block mt-0.5">{a.time}</span>
                    </div>
                  </div>

                  <hr className="border-slate-50" />

                  <div className="space-y-2">
                    <h3 className="text-base font-black uppercase text-slate-800 leading-snug">{a.title}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium line-clamp-3">{a.description}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-50 flex items-center gap-2 mt-5 text-xs text-slate-500 font-semibold">
                  <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="line-clamp-1">{a.location}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Download Dokumen Section */}
      <section id="download" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase block">Administrasi</span>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Download Dokumen Resmi</h2>
            <div className="h-1 w-20 bg-blue-600 mx-auto rounded-full" />
          </div>

          {/* Table download list */}
          <div className="bg-slate-50 rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    <th className="p-4 text-center">Tipe</th>
                    <th className="p-4">Nama Dokumen</th>
                    <th className="p-4">Ukuran Berkas</th>
                    <th className="p-4">Dinduh</th>
                    <th className="p-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {downloads.map((d) => (
                    <tr key={d.id} className="hover:bg-white transition-colors duration-150">
                      <td className="p-4 text-center">
                        <span className={`inline-block px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg ${
                          d.fileType === 'pdf' ? 'bg-red-500 text-white' :
                          d.fileType === 'doc' ? 'bg-blue-500 text-white' :
                          d.fileType === 'xls' ? 'bg-emerald-500 text-white' :
                          'bg-amber-500 text-slate-950'
                        }`}>
                          {d.fileType}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-800 block text-sm">{d.fileName}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Dirilis pada: {d.date}</span>
                      </td>
                      <td className="p-4 font-semibold font-mono text-slate-500">{d.fileSize}</td>
                      <td className="p-4 font-bold text-slate-600">{d.downloadCount || 0} kali</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDownloadClick(d)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-wider shadow-sm flex items-center gap-1.5 ml-auto transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> Unduh
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Kontak Section */}
      <section id="kontak" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <span className="text-[10px] font-black tracking-widest text-blue-600 uppercase block">Hubungi Kami</span>
            <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Kontak & Lokasi Kantor</h2>
            <div className="h-1 w-20 bg-blue-600 mx-auto rounded-full" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Contact Details & Info */}
            <div className="space-y-8">
              <div className="space-y-3">
                <h3 className="text-xl font-black uppercase text-slate-900 tracking-tight">Kritik, Saran & Informasi Resmi</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Jika Anda memiliki kendala administrasi, kritik dan saran terhadap website PGRI, atau ingin bersinergi, silakan kirimkan pesan resmi melalui form di samping.
                </p>
              </div>

              {/* Icon Lists */}
              <div className="space-y-4">
                <div className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <span className="flex items-center justify-center p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                    <MapPin className="w-5 h-5" />
                  </span>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Alamat Kantor</span>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5">{settings?.address}</p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <span className="flex items-center justify-center p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                    <Mail className="w-5 h-5" />
                  </span>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Alamat Email</span>
                    <p className="text-xs font-semibold text-blue-600 mt-0.5">{settings?.email}</p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <span className="flex items-center justify-center p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
                    <Phone className="w-5 h-5" />
                  </span>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Telepon & WhatsApp</span>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5">
                      Telp: {settings?.telephone} • WA: {settings?.whatsapp}
                    </p>
                  </div>
                </div>
              </div>

              {/* Elegant dynamic vector map representation for aesthetic appeal */}
              <div className="p-6 bg-slate-900 text-white rounded-3xl border border-white/5 space-y-3 shadow-md">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-amber-400 tracking-wider uppercase">Peta Lokasi {settings?.siteName || 'PGRI Pasirwangi'}</span>
                  <span className="text-[10px] text-slate-400">Garut, Jawa Barat</span>
                </div>
                <div className="aspect-[21/9] bg-slate-800 rounded-2xl flex flex-col items-center justify-center border border-white/5 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1.5px,transparent_1.5px)] [background-size:16px_16px] opacity-20" />
                  <MapPin className="w-8 h-8 text-blue-500 animate-bounce relative z-10 mb-1" />
                  <span className="text-xs font-black relative z-10 uppercase tracking-widest text-slate-200 text-center px-4 line-clamp-1">{settings?.address || 'Kecamatan Pasirwangi'}</span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings?.address || 'Kecamatan Pasirwangi, Garut')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="absolute bottom-3 text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    Buka Google Maps <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            {/* Contact Form Card */}
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50">
              <h3 className="text-base font-black uppercase text-slate-900 tracking-tight mb-5">Hubungi Kami Langsung</h3>

              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Nama Lengkap</label>
                    <input
                      type="text"
                      value={contactForm.name}
                      onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl outline-none text-xs font-medium transition"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Email</label>
                    <input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl outline-none text-xs font-medium transition"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">No. HP / WhatsApp (Opsional)</label>
                    <input
                      type="text"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl outline-none text-xs font-medium transition"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Subjek</label>
                    <input
                      type="text"
                      value={contactForm.subject}
                      onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl outline-none text-xs font-medium transition"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Pesan Aspirasi</label>
                  <textarea
                    rows={4}
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    className="w-full p-4 bg-slate-50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-2xl outline-none text-xs font-medium leading-relaxed transition"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendingContact}
                  className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {sendingContact ? 'Mengirim...' : (
                    <>
                      <Send className="w-4 h-4" /> Kirim Pesan Resmi
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* 11. Footer */}
      <footer className="bg-slate-950 text-slate-400 pt-16 pb-8 border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12 pb-12 border-b border-white/5">
          {/* Logo Brand Footer */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={settings?.logo || 'https://images.unsplash.com/photo-1594608661623-aa0bd3a69d98?auto=format&fit=crop&w=120&h=120&q=80'}
                alt="Logo"
                className="w-10 h-10 object-cover rounded-xl"
              />
              <h3 className="text-sm font-black tracking-wider text-white uppercase">{settings?.siteName || 'PGRI Pasirwangi'}</h3>
            </div>
            <p className="text-xs leading-relaxed font-medium">
              {settings?.footer}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase text-white tracking-widest">Tautan Cepat</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {navLinks.slice(0, 8).map((link, idx) => (
                <a key={idx} href={link.href} className="hover:text-white transition font-medium">
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          {/* Admin contact fast */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase text-white tracking-widest">Kontak Darurat</h4>
            <div className="space-y-2 text-xs font-medium">
              <p>Email: <span className="text-blue-400">{settings?.email}</span></p>
              <p>WhatsApp: <span className="text-blue-400">{settings?.whatsapp}</span></p>
            </div>
          </div>

          {/* Social Links */}
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase text-white tracking-widest">Media Sosial Resmi</h4>
            <div className="flex gap-3">
              {settings?.facebook && (
                <a href={settings.facebook} target="_blank" rel="noreferrer" className="p-3 bg-white/5 hover:bg-blue-600 hover:text-white rounded-xl transition">
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {settings?.instagram && (
                <a href={settings.instagram} target="_blank" rel="noreferrer" className="p-3 bg-white/5 hover:bg-pink-600 hover:text-white rounded-xl transition">
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {settings?.youtube && (
                <a href={settings.youtube} target="_blank" rel="noreferrer" className="p-3 bg-white/5 hover:bg-red-600 hover:text-white rounded-xl transition">
                  <Youtube className="w-5 h-5" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Bottom credits */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 font-medium">
          <p>{settings?.copyright}</p>
          <p className="mt-2 sm:mt-0">Designed elegantly in Pasirwangi, Garut</p>
        </div>
      </footer>

      {/* ==========================================
          NEWS FULL CONTENT VIEW POPUP (MODAL)
         ========================================== */}
      {viewingNews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 animate-scale-up">
            <div className="relative aspect-video bg-slate-100 overflow-hidden shrink-0">
              <img src={viewingNews.image} alt={viewingNews.title} className="w-full h-full object-cover" />
              <button
                onClick={() => setViewingNews(null)}
                className="absolute top-4 right-4 p-2.5 rounded-full bg-slate-950/80 hover:bg-slate-950 text-white shadow-md cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase">
                <span>{viewingNews.date}</span>
                <span>{viewingNews.views || 0} Kali Dilihat</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug uppercase">
                {viewingNews.title}
              </h3>
              <hr className="border-slate-100" />
              <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed font-medium">
                {viewingNews.content}
              </p>
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => setViewingNews(null)}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs uppercase tracking-wider cursor-pointer transition"
                >
                  Tutup Bacaan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
