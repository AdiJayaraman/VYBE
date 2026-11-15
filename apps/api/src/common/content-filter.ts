import { BadRequestException } from '@nestjs/common';

/** Heuristic guard rails. Cheap, deterministic, and runs before anything persists. */
const BLOCKED_PHRASES = [
  'free crypto',
  'crypto giveaway',
  'double your bitcoin',
  'onlyfans',
  'sell nudes',
  'escort service',
  'viagra',
  'casino bonus',
  'loan offer',
  'work from home earn',
];

const LINK_PATTERN = /https?:\/\/\S+/gi;

export interface ModerationVerdict {
  allowed: boolean;
  reason: string | null;
}

export function moderateContent(raw: string): ModerationVerdict {
  const text = raw.trim();
  if (text.length === 0) return { allowed: true, reason: null };

  if (/[\u200b-\u200d\u2060\ufeff]/.test(text)) {
    return { allowed: false, reason: 'Hidden characters are not allowed' };
  }

  const links = text.match(LINK_PATTERN) ?? [];
  if (links.length > 2) {
    return { allowed: false, reason: 'Too many links — that looks like spam' };
  }

  if (/(.)\1{11,}/.test(text)) {
    return { allowed: false, reason: 'Repeated-character spam detected' };
  }

  const lower = text.toLowerCase();
  const phrase = BLOCKED_PHRASES.find((term) => lower.includes(term));
  if (phrase) {
    return { allowed: false, reason: 'That message contains a blocked phrase' };
  }

  const letters = text.replace(/[^A-Za-z]/g, '');
  const capitals = text.replace(/[^A-Z]/g, '');
  if (letters.length >= 24 && capitals.length / letters.length > 0.8) {
    return { allowed: false, reason: 'Please avoid all-caps shouting' };
  }

  return { allowed: true, reason: null };
}

export function assertCleanContent(raw: string): void {
  const verdict = moderateContent(raw);
  if (!verdict.allowed) {
    throw new BadRequestException(verdict.reason ?? 'Blocked by moderation');
  }
}
