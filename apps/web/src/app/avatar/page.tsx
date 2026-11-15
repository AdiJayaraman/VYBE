'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import {
  ACCESSORY_LABELS,
  AVATAR_PRESETS,
  AVATAR_SURFACE_COLORS,
  BOTTOM_LABELS,
  HAIR_COLOR_SWATCHES,
  HAIR_STYLE_LABELS,
  OUTFIT_COLOR_SWATCHES,
  SHOES_LABELS,
  SKIN_TONE_LABELS,
  TOP_LABELS,
} from '@vybe/3d-core';
import {
  ACCESSORY_IDS,
  BOTTOM_IDS,
  DEFAULT_AVATAR_CONFIG,
  HAIR_STYLE_IDS,
  SHOES_IDS,
  SKIN_TONES,
  TOP_IDS,
  type AvatarConfig,
} from '@vybe/shared-types';
import { api } from '@/lib/api';
import { useSession } from '@/lib/session';

const AvatarPreview = dynamic(() => import('@/components/avatar/AvatarPreview'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-vybe-background text-[11px] uppercase tracking-[0.24em] text-vybe-text-secondary">
      loading rig…
    </div>
  ),
});

type ColorField = 'hairColor' | 'topColor' | 'bottomColor' | 'accessoryColor';

interface SwatchRowProps {
  label: string;
  colors: readonly string[];
  value: string;
  onSelect: (color: string) => void;
}

function SwatchRow({ label, colors, value, onSelect }: SwatchRowProps) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-vybe-text-secondary/80">
        {label}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {colors.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onSelect(color)}
            aria-label={`${label} ${color}`}
            className={`h-6 w-6 rounded-full border transition ${
              value.toLowerCase() === color.toLowerCase()
                ? 'border-vybe-accent ring-2 ring-vybe-accent/40'
                : 'border-white/15 hover:border-white/40'
            }`}
            style={{ background: color }}
          />
        ))}
        <label className="flex h-6 cursor-pointer items-center gap-1 rounded-full border border-vybe-border px-2 text-[9px] uppercase tracking-[0.14em] text-vybe-text-secondary">
          custom
          <input
            type="color"
            value={value}
            onChange={(event) => onSelect(event.target.value)}
            className="h-3.5 w-3.5 cursor-pointer rounded border-0 bg-transparent p-0"
          />
        </label>
      </div>
    </div>
  );
}

interface OptionRowProps<T extends string> {
  label: string;
  options: readonly T[];
  labels: Record<T, string>;
  value: T;
  onSelect: (value: T) => void;
}

function OptionRow<T extends string>({ label, options, labels, value, onSelect }: OptionRowProps<T>) {
  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-vybe-text-secondary/80">
        {label}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            className={`rounded-lg border px-2.5 py-1 text-[10px] font-semibold transition ${
              value === option
                ? 'border-vybe-primary bg-vybe-primary/20 text-vybe-text-primary'
                : 'border-vybe-border bg-white/[0.02] text-vybe-text-secondary hover:border-vybe-primary/40'
            }`}
          >
            {labels[option]}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AvatarStudioPage() {
  const { user, token, setUser, status } = useSession();
  const [config, setConfig] = useState<AvatarConfig>(user?.avatarConfig ?? DEFAULT_AVATAR_CONFIG);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (user) {
      setConfig(user.avatarConfig);
      setDirty(false);
    }
  }, [user]);

  const patch = (partial: Partial<AvatarConfig>): void => {
    setConfig((current) => ({ ...current, ...partial }));
    setDirty(true);
    setMessage(null);
  };

  const setColor = (field: ColorField, color: string): void => {
    patch({ [field]: color } as Pick<AvatarConfig, ColorField>);
  };

  const handleSave = async (): Promise<void> => {
    if (!token || saving) return;
    setSaving(true);
    setError(null);
    try {
      const profile = await api.updateAvatar(token, config);
      setUser(profile);
      setDirty(false);
      setMessage('Avatar saved to your VYBE profile');
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Could not save your avatar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
            Avatar{' '}
            <span className="bg-gradient-to-r from-vybe-primary to-vybe-accent bg-clip-text text-transparent">
              Studio
            </span>
          </h1>
          <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-vybe-text-secondary">
            modular rig · skin, hair, outfit, neon accessories
          </p>
        </div>
        <div className="flex items-center gap-2">
          {message ? <span className="text-[11px] text-vybe-success">{message}</span> : null}
          {error ? <span className="text-[11px] text-vybe-danger">{error}</span> : null}
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!dirty || saving || !token}
            className="btn-primary"
          >
            {saving ? 'Saving…' : dirty ? 'Save avatar' : 'Saved'}
          </button>
        </div>
      </header>

      {status === 'error' ? (
        <div className="glass-panel mb-4 rounded-2xl border-vybe-danger/40 p-4 text-[11px] text-vybe-text-secondary">
          The API is offline, so avatars cannot be saved. Start the API + database, then reload.
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="glass-panel relative h-[440px] overflow-hidden rounded-2xl lg:h-[620px]">
          <AvatarPreview config={config} displayName={user?.displayName} />
          <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-1.5">
            <span className="hud-chip pointer-events-auto border-vybe-accent/40 text-vybe-accent">
              <span className="live-dot" /> live rig
            </span>
            <span className="hud-chip pointer-events-auto">drag to orbit</span>
          </div>
          <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex flex-wrap gap-1.5">
            {AVATAR_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setConfig(preset.config);
                  setDirty(true);
                  setMessage(null);
                }}
                className="pointer-events-auto rounded-lg border border-vybe-border bg-vybe-surface/80 px-2.5 py-1 text-[10px] font-semibold text-vybe-text-secondary backdrop-blur transition hover:border-vybe-primary/60 hover:text-vybe-text-primary"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-panel flex flex-col gap-4 overflow-y-auto rounded-2xl p-4 lg:max-h-[620px]">
          <OptionRow
            label="skin tone"
            options={SKIN_TONES}
            labels={SKIN_TONE_LABELS}
            value={config.skinTone}
            onSelect={(skinTone) => patch({ skinTone })}
          />

          <div className="flex flex-wrap gap-1.5">
            {Object.entries(AVATAR_SURFACE_COLORS).map(([tone, color]) => (
              <button
                key={tone}
                type="button"
                onClick={() => patch({ skinTone: tone as AvatarConfig['skinTone'] })}
                className={`h-7 w-7 rounded-full border transition ${
                  config.skinTone === tone
                    ? 'border-vybe-accent ring-2 ring-vybe-accent/40'
                    : 'border-white/15'
                }`}
                style={{ background: color }}
                aria-label={tone}
              />
            ))}
          </div>

          <OptionRow
            label="hair style"
            options={HAIR_STYLE_IDS}
            labels={HAIR_STYLE_LABELS}
            value={config.hairStyleId}
            onSelect={(hairStyleId) => patch({ hairStyleId })}
          />
          <SwatchRow
            label="hair color"
            colors={HAIR_COLOR_SWATCHES}
            value={config.hairColor}
            onSelect={(color) => setColor('hairColor', color)}
          />

          <OptionRow
            label="top"
            options={TOP_IDS}
            labels={TOP_LABELS}
            value={config.topId}
            onSelect={(topId) => patch({ topId })}
          />
          <SwatchRow
            label="top color"
            colors={OUTFIT_COLOR_SWATCHES}
            value={config.topColor}
            onSelect={(color) => setColor('topColor', color)}
          />

          <OptionRow
            label="bottom"
            options={BOTTOM_IDS}
            labels={BOTTOM_LABELS}
            value={config.bottomId}
            onSelect={(bottomId) => patch({ bottomId })}
          />
          <SwatchRow
            label="bottom color"
            colors={OUTFIT_COLOR_SWATCHES}
            value={config.bottomColor}
            onSelect={(color) => setColor('bottomColor', color)}
          />

          <OptionRow
            label="shoes"
            options={SHOES_IDS}
            labels={SHOES_LABELS}
            value={config.shoesId}
            onSelect={(shoesId) => patch({ shoesId })}
          />

          <OptionRow
            label="neon accessory"
            options={ACCESSORY_IDS}
            labels={ACCESSORY_LABELS}
            value={config.accessoryId}
            onSelect={(accessoryId) => patch({ accessoryId })}
          />
          <SwatchRow
            label="accessory glow"
            colors={HAIR_COLOR_SWATCHES}
            value={config.accessoryColor}
            onSelect={(color) => setColor('accessoryColor', color)}
          />
        </div>
      </div>
    </div>
  );
}
