import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';

export let supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

if (supabase) {
  console.log('Supabase client successfully initialized for project:', process.env.SUPABASE_PROJECT_ID || 'pgri-pasirwangi');
} else {
  console.warn('Supabase is not yet configured. Local file storage will be used as primary database.');
}

export function updateSupabaseConfig(url: string, key: string, projectId: string) {
  process.env.SUPABASE_URL = url;
  process.env.SUPABASE_KEY = key;
  process.env.SUPABASE_PROJECT_ID = projectId;
  
  if (url && key) {
    supabase = createClient(url, key);
    console.log('[Supabase Config] Client re-initialized successfully.');
  } else {
    supabase = null;
    console.log('[Supabase Config] Client disabled (missing URL/Key).');
  }
  
  // Also write to .env file
  try {
    const envPath = path.join(process.cwd(), '.env');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Helper to replace or add env variables
    const updateEnvVar = (content: string, name: string, value: string) => {
      const regex = new RegExp(`^${name}=.*$`, 'm');
      if (regex.test(content)) {
        return content.replace(regex, `${name}="${value}"`);
      } else {
        return content + (content.endsWith('\n') ? '' : '\n') + `${name}="${value}"`;
      }
    };
    
    envContent = updateEnvVar(envContent, 'SUPABASE_URL', url);
    envContent = updateEnvVar(envContent, 'SUPABASE_KEY', key);
    envContent = updateEnvVar(envContent, 'SUPABASE_PROJECT_ID', projectId);
    
    fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');
    console.log('[Supabase Config] .env file updated successfully');
  } catch (err) {
    console.error('[Supabase Config] Failed to write to .env:', err);
  }
}

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Interfaces
export interface User {
  id: number;
  username: string;
  passwordHash: string;
  fullName: string;
}

export interface Slider {
  id: number;
  image: string;
  title: string;
  subtitle: string;
  link: string;
  active: boolean;
}

export interface Profile {
  id: number;
  sejarah: string;
  sambutanKetua: string;
  fotoKetua: string;
  visi: string;
  misi: string[];
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface News {
  id: number;
  title: string;
  slug: string;
  content: string;
  image: string;
  categoryId: number;
  views: number;
  date: string;
}

export interface Gallery {
  id: number;
  type: 'photo' | 'video';
  url: string; // File path or YouTube share/embed URL
  title: string;
  description: string;
}

export interface Agenda {
  id: number;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
}

export interface Download {
  id: number;
  fileName: string;
  filePath: string;
  fileType: 'pdf' | 'doc' | 'xls' | 'zip';
  fileSize: string;
  downloadCount: number;
  date: string;
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  date: string;
  read: boolean;
}

export interface Settings {
  siteName: string;
  logo: string;
  favicon: string;
  address: string;
  email: string;
  telephone: string;
  whatsapp: string;
  facebook: string;
  instagram: string;
  youtube: string;
  footer: string;
  copyright: string;
  seoTitle: string;
  seoDescription: string;
  metaKeywords: string;
  themeMode?: 'light' | 'dark' | 'system';
  primaryColor?: 'blue' | 'emerald' | 'indigo' | 'purple' | 'amber' | 'rose';
  adminBgStyle?: 'default' | 'zinc' | 'slate' | 'navy' | 'forest' | 'purple' | 'sunset' | 'dark';
}

// Helper generic database loader and saver
class Table<T extends { id: number }> {
  private filePath: string;
  private tableName: string;

  constructor(filename: string, tableName: string) {
    this.filePath = path.join(DATA_DIR, filename);
    this.tableName = tableName;
  }

  getAll(): T[] {
    if (!fs.existsSync(this.filePath)) {
      this.save([]);
      return [];
    }
    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      console.error(`Error reading database file: ${this.filePath}`, e);
      return [];
    }
  }

  save(items: T[]): void {
    fs.writeFileSync(this.filePath, JSON.stringify(items, null, 2), 'utf8');
  }

  getById(id: number): T | undefined {
    return this.getAll().find(item => item.id === id);
  }

  insert(item: Omit<T, 'id'>): T {
    const items = this.getAll();
    const nextId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
    const newItem = { ...item, id: nextId } as unknown as T;
    items.push(newItem);
    this.save(items);

    // Sync to Supabase asynchronously
    if (supabase) {
      const query = supabase.from(this.tableName).upsert(newItem) as any;
      query
        .then(({ error }: any) => {
          if (error) {
            console.error(`[Supabase Error] Gagal insert ke tabel "${this.tableName}":`, error.message);
          } else {
            console.log(`[Supabase Sync] Sukses sinkronisasi data baru ke "${this.tableName}" (ID: ${nextId})`);
          }
        })
        .catch((err: any) => {
          console.error(`[Supabase Exception] Gagal menyambung ke "${this.tableName}":`, err);
        });
    }

    return newItem;
  }

  update(id: number, updatedFields: Partial<Omit<T, 'id'>>): T | null {
    const items = this.getAll();
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return null;
    const updatedItem = { ...items[index], ...updatedFields };
    items[index] = updatedItem;
    this.save(items);

    // Sync to Supabase asynchronously
    if (supabase) {
      const query = supabase.from(this.tableName).upsert(updatedItem) as any;
      query
        .then(({ error }: any) => {
          if (error) {
            console.error(`[Supabase Error] Gagal update di tabel "${this.tableName}" (ID: ${id}):`, error.message);
          } else {
            console.log(`[Supabase Sync] Sukses memperbarui data di "${this.tableName}" (ID: ${id})`);
          }
        })
        .catch((err: any) => {
          console.error(`[Supabase Exception] Gagal menyambung ke "${this.tableName}":`, err);
        });
    }

    return updatedItem;
  }

  delete(id: number): boolean {
    const items = this.getAll();
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return false;
    items.splice(index, 1);
    this.save(items);

    // Sync to Supabase asynchronously
    if (supabase) {
      const query = supabase.from(this.tableName).delete().eq('id', id) as any;
      query
        .then(({ error }: any) => {
          if (error) {
            console.error(`[Supabase Error] Gagal menghapus di tabel "${this.tableName}" (ID: ${id}):`, error.message);
          } else {
            console.log(`[Supabase Sync] Sukses menghapus data di "${this.tableName}" (ID: ${id})`);
          }
        })
        .catch((err: any) => {
          console.error(`[Supabase Exception] Gagal menyambung ke "${this.tableName}":`, err);
        });
    }

    return true;
  }
}

// Specialized settings loader/saver (since settings is a single object, not a table list)
class SettingsStore {
  private filePath: string;

  constructor() {
    this.filePath = path.join(DATA_DIR, 'settings.json');
  }

  get(): Settings {
    if (!fs.existsSync(this.filePath)) {
      const defaultSettings = this.getDefaults();
      this.save(defaultSettings);
      return defaultSettings;
    }
    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      return this.getDefaults();
    }
  }

  save(settings: Settings): void {
    fs.writeFileSync(this.filePath, JSON.stringify(settings, null, 2), 'utf8');

    // Sync to Supabase
    if (supabase) {
      const query = supabase.from('settings').upsert({ ...settings, id: 1 }) as any;
      query
        .then(({ error }: any) => {
          if (error) console.error(`[Supabase Error] Gagal menyimpan settings:`, error.message);
          else console.log(`[Supabase Sync] Sukses sinkronisasi settings`);
        })
        .catch((err: any) => console.error(`[Supabase Exception] settings:`, err));
    }
  }

  private getDefaults(): Settings {
    return {
      siteName: "PGRI Cabang Kecamatan Pasirwangi",
      logo: "https://images.unsplash.com/photo-1594608661623-aa0bd3a69d98?auto=format&fit=crop&w=120&h=120&q=80", // Placeholder modern logo or high-quality illustration
      favicon: "https://images.unsplash.com/photo-1594608661623-aa0bd3a69d98?auto=format&fit=crop&w=32&h=32&q=80",
      address: "Jl. Raya Pasirwangi No. 45, Kecamatan Pasirwangi, Kabupaten Garut, Jawa Barat 44161",
      email: "info@pgripasirwangi.or.id",
      telephone: "0262-540123",
      whatsapp: "6282123456789",
      facebook: "https://facebook.com/pgripasirwangi",
      instagram: "https://instagram.com/pgripasirwangi",
      youtube: "https://youtube.com/c/pgripasirwangiofficial",
      footer: "Mewujudkan guru profesional, sejahtera, dan bermartabat untuk kemajuan bangsa.",
      copyright: "© 2026 PGRI Cabang Pasirwangi. All Rights Reserved.",
      seoTitle: "Website Resmi PGRI Cabang Kecamatan Pasirwangi",
      seoDescription: "Pusat informasi, kegiatan, berita, agenda, kepengurusan, dan dokumen digital Persatuan Guru Republik Indonesia (PGRI) Cabang Kecamatan Pasirwangi, Kabupaten Garut.",
      metaKeywords: "PGRI, PGRI Pasirwangi, PGRI Garut, Pasirwangi Garut, Guru Pasirwangi, Persatuan Guru Republik Indonesia, Informasi Guru",
      themeMode: "light",
      primaryColor: "blue",
      adminBgStyle: "default"
    };
  }
}

// Profile is typically a singleton stored in a table with ID 1
class ProfileStore {
  private filePath: string;

  constructor() {
    this.filePath = path.join(DATA_DIR, 'profiles.json');
  }

  get(): Profile {
    if (!fs.existsSync(this.filePath)) {
      const defaultProfile = this.getDefaults();
      this.save(defaultProfile);
      return defaultProfile;
    }
    try {
      const data = fs.readFileSync(this.filePath, 'utf8');
      const list = JSON.parse(data);
      return list[0] || this.getDefaults();
    } catch (e) {
      return this.getDefaults();
    }
  }

  save(profile: Profile): void {
    fs.writeFileSync(this.filePath, JSON.stringify([profile], null, 2), 'utf8');

    // Sync to Supabase
    if (supabase) {
      const query = supabase.from('profiles').upsert(profile) as any;
      query
        .then(({ error }: any) => {
          if (error) console.error(`[Supabase Error] Gagal menyimpan profile:`, error.message);
          else console.log(`[Supabase Sync] Sukses sinkronisasi profile`);
        })
        .catch((err: any) => console.error(`[Supabase Exception] profile:`, err));
    }
  }

  private getDefaults(): Profile {
    return {
      id: 1,
      sejarah: "Persatuan Guru Republik Indonesia (PGRI) Cabang Kecamatan Pasirwangi didirikan sebagai wadah pemersatu seluruh tenaga pendidik, guru, dan kependidikan di wilayah Kecamatan Pasirwangi, Kabupaten Garut. Sejak awal berdirinya, PGRI Pasirwangi berkomitmen memperjuangkan kesejahteraan, perlindungan hukum, serta peningkatan profesionalisme guru guna menyukseskan program pendidikan nasional dan mencerdaskan kehidupan masyarakat di Pasirwangi.",
      sambutanKetua: "Assalamu'alaikum Warahmatullahi Wabarakatuh,\n\nSelamat datang di website resmi PGRI Cabang Kecamatan Pasirwangi. Platform digital ini kami dedikasikan sebagai jembatan komunikasi, transparansi informasi, serta wadah inovasi bagi seluruh guru, tenaga kependidikan, dan masyarakat luas di wilayah Pasirwangi.\n\nDi era digitalisasi pendidikan ini, guru dituntut untuk terus bergerak dinamis, meningkatkan kapasitas profesionalisme, dan adaptif terhadap perkembangan teknologi. Melalui website ini, kami berharap dapat menyajikan berita-berita terupdate, agenda kegiatan organisasi, dan memudahkan penyaluran dokumen resmi guna mendukung efektivitas keorganisasian PGRI.\n\nMari kita terus tingkatkan soliditas dan sinergitas demi mewujudkan guru yang mulia, sejahtera, dan dihormati. Hidup PGRI! Hidup Guru! Solidaritas!\n\nWassalamu'alaikum Warahmatullahi Wabarakatuh.",
      fotoKetua: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&h=380&q=80",
      visi: "Terwujudnya PGRI sebagai organisasi profesi tepercaya, dinamis, mandiri, dan berwibawa dalam meningkatkan martabat, kesejahteraan, dan mutu guru untuk mencerdaskan kehidupan bangsa.",
      misi: [
        "Mewujudkan PGRI sebagai organisasi profesi yang solid, mandiri, demokratis, dan dicintai anggotanya.",
        "Meningkatkan mutu, profesionalisme, kompetensi, dan sertifikasi guru di wilayah Kecamatan Pasirwangi.",
        "Memperjuangkan hak-hak konstitusional guru, peningkatan kesejahteraan, jaminan kesehatan, dan jaminan hari tua.",
        "Memberikan advokasi, bantuan hukum, dan perlindungan profesi bagi segenap anggota PGRI Pasirwangi.",
        "Menjalin sinergi dan kemitraan yang kuat dengan Pemerintah Kecamatan Pasirwangi, Dinas Pendidikan, serta pemangku kepentingan lainnya."
      ]
    };
  }
}

// Database tables exports
export const UsersTable = new Table<User>('users.json', 'users');
export const SlidersTable = new Table<Slider>('sliders.json', 'sliders');
export const CategoriesTable = new Table<Category>('categories.json', 'categories');
export const NewsTable = new Table<News>('news.json', 'news');
export const GalleriesTable = new Table<Gallery>('galleries.json', 'galleries');
export const AgendasTable = new Table<Agenda>('agendas.json', 'agendas');
export const DownloadsTable = new Table<Download>('downloads.json', 'downloads');
export const ContactsTable = new Table<ContactMessage>('contacts.json', 'contacts');
export const ProfileStoreInstance = new ProfileStore();
export const SettingsStoreInstance = new SettingsStore();

// Sync All Tables with Supabase (bidirectional)
export async function syncAllTablesWithSupabase(): Promise<{ status: string; message: string; details?: any }> {
  if (!supabase) {
    return { status: 'disabled', message: 'Kredensial Supabase belum dikonfigurasi di file .env' };
  }

  console.log('Initiating bidirectional Supabase sync...');
  const tables = [
    { name: 'users', instance: UsersTable },
    { name: 'sliders', instance: SlidersTable },
    { name: 'categories', instance: CategoriesTable },
    { name: 'news', instance: NewsTable },
    { name: 'galleries', instance: GalleriesTable },
    { name: 'agendas', instance: AgendasTable },
    { name: 'downloads', instance: DownloadsTable },
    { name: 'contacts', instance: ContactsTable },
    { name: 'pengurus', instance: PengurusTable }
  ];

  const results: any = {};
  let errorCount = 0;

  for (const t of tables) {
    try {
      const { data, error } = await supabase.from(t.name).select('*');
      if (error) {
        console.warn(`[Supabase Sync] Table "${t.name}" read error: ${error.message}`);
        results[t.name] = `Error: ${error.message}`;
        errorCount++;
        continue;
      }

      if (data && data.length > 0) {
        // Supabase has data, update local JSON cache
        console.log(`[Supabase Sync] Pulling ${data.length} records for "${t.name}" from Supabase to local database...`);
        t.instance.save(data as any);
        results[t.name] = `Pulled ${data.length} records`;
      } else {
        // Supabase is empty, push local data to seed Supabase
        const localData = t.instance.getAll();
        if (localData.length > 0) {
          console.log(`[Supabase Sync] Supabase table "${t.name}" is empty. Pushing ${localData.length} local records...`);
          const { error: pushError } = await supabase.from(t.name).insert(localData as any);
          if (pushError) {
            console.error(`[Supabase Sync] Failed to push local data for "${t.name}":`, pushError.message);
            results[t.name] = `Push Failed: ${pushError.message}`;
          } else {
            results[t.name] = `Pushed ${localData.length} records`;
          }
        } else {
          results[t.name] = 'Both empty';
        }
      }
    } catch (err: any) {
      console.error(`[Supabase Sync Exception] ${t.name}:`, err.message || err);
      results[t.name] = `Exception: ${err.message || err}`;
      errorCount++;
    }
  }

  // Profile Sync
  try {
    const { data, error } = await supabase.from('profiles').select('*');
    if (!error && data && data.length > 0) {
      console.log(`[Supabase Sync] Pulling profile from Supabase...`);
      ProfileStoreInstance.save(data[0]);
      results['profiles'] = 'Pulled';
    } else if (!error) {
      console.log(`[Supabase Sync] Pushing local profile to Supabase...`);
      const localProfile = ProfileStoreInstance.get();
      await supabase.from('profiles').insert([localProfile]);
      results['profiles'] = 'Pushed';
    } else {
      results['profiles'] = `Error: ${error.message}`;
      errorCount++;
    }
  } catch (err: any) {
    results['profiles'] = `Exception: ${err.message || err}`;
    errorCount++;
  }

  // Settings Sync
  try {
    const { data, error } = await supabase.from('settings').select('*');
    if (!error && data && data.length > 0) {
      console.log(`[Supabase Sync] Pulling settings from Supabase...`);
      const { id, ...cleanSettings } = data[0];
      SettingsStoreInstance.save(cleanSettings);
      results['settings'] = 'Pulled';
    } else if (!error) {
      console.log(`[Supabase Sync] Pushing local settings to Supabase...`);
      const localSettings = SettingsStoreInstance.get();
      await supabase.from('settings').insert([{ ...localSettings, id: 1 }]);
      results['settings'] = 'Pushed';
    } else {
      results['settings'] = `Error: ${error.message}`;
      errorCount++;
    }
  } catch (err: any) {
    results['settings'] = `Exception: ${err.message || err}`;
    errorCount++;
  }

  console.log('Supabase sync complete with results:', results);
  
  if (errorCount === 11) { // All 11 elements failed, probably no tables created
    return {
      status: 'table_error',
      message: 'Koneksi ke Supabase berhasil, namun tabel-tabel database belum terbuat di Supabase. Silakan jalankan script SQL Setup di menu SQL Editor Supabase Anda.',
      details: results
    };
  }

  return {
    status: errorCount > 0 ? 'partial_success' : 'success',
    message: errorCount > 0 
      ? 'Sinkronisasi sebagian berhasil. Beberapa tabel belum terbuat di Supabase.' 
      : 'Sinkronisasi berhasil! Seluruh data tersambung penuh dengan Supabase Cloud.',
    details: results
  };
}

// Initialize and Seed Database
export function initAndSeedDatabase(): void {
  console.log('Checking database seed state...');

  // 1. Seed adminpgri / admin123
  const users = UsersTable.getAll();
  if (users.length === 0) {
    console.log('Seeding default administrator users...');
    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync('admin123', salt);
    UsersTable.insert({
      username: 'adminpgri',
      passwordHash: passwordHash,
      fullName: 'Administrator PGRI'
    });
  }

  // 2. Seed default sliders
  const sliders = SlidersTable.getAll();
  if (sliders.length === 0) {
    console.log('Seeding default sliders...');
    SlidersTable.insert({
      image: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80",
      title: "Selamat Datang di PGRI Kecamatan Pasirwangi",
      subtitle: "Wadah perjuangan, profesionalisme, dan kebersamaan seluruh tenaga pendidik di wilayah Kecamatan Pasirwangi, Kabupaten Garut.",
      link: "#profil",
      active: true
    });
    SlidersTable.insert({
      image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
      title: "Meningkatkan Soliditas dan Profesionalisme Guru",
      subtitle: "Bersinergi memajukan dunia pendidikan demi generasi masa depan Pasirwangi yang unggul dan berkarakter.",
      link: "#agenda",
      active: true
    });
    SlidersTable.insert({
      image: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80",
      title: "Pelayanan Administrasi Digital Terpadu",
      subtitle: "Download berbagai dokumen legal, surat keputusan, dan materi kepegawaian secara cepat dan gratis.",
      link: "#download",
      active: true
    });
  }

  // 3. Seed default categories
  const categories = CategoriesTable.getAll();
  if (categories.length === 0) {
    console.log('Seeding default news categories...');
    CategoriesTable.insert({ name: "Pengumuman", slug: "pengumuman" });
    CategoriesTable.insert({ name: "Kegiatan Organisasi", slug: "kegiatan-organisasi" });
    CategoriesTable.insert({ name: "Opini & Artikel", slug: "opini-artikel" });
    CategoriesTable.insert({ name: "Pendidikan", slug: "pendidikan" });
  }

  // 4. Seed default news
  const news = NewsTable.getAll();
  if (news.length === 0) {
    console.log('Seeding default news...');
    const catList = CategoriesTable.getAll();
    const pengumumanCat = catList.find(c => c.slug === 'pengumuman')?.id || 1;
    const kegiatanCat = catList.find(c => c.slug === 'kegiatan-organisasi')?.id || 2;
    const pendidikanCat = catList.find(c => c.slug === 'pendidikan')?.id || 4;

    NewsTable.insert({
      title: "Rapat Koordinasi Persiapan Hari Guru Nasional Cabang Pasirwangi",
      slug: "rapat-koordinasi-persiapan-hari-guru-nasional-cabang-pasirwangi",
      content: "Pengurus Cabang PGRI Kecamatan Pasirwangi menggelar rapat koordinasi yang dihadiri oleh seluruh Ketua Ranting se-Kecamatan Pasirwangi. Rapat ini dipimpin langsung oleh Ketua Cabang PGRI Kecamatan Pasirwangi untuk mematangkan persiapan peringatan Hari Guru Nasional (HGN) dan HUT PGRI ke-81 tingkat kecamatan.\n\nDalam rapat dibahas beberapa agenda utama, termasuk pelaksanaan jalan sehat guru, upacara bendera, serta pemberian apresiasi bagi guru berprestasi dan berdedikasi di daerah terpencil. Ketua Cabang mengharapkan seluruh anggota dapat berpartisipasi aktif menjaga kekompakan dan menyukseskan rangkaian kegiatan tersebut.",
      image: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=600&q=80",
      categoryId: kegiatanCat,
      views: 128,
      date: "2026-06-20"
    });

    NewsTable.insert({
      title: "Sosialisasi Pemenuhan Dokumen Sertifikasi Guru Tahun 2026",
      slug: "sosialisasi-pemenuhan-dokumen-sertifikasi-guru-tahun-2026",
      content: "Menindaklanjuti regulasi terbaru dari Kementerian Pendidikan mengenai tunjangan profesi, PGRI Pasirwangi mengadakan workshop sosialisasi pemenuhan berkas beban kerja guru. Acara ini dihadiri oleh 150 peserta guru PNS dan PPPK di wilayah kerja Pasirwangi.\n\nNarasumber dari Pengawas Dinas Pendidikan Kabupaten Garut memaparkan poin-poin krusial terkait penilaian kinerja guru (PKG), pelaporan e-Kinerja BKN, serta validitas data Dapodik agar pencairan tunjangan berjalan lancar tanpa kendala administratif. Dokumen pedoman dapat diunduh langsung di menu Dokumen pada website ini.",
      image: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=600&q=80",
      categoryId: pengumumanCat,
      views: 342,
      date: "2026-06-25"
    });

    NewsTable.insert({
      title: "Pemanfaatan Media Pembelajaran Berbasis AI di Sekolah Dasar",
      slug: "pemanfaatan-media-pembelajaran-berbasis-ai-di-sekolah-dasar",
      content: "Perkembangan teknologi kecerdasan buatan (AI) memberikan warna baru dalam dunia pedagogi. Guru-guru di Kecamatan Pasirwangi mulai menerapkan media interaktif berbasis AI untuk meningkatkan antusiasme belajar siswa.\n\nDengan memanfaatkan platform pembantu desain visual dan penyusunan kuis adaptif, siswa sekolah dasar dapat memahami materi abstrak secara lebih visual dan interaktif. PGRI berkomitmen terus memfasilitasi diklat teknologi bagi para guru agar mutu pembelajaran di Kecamatan Pasirwangi terus meningkat setara dengan sekolah perkotaan.",
      image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=600&q=80",
      categoryId: pendidikanCat,
      views: 95,
      date: "2026-06-27"
    });
  }

  // 5. Seed default galleries
  const galleries = GalleriesTable.getAll();
  if (galleries.length === 0) {
    console.log('Seeding default galleries...');
    galleries.push(
      GalleriesTable.insert({
        type: "photo",
        url: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=600&q=80",
        title: "Kegiatan Seminar Guru Kreatif",
        description: "Dokumentasi pelatihan metode mengajar kreatif bagi guru-guru PAUD dan SD se-Kecamatan Pasirwangi."
      })
    );
    galleries.push(
      GalleriesTable.insert({
        type: "photo",
        url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80",
        title: "Rapat Anggota Tahunan Koperasi PGRI",
        description: "Suasana musyawarah kesejahteraan anggota dalam Rapat Anggota Tahunan Koperasi PGRI Pasirwangi."
      })
    );
    galleries.push(
      GalleriesTable.insert({
        type: "photo",
        url: "https://images.unsplash.com/photo-1492538368577-8b5fd600d772?auto=format&fit=crop&w=600&q=80",
        title: "Bakti Sosial Guru PGRI Pasirwangi",
        description: "Pembagian paket bantuan sembako kepada warga terdampak bencana longsor di wilayah Pasirwangi."
      })
    );
    galleries.push(
      GalleriesTable.insert({
        type: "video",
        url: "https://www.youtube.com/embed/zpOULjyy-n8", // Example youtube embed
        title: "Video Profil PGRI Kecamatan Pasirwangi",
        description: "Profil perjalanan dan dedikasi guru-guru PGRI Kecamatan Pasirwangi."
      })
    );
  }

  // 6. Seed default agendas
  const agendas = AgendasTable.getAll();
  if (agendas.length === 0) {
    console.log('Seeding default agendas...');
    AgendasTable.insert({
      title: "Upacara Peringatan Hari Pendidikan Nasional",
      date: "2026-07-02",
      time: "07:30 - selesai",
      location: "Lapangan Alun-Alun Kecamatan Pasirwangi",
      description: "Upacara bendera gabungan bersama Muspika Kecamatan Pasirwangi, guru, dan perwakilan siswa se-Kecamatan Pasirwangi."
    });

    AgendasTable.insert({
      title: "Diklat Implementasi Kurikulum Merdeka (IKM) Mandiri",
      date: "2026-07-15",
      time: "08:00 - 15:00",
      location: "Aula PKG PGRI Pasirwangi",
      description: "Pelatihan penyusunan modul ajar, asesmen diagnostik, dan penguatan Profil Pelajar Pancasila bagi guru SMP/SMA."
    });

    AgendasTable.insert({
      title: "Konferensi Kerja Cabang (Konkerkab) PGRI Pasirwangi",
      date: "2026-08-05",
      time: "09:00 - 16:00",
      location: "Gedung PGRI Kecamatan Pasirwangi",
      description: "Penyusunan laporan pertanggungjawaban program kerja tahunan dan pemetaan arah perjuangan organisasi tahun berikutnya."
    });
  }

  // 7. Seed default downloads
  const downloads = DownloadsTable.getAll();
  if (downloads.length === 0) {
    console.log('Seeding default downloads...');
    DownloadsTable.insert({
      fileName: "Panduan Sertifikasi Guru & Penilaian Kinerja Guru (PKG) 2026.pdf",
      filePath: "/uploads/panduan_pkg_2026.pdf",
      fileType: "pdf",
      fileSize: "2.4 MB",
      downloadCount: 145,
      date: "2026-06-25"
    });
    DownloadsTable.insert({
      fileName: "Formulir Pendaftaran Anggota Baru PGRI Cabang Pasirwangi.doc",
      filePath: "/uploads/formulir_anggota_pgri.doc",
      fileType: "doc",
      fileSize: "320 KB",
      downloadCount: 89,
      date: "2026-06-18"
    });
    DownloadsTable.insert({
      fileName: "Format Laporan Beban Kerja Guru (BKG) Mingguan.xls",
      filePath: "/uploads/bkg_report_format.xls",
      fileType: "xls",
      fileSize: "750 KB",
      downloadCount: 204,
      date: "2026-06-22"
    });
    DownloadsTable.insert({
      fileName: "Kumpulan Regulasi Perlindungan Hukum Guru Republik Indonesia.zip",
      filePath: "/uploads/regulasi_perlindungan_hukum_guru.zip",
      fileType: "zip",
      fileSize: "12.8 MB",
      downloadCount: 56,
      date: "2026-06-12"
    });

    // Create physical dummy files in uploads directory so that downloads do not fail completely
    const dummyPdfPath = path.join(UPLOADS_DIR, 'panduan_pkg_2026.pdf');
    const dummyDocPath = path.join(UPLOADS_DIR, 'formulir_anggota_pgri.doc');
    const dummyXlsPath = path.join(UPLOADS_DIR, 'bkg_report_format.xls');
    const dummyZipPath = path.join(UPLOADS_DIR, 'regulasi_perlindungan_hukum_guru.zip');

    if (!fs.existsSync(dummyPdfPath)) fs.writeFileSync(dummyPdfPath, 'Dummy PDF content for PGRI Pasirwangi');
    if (!fs.existsSync(dummyDocPath)) fs.writeFileSync(dummyDocPath, 'Dummy DOC content for PGRI Pasirwangi');
    if (!fs.existsSync(dummyXlsPath)) fs.writeFileSync(dummyXlsPath, 'Dummy XLS content for PGRI Pasirwangi');
    if (!fs.existsSync(dummyZipPath)) fs.writeFileSync(dummyZipPath, 'Dummy ZIP content for PGRI Pasirwangi');
  }

  // 8. Seed default settings (handled in SettingsStore.get())
  SettingsStoreInstance.get();

  // 9. Seed default profile (handled in ProfileStore.get())
  ProfileStoreInstance.get();

  // 10. Seed default kepengurusan list (we'll store kepengurusan in sliders or standard custom files. Let's create an elegant file `data/pengurus.json` or model inside db!)
  // Oh let's add a Pengurus table as well!
  // Let's declare interface and Table for Pengurus!
  console.log('Database verification and seeding complete!');
}

export interface Pengurus {
  id: number;
  name: string;
  jabatan: string;
  masaBakti: string;
  foto: string;
  orderIndex: number;
}
export const PengurusTable = new Table<Pengurus>('pengurus.json', 'pengurus');

// Check if we need to seed Pengurus
const pengurusList = PengurusTable.getAll();
if (pengurusList.length === 0) {
  console.log('Seeding default pengurus...');
  PengurusTable.insert({
    name: "Ahmad Sodikin, S.Pd., M.M.",
    jabatan: "Ketua Cabang",
    masaBakti: "2025 - 2030",
    foto: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=300&h=380&q=80",
    orderIndex: 1
  });
  PengurusTable.insert({
    name: "Hj. Mariah, S.Pd.",
    jabatan: "Wakil Ketua Cabang",
    masaBakti: "2025 - 2030",
    foto: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&h=380&q=80",
    orderIndex: 2
  });
  PengurusTable.insert({
    name: "Drs. Hermawan",
    jabatan: "Sekretaris Cabang",
    masaBakti: "2025 - 2030",
    foto: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&h=380&q=80",
    orderIndex: 3
  });
  PengurusTable.insert({
    name: "Euis Kartini, S.Pd.SD",
    jabatan: "Bendahara Cabang",
    masaBakti: "2025 - 2030",
    foto: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=300&h=380&q=80",
    orderIndex: 4
  });
  PengurusTable.insert({
    name: "Dadan Wildan, M.Pd.",
    jabatan: "Bidang Advokasi & Hukum",
    masaBakti: "2025 - 2030",
    foto: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=300&h=380&q=80",
    orderIndex: 5
  });
}
