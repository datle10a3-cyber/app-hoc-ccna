import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  } catch {
    return dateString;
  }
}

export function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc ảnh.'));
    reader.onload = () => {
      const original = reader.result;
      if (typeof original !== 'string') return reject(new Error('Không thể đọc ảnh.'));
      if (file.size <= 700 * 1024 || file.type === 'image/svg+xml' || file.type === 'image/gif') return resolve(original);

      const image = new Image();
      image.onerror = () => resolve(original);
      image.onload = () => {
        try {
          const scale = Math.min(1, 2200 / Math.max(image.width, image.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          const context = canvas.getContext('2d');
          if (!context) return resolve(original);
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          const optimized = canvas.toDataURL('image/webp', 0.9);
          resolve(optimized.startsWith('data:image/webp') && optimized.length < original.length ? optimized : original);
        } catch {
          resolve(original);
        }
      };
      image.src = original;
    };
    reader.readAsDataURL(file);
  });
}

export function handleClipboardImagePaste(
  e: React.ClipboardEvent,
  onImagePasted: (dataUrl: string) => void
): boolean {
  const items = e.clipboardData?.items;
  if (!items) return false;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.indexOf('image') !== -1) {
      e.preventDefault();
      const file = item.getAsFile();
      if (!file) continue;

      readImageFile(file).then(onImagePasted).catch(error => console.error(error));
      return true;
    }
  }
  return false;
}

export function stripImageTagsFromText(text: string): string {
  if (!text) return '';
  if (text.startsWith('<!--ccna-rich-doc:v1-->')) {
    return text.replace(/^<!--ccna-rich-doc:v1-->/, '')
      .replace(/<img\b[^>]*>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&(?:nbsp|#160);/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/\s+/g, ' ').trim();
  }
  return text
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '')
    .replace(/data:image\/[a-zA-Z0-9+\/=+]+;base64,[A-Za-z0-9+\/=]+/g, '')
    .trim();
}



