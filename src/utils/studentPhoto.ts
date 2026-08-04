import { API_CONFIG } from '../config/api';

export const getStudentPhotoCandidates = (s: Record<string, unknown>): string[] => {
  const raw =
    s?.photoUrl ||
    s?.photo_url ||
    s?.photoURL ||
    s?.passportPhoto ||
    s?.passport_photo ||
    s?.passport;

  if (!raw || typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];

  if (/^data:image\//i.test(trimmed) || /^https?:\/\//i.test(trimmed)) return [trimmed];

  let apiOrigin = '';
  try {
    apiOrigin = API_CONFIG?.BASE_URL ? new URL(API_CONFIG.BASE_URL).origin : '';
  } catch {
    apiOrigin = '';
  }
  const appOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed.replace(/^\/+/, '')}`;

  const candidates = [
    appOrigin ? `${appOrigin}${normalizedPath}` : '',
    apiOrigin ? `${apiOrigin}${normalizedPath}` : '',
    trimmed,
  ].filter(Boolean);

  return Array.from(new Set(candidates));
};

export const handleStudentPhotoError = (e: React.SyntheticEvent<HTMLImageElement>, s: Record<string, unknown>) => {
  const img = e.currentTarget;
  const candidates = getStudentPhotoCandidates(s);
  const idx = Number(img.dataset.candidateIdx || '0');
  const nextIdx = idx + 1;
  if (nextIdx < candidates.length) {
    img.dataset.candidateIdx = String(nextIdx);
    img.src = candidates[nextIdx];
  }
};
