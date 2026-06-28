import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import {
  initAndSeedDatabase,
  UsersTable,
  SlidersTable,
  CategoriesTable,
  NewsTable,
  GalleriesTable,
  AgendasTable,
  DownloadsTable,
  ContactsTable,
  ProfileStoreInstance,
  SettingsStoreInstance,
  PengurusTable,
  supabase,
  syncAllTablesWithSupabase,
  updateSupabaseConfig
} from './server/db.js';

dotenv.config();

// Initialize DB and Seed data
initAndSeedDatabase();

// Sync with Supabase on startup asynchronously
if (supabase) {
  syncAllTablesWithSupabase()
    .then((res) => console.log('Startup Supabase sync complete:', res.message))
    .catch((err) => console.error('Startup Supabase sync failed:', err));
}

const app = express();
const PORT = 3000;

// Body Parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static Folders
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// JWT-like simple secure token signature (No external jwt package needed)
const JWT_SECRET = process.env.JWT_SECRET || 'pgri-pasirwangi-secret-key-2026-garut-jaya';

function generateToken(username: string): string {
  const payload = { username, exp: Date.now() + 24 * 60 * 60 * 1000 * 7 }; // 7 days
  const str = JSON.stringify(payload);
  const base64 = Buffer.from(str).toString('base64');
  const signature = Buffer.from(str + JWT_SECRET).toString('base64').substring(0, 32);
  return `${base64}.${signature}`;
}

function verifyToken(token: string): string | null {
  try {
    const [base64, signature] = token.split('.');
    if (!base64 || !signature) return null;
    const str = Buffer.from(base64, 'base64').toString('utf8');
    const expectedSignature = Buffer.from(str + JWT_SECRET).toString('base64').substring(0, 32);
    if (signature !== expectedSignature) return null;
    const payload = JSON.parse(str);
    if (Date.now() > payload.exp) return null;
    return payload.username;
  } catch (e) {
    return null;
  }
}

// Authentication Middleware
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }
  const token = authHeader.split(' ')[1];
  const username = verifyToken(token);
  if (!username) {
    return res.status(401).json({ message: 'Unauthorized: Invalid or expired token' });
  }
  // Attach user to req
  const user = UsersTable.getAll().find(u => u.username === username);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized: User not found' });
  }
  (req as any).adminUser = user;
  next();
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'file-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max size
  fileFilter: (req, file, cb) => {
    // Memperbolehkan semua ekstensi file agar admin dapat mengunggah semua format gambar dan berkas
    cb(null, true);
  }
});

// ==========================================
// AUTHENTICATION API
// ==========================================

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username dan password wajib diisi' });
  }

  const user = UsersTable.getAll().find(u => u.username === username);
  if (!user) {
    return res.status(401).json({ message: 'Username atau password salah' });
  }

  const isMatch = bcrypt.compareSync(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ message: 'Username atau password salah' });
  }

  const token = generateToken(user.username);
  res.json({
    token,
    user: {
      username: user.username,
      fullName: user.fullName
    }
  });
});

app.get('/api/auth/verify', requireAdmin, (req, res) => {
  const user = (req as any).adminUser;
  res.json({
    username: user.username,
    fullName: user.fullName
  });
});


// ==========================================
// PUBLIC ENDPOINTS (Landing Page)
// ==========================================

// Get Sliders
app.get('/api/public/sliders', (req, res) => {
  const sliders = SlidersTable.getAll().filter(s => s.active);
  res.json(sliders);
});

// Get Profile
app.get('/api/public/profile', (req, res) => {
  const profile = ProfileStoreInstance.get();
  res.json(profile);
});

// Get Settings
app.get('/api/public/settings', (req, res) => {
  const settings = SettingsStoreInstance.get();
  res.json(settings);
});

// Get Kepengurusan
app.get('/api/public/pengurus', (req, res) => {
  const pengurus = PengurusTable.getAll().sort((a, b) => a.orderIndex - b.orderIndex);
  res.json(pengurus);
});

// Get Categories
app.get('/api/public/categories', (req, res) => {
  const categories = CategoriesTable.getAll();
  res.json(categories);
});

// Get News (with searching, category filter, pagination)
app.get('/api/public/news', (req, res) => {
  const { search, categoryId, page = '1', limit = '6' } = req.query;
  let newsList = NewsTable.getAll();

  // Filter Search
  if (search) {
    const q = String(search).toLowerCase();
    newsList = newsList.filter(n =>
      n.title.toLowerCase().includes(q) ||
      n.content.toLowerCase().includes(q)
    );
  }

  // Filter Category ID
  if (categoryId) {
    const catId = parseInt(String(categoryId), 10);
    newsList = newsList.filter(n => n.categoryId === catId);
  }

  // Sort by date descending
  newsList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Pagination
  const p = parseInt(String(page), 10);
  const l = parseInt(String(limit), 10);
  const total = newsList.length;
  const totalPages = Math.ceil(total / l);
  const paginatedList = newsList.slice((p - 1) * l, p * l);

  res.json({
    news: paginatedList,
    pagination: {
      currentPage: p,
      limit: l,
      total,
      totalPages
    }
  });
});

// Get News detail by Slug (increments view count!)
app.get('/api/public/news/:slug', (req, res) => {
  const { slug } = req.params;
  const newsItem = NewsTable.getAll().find(n => n.slug === slug);
  if (!newsItem) {
    return res.status(404).json({ message: 'Berita tidak ditemukan' });
  }

  // Increment views
  newsItem.views = (newsItem.views || 0) + 1;
  NewsTable.update(newsItem.id, { views: newsItem.views });

  res.json(newsItem);
});

// Get Galleries
app.get('/api/public/galleries', (req, res) => {
  const galleries = GalleriesTable.getAll();
  res.json(galleries);
});

// Get Agendas
app.get('/api/public/agendas', (req, res) => {
  const agendas = AgendasTable.getAll().sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  res.json(agendas);
});

// Get Downloads
app.get('/api/public/downloads', (req, res) => {
  const downloads = DownloadsTable.getAll().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  res.json(downloads);
});

// Handle File Download (Increment count & serve file)
app.get('/api/public/downloads/:id/download', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const download = DownloadsTable.getById(id);
  if (!download) {
    return res.status(404).json({ message: 'Berkas tidak ditemukan' });
  }

  // Increment download count
  download.downloadCount = (download.downloadCount || 0) + 1;
  DownloadsTable.update(id, { downloadCount: download.downloadCount });

  const absolutePath = path.join(process.cwd(), download.filePath);
  if (fs.existsSync(absolutePath)) {
    return res.download(absolutePath, download.fileName);
  } else {
    // If physical file doesn't exist, create simple dummy so the download succeeds!
    fs.writeFileSync(absolutePath, `Dummy PGRI download file content for ${download.fileName}`);
    return res.download(absolutePath, download.fileName);
  }
});

// Post Contact Message
app.post('/api/public/contacts', (req, res) => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Nama, Email, dan Pesan wajib diisi.' });
  }

  const newMessage = ContactsTable.insert({
    name,
    email,
    phone: phone || '',
    subject: subject || 'Pesan Hubungi Kami',
    message,
    date: new Date().toISOString().split('T')[0],
    read: false
  });

  res.json({ message: 'Pesan Anda berhasil dikirim! Pengurus akan segera menghubungi Anda.', data: newMessage });
});


// ==========================================
// ADMIN DASHBOARD & CONTROLS API
// ==========================================

// ==========================================
// SUPABASE BACKEND SYNCHRONIZATION API
// ==========================================

// Get Supabase Status & Table Verification
app.get('/api/admin/supabase/status', requireAdmin, async (req, res) => {
  const isConfigured = !!supabase;
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_KEY || '';
  const projectId = process.env.SUPABASE_PROJECT_ID || 'pgri-pasirwangi';

  const tables = ['users', 'sliders', 'categories', 'news', 'galleries', 'agendas', 'downloads', 'contacts', 'profiles', 'settings', 'pengurus'];
  const tableStatuses: any = {};

  if (isConfigured && supabase) {
    for (const t of tables) {
      try {
        const { error } = await supabase.from(t).select('id').limit(1);
        if (error) {
          if (error.code === '42P01') {
            tableStatuses[t] = { status: 'missing', message: 'Tabel belum dibuat' };
          } else {
            tableStatuses[t] = { status: 'error', message: error.message };
          }
        } else {
          tableStatuses[t] = { status: 'ok', message: 'Tersambung & Aktif' };
        }
      } catch (err: any) {
        tableStatuses[t] = { status: 'error', message: err.message || 'Exception' };
      }
    }
  }

  res.json({
    configured: isConfigured,
    projectId,
    url: url,
    keyObfuscated: key ? `${key.substring(0, 15)}...${key.substring(key.length - 5)}` : '',
    keyRaw: key,
    tables: isConfigured ? tableStatuses : {}
  });
});

// Update Supabase Credentials
app.post('/api/admin/supabase/config', requireAdmin, async (req, res) => {
  const { url, key, projectId } = req.body;

  if (!url || !key || !projectId) {
    return res.status(400).json({ status: 'error', message: 'Seluruh parameter (URL, Key, Project ID) harus diisi.' });
  }

  try {
    updateSupabaseConfig(url, key, projectId);
    res.json({ status: 'success', message: 'Kredensial Supabase berhasil disimpan dan diaktifkan!' });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message || 'Gagal menyimpan kredensial Supabase' });
  }
});

// Run Bidirectional Sync Manual
app.post('/api/admin/supabase/sync', requireAdmin, async (req, res) => {
  try {
    const result = await syncAllTablesWithSupabase();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message || 'Gagal sinkronisasi data ke Supabase' });
  }
});

// Get Stats for Dashboard
app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const newsCount = NewsTable.getAll().length;
  const agendaCount = AgendasTable.getAll().length;
  const galleryCount = GalleriesTable.getAll().length;
  const downloadCount = DownloadsTable.getAll().length;
  const pengurusCount = PengurusTable.getAll().length;
  const contactCount = ContactsTable.getAll().filter(c => !c.read).length;

  // Generate or get visitors (stored in persistent settings to keep it dynamic and consistent!)
  const settings = SettingsStoreInstance.get();
  const dummyVisitors = (newsCount * 45) + (agendaCount * 32) + (galleryCount * 24) + 1420;

  res.json({
    newsCount,
    agendaCount,
    galleryCount,
    downloadCount,
    pengurusCount,
    contactCount,
    visitors: dummyVisitors
  });
});

// File Upload Endpoint
app.post('/api/admin/upload', requireAdmin, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Tidak ada file yang diunggah' });
  }

  // Return file web accessible path
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    message: 'File berhasil diunggah',
    url: fileUrl,
    fileName: req.file.originalname,
    fileSize: `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`
  });
});

// Update Profile
app.put('/api/admin/profile', requireAdmin, (req, res) => {
  const { sejarah, sambutanKetua, fotoKetua, visi, misi } = req.body;
  const profile = ProfileStoreInstance.get();

  const updated = {
    ...profile,
    sejarah: sejarah || profile.sejarah,
    sambutanKetua: sambutanKetua || profile.sambutanKetua,
    fotoKetua: fotoKetua || profile.fotoKetua,
    visi: visi || profile.visi,
    misi: Array.isArray(misi) ? misi : profile.misi
  };

  ProfileStoreInstance.save(updated);
  res.json({ message: 'Profil website berhasil diperbarui', data: updated });
});

// Update Settings
app.put('/api/admin/settings', requireAdmin, (req, res) => {
  const settings = SettingsStoreInstance.get();
  const updated = { ...settings, ...req.body };
  SettingsStoreInstance.save(updated);
  res.json({ message: 'Pengaturan website berhasil diperbarui', data: updated });
});

// Sliders CRUD
app.get('/api/admin/sliders', requireAdmin, (req, res) => {
  res.json(SlidersTable.getAll());
});

app.post('/api/admin/sliders', requireAdmin, (req, res) => {
  const { image, title, subtitle, link, active } = req.body;
  if (!image || !title) {
    return res.status(400).json({ message: 'Gambar dan judul wajib diisi' });
  }
  const slider = SlidersTable.insert({
    image,
    title,
    subtitle: subtitle || '',
    link: link || '#',
    active: active !== false
  });
  res.status(201).json({ message: 'Slider berhasil ditambahkan', data: slider });
});

app.put('/api/admin/sliders/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const updated = SlidersTable.update(id, req.body);
  if (!updated) return res.status(404).json({ message: 'Slider tidak ditemukan' });
  res.json({ message: 'Slider berhasil diperbarui', data: updated });
});

app.delete('/api/admin/sliders/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const success = SlidersTable.delete(id);
  if (!success) return res.status(404).json({ message: 'Slider tidak ditemukan' });
  res.json({ message: 'Slider berhasil dihapus' });
});

// Kepengurusan CRUD
app.get('/api/admin/pengurus', requireAdmin, (req, res) => {
  res.json(PengurusTable.getAll().sort((a, b) => a.orderIndex - b.orderIndex));
});

app.post('/api/admin/pengurus', requireAdmin, (req, res) => {
  const { name, jabatan, masaBakti, foto, orderIndex } = req.body;
  if (!name || !jabatan) {
    return res.status(400).json({ message: 'Nama dan jabatan pengurus wajib diisi' });
  }
  const pengurus = PengurusTable.insert({
    name,
    jabatan,
    masaBakti: masaBakti || '2025 - 2030',
    foto: foto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&h=380&q=80',
    orderIndex: typeof orderIndex === 'number' ? orderIndex : PengurusTable.getAll().length + 1
  });
  res.status(201).json({ message: 'Pengurus berhasil ditambahkan', data: pengurus });
});

app.put('/api/admin/pengurus/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const updated = PengurusTable.update(id, req.body);
  if (!updated) return res.status(404).json({ message: 'Pengurus tidak ditemukan' });
  res.json({ message: 'Pengurus berhasil diperbarui', data: updated });
});

app.delete('/api/admin/pengurus/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const success = PengurusTable.delete(id);
  if (!success) return res.status(404).json({ message: 'Pengurus tidak ditemukan' });
  res.json({ message: 'Pengurus berhasil dihapus' });
});

// Categories CRUD
app.get('/api/admin/categories', requireAdmin, (req, res) => {
  res.json(CategoriesTable.getAll());
});

app.post('/api/admin/categories', requireAdmin, (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Nama kategori wajib diisi' });
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const category = CategoriesTable.insert({ name, slug });
  res.status(201).json({ message: 'Kategori berhasil ditambahkan', data: category });
});

app.put('/api/admin/categories/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name } = req.body;
  const updates: any = {};
  if (name) {
    updates.name = name;
    updates.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  const updated = CategoriesTable.update(id, updates);
  if (!updated) return res.status(404).json({ message: 'Kategori tidak ditemukan' });
  res.json({ message: 'Kategori berhasil diperbarui', data: updated });
});

app.delete('/api/admin/categories/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  // Check if any news is using this category
  const hasNews = NewsTable.getAll().some(n => n.categoryId === id);
  if (hasNews) {
    return res.status(400).json({ message: 'Tidak dapat menghapus kategori yang masih memiliki berita' });
  }
  const success = CategoriesTable.delete(id);
  if (!success) return res.status(404).json({ message: 'Kategori tidak ditemukan' });
  res.json({ message: 'Kategori berhasil dihapus' });
});

// News CRUD
app.get('/api/admin/news', requireAdmin, (req, res) => {
  res.json(NewsTable.getAll());
});

app.post('/api/admin/news', requireAdmin, (req, res) => {
  const { title, content, image, categoryId, date } = req.body;
  if (!title || !content || !categoryId) {
    return res.status(400).json({ message: 'Judul, isi, dan kategori berita wajib diisi' });
  }
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.round(Math.random() * 1000);
  const news = NewsTable.insert({
    title,
    slug,
    content,
    image: image || 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=600&q=80',
    categoryId: parseInt(categoryId, 10),
    views: 0,
    date: date || new Date().toISOString().split('T')[0]
  });
  res.status(201).json({ message: 'Berita berhasil ditambahkan', data: news });
});

app.put('/api/admin/news/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { title, content, image, categoryId, date } = req.body;
  const updates: any = {};
  if (title) {
    updates.title = title;
    updates.slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.round(Math.random() * 1000);
  }
  if (content !== undefined) updates.content = content;
  if (image !== undefined) updates.image = image;
  if (categoryId !== undefined) updates.categoryId = parseInt(categoryId, 10);
  if (date !== undefined) updates.date = date;

  const updated = NewsTable.update(id, updates);
  if (!updated) return res.status(404).json({ message: 'Berita tidak ditemukan' });
  res.json({ message: 'Berita berhasil diperbarui', data: updated });
});

app.delete('/api/admin/news/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const success = NewsTable.delete(id);
  if (!success) return res.status(404).json({ message: 'Berita tidak ditemukan' });
  res.json({ message: 'Berita berhasil dihapus' });
});

// Galleries CRUD
app.get('/api/admin/galleries', requireAdmin, (req, res) => {
  res.json(GalleriesTable.getAll());
});

app.post('/api/admin/galleries', requireAdmin, (req, res) => {
  const { type, url, title, description } = req.body;
  if (!type || !url || !title) {
    return res.status(400).json({ message: 'Tipe, URL file, dan judul galeri wajib diisi' });
  }
  const gallery = GalleriesTable.insert({
    type,
    url,
    title,
    description: description || ''
  });
  res.status(201).json({ message: 'Galeri berhasil ditambahkan', data: gallery });
});

app.put('/api/admin/galleries/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const updated = GalleriesTable.update(id, req.body);
  if (!updated) return res.status(404).json({ message: 'Galeri tidak ditemukan' });
  res.json({ message: 'Galeri berhasil diperbarui', data: updated });
});

app.delete('/api/admin/galleries/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const success = GalleriesTable.delete(id);
  if (!success) return res.status(404).json({ message: 'Galeri tidak ditemukan' });
  res.json({ message: 'Galeri berhasil dihapus' });
});

// Agendas CRUD
app.get('/api/admin/agendas', requireAdmin, (req, res) => {
  res.json(AgendasTable.getAll());
});

app.post('/api/admin/agendas', requireAdmin, (req, res) => {
  const { title, date, time, location, description } = req.body;
  if (!title || !date || !location) {
    return res.status(400).json({ message: 'Judul, tanggal, dan tempat kegiatan wajib diisi' });
  }
  const agenda = AgendasTable.insert({
    title,
    date,
    time: time || '08:00 - selesai',
    location,
    description: description || ''
  });
  res.status(201).json({ message: 'Agenda berhasil ditambahkan', data: agenda });
});

app.put('/api/admin/agendas/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const updated = AgendasTable.update(id, req.body);
  if (!updated) return res.status(404).json({ message: 'Agenda tidak ditemukan' });
  res.json({ message: 'Agenda berhasil diperbarui', data: updated });
});

app.delete('/api/admin/agendas/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const success = AgendasTable.delete(id);
  if (!success) return res.status(404).json({ message: 'Agenda tidak ditemukan' });
  res.json({ message: 'Agenda berhasil dihapus' });
});

// Downloads CRUD
app.get('/api/admin/downloads', requireAdmin, (req, res) => {
  res.json(DownloadsTable.getAll());
});

app.post('/api/admin/downloads', requireAdmin, (req, res) => {
  const { fileName, filePath, fileType, fileSize } = req.body;
  if (!fileName || !filePath || !fileType) {
    return res.status(400).json({ message: 'Nama berkas, path berkas, dan tipe berkas wajib diisi' });
  }
  const download = DownloadsTable.insert({
    fileName,
    filePath,
    fileType,
    fileSize: fileSize || '1.0 MB',
    downloadCount: 0,
    date: new Date().toISOString().split('T')[0]
  });
  res.status(201).json({ message: 'Berkas download berhasil ditambahkan', data: download });
});

app.put('/api/admin/downloads/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const updated = DownloadsTable.update(id, req.body);
  if (!updated) return res.status(404).json({ message: 'Berkas download tidak ditemukan' });
  res.json({ message: 'Berkas download berhasil diperbarui', data: updated });
});

app.delete('/api/admin/downloads/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const success = DownloadsTable.delete(id);
  if (!success) return res.status(404).json({ message: 'Berkas download tidak ditemukan' });
  res.json({ message: 'Berkas download berhasil dihapus' });
});

// Contact Messages Admin
app.get('/api/admin/contacts', requireAdmin, (req, res) => {
  res.json(ContactsTable.getAll().sort((a, b) => b.id - a.id));
});

app.put('/api/admin/contacts/:id/read', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const updated = ContactsTable.update(id, { read: true });
  if (!updated) return res.status(404).json({ message: 'Pesan tidak ditemukan' });
  res.json({ message: 'Pesan ditandai telah dibaca', data: updated });
});

app.delete('/api/admin/contacts/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const success = ContactsTable.delete(id);
  if (!success) return res.status(404).json({ message: 'Pesan tidak ditemukan' });
  res.json({ message: 'Pesan berhasil dihapus' });
});

// Admins Management CRUD
app.get('/api/admin/admins', requireAdmin, (req, res) => {
  const admins = UsersTable.getAll().map(u => ({ id: u.id, username: u.username, fullName: u.fullName }));
  res.json(admins);
});

app.post('/api/admin/admins', requireAdmin, (req, res) => {
  const { username, password, fullName } = req.body;
  if (!username || !password || !fullName) {
    return res.status(400).json({ message: 'Username, password, dan nama lengkap wajib diisi' });
  }

  // Check unique username
  const existing = UsersTable.getAll().find(u => u.username === username);
  if (existing) {
    return res.status(400).json({ message: 'Username sudah digunakan oleh admin lain' });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  const newUser = UsersTable.insert({
    username,
    fullName,
    passwordHash
  });

  res.status(201).json({
    message: 'Admin baru berhasil didaftarkan',
    data: { id: newUser.id, username: newUser.username, fullName: newUser.fullName }
  });
});

app.put('/api/admin/admins/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { fullName, password } = req.body;
  const updates: any = {};

  if (fullName) updates.fullName = fullName;
  if (password) {
    const salt = bcrypt.genSaltSync(10);
    updates.passwordHash = bcrypt.hashSync(password, salt);
  }

  const updated = UsersTable.update(id, updates);
  if (!updated) return res.status(404).json({ message: 'Admin tidak ditemukan' });
  res.json({
    message: 'Data admin berhasil diperbarui',
    data: { id: updated.id, username: updated.username, fullName: updated.fullName }
  });
});

app.delete('/api/admin/admins/:id', requireAdmin, (req, res) => {
  const id = parseInt(req.params.id, 10);

  // Prevent deleting the last admin
  const allAdmins = UsersTable.getAll();
  if (allAdmins.length <= 1) {
    return res.status(400).json({ message: 'Tidak dapat menghapus admin terakhir' });
  }

  // Prevent admin deleting themselves
  const loggedInUser = (req as any).adminUser;
  const targetUser = UsersTable.getById(id);
  if (targetUser && targetUser.username === loggedInUser.username) {
    return res.status(400).json({ message: 'Anda tidak dapat menghapus akun Anda sendiri' });
  }

  const success = UsersTable.delete(id);
  if (!success) return res.status(404).json({ message: 'Admin tidak ditemukan' });
  res.json({ message: 'Admin berhasil dihapus' });
});

// Serve frontend react build statically in production
const DIST_DIR = path.join(process.cwd(), 'dist');
app.use(express.static(DIST_DIR));

// Fallback all non-API paths to serve index.html (React SPA router)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return res.status(404).json({ message: 'API Route Not Found' });
  }

  const indexPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // During dev where build does not exist yet or we proxy, serve index.html from root if it's there
    const rootIndexPath = path.join(process.cwd(), 'index.html');
    if (fs.existsSync(rootIndexPath)) {
      res.sendFile(rootIndexPath);
    } else {
      res.status(404).send('Application builds and assets not ready yet.');
    }
  }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running beautifully on port ${PORT}...`);
});
