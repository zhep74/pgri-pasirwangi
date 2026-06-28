export interface User {
  id: number;
  username: string;
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
  url: string;
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

export interface Pengurus {
  id: number;
  name: string;
  jabatan: string;
  masaBakti: string;
  foto: string;
  orderIndex: number;
}
