const KEY = 'ccna-library-favorites-v1';

export function libraryFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  } catch { return []; }
}

export function toggleLibraryFavorite(id: string): string[] {
  const current = libraryFavorites();
  const next = current.includes(id) ? current.filter(item => item !== id) : [...current, id];
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event('ccna-library-favorites-changed'));
  return next;
}
