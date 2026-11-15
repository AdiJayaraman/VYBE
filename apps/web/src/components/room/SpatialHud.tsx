'use client';

import Link from 'next/link';
import { useState } from 'react';
import { neonPalette } from '@vybe/ui';
import type {
  ChatMessageEvent,
  EmoteType,
  ModelType,
  RoomLayoutSuggestion,
  RoomParticipant,
} from '@vybe/shared-types';
import { timeAgo } from '@/lib/format';
import type { VoiceRoomApi } from '@/lib/useVoiceRoom';

const EMOTES: { id: EmoteType; label: string; glyph: string }[] = [
  { id: 'wave', label: 'Wave', glyph: '👋' },
  { id: 'dance', label: 'Dance', glyph: '🕺' },
  { id: 'sit', label: 'Sit', glyph: '🪑' },
  { id: 'cyber_pulse', label: 'Cyber Pulse', glyph: '⚡' },
];

const PROPS: { id: ModelType; label: string }[] = [
  { id: 'sofa', label: 'Sofa' },
  { id: 'table', label: 'Table' },
  { id: 'arcade', label: 'Arcade' },
  { id: 'neon_sign', label: 'Neon Sign' },
  { id: 'portal', label: 'Portal' },
];

export interface SpatialHudProps {
  roomName: string;
  themeTag: string;
  connected: boolean;
  participants: RoomParticipant[];
  messages: ChatMessageEvent[];
  selfId: string;
  onSendChat: (content: string) => Promise<boolean>;
  onEmote: (emote: EmoteType) => void;
  onSpawnProp: (modelType: ModelType) => void;
  onGenerateLayout: (prompt: string) => Promise<RoomLayoutSuggestion | null>;
  voice: VoiceRoomApi;
  onLeave: () => void;
}

export function SpatialHud({
  roomName,
  themeTag,
  connected,
  participants,
  messages,
  selfId,
  onSendChat,
  onEmote,
  onSpawnProp,
  onGenerateLayout,
  voice,
  onLeave,
}: SpatialHudProps) {
  const [chatOpen, setChatOpen] = useState(true);
  const [draft, setDraft] = useState('');
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('Cyberpunk lo-fi chill lounge with neon sofas and an arcade corner');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState<string | null>(null);

  const toggleVoice = (): void => {
    if (voice.status === 'connected') {
      voice.leave();
      return;
    }
    void voice.join();
  };

  const sendChat = async (): Promise<void> => {
    const content = draft.trim();
    if (!content) return;
    const ok = await onSendChat(content);
    if (ok) setDraft('');
  };

  const generate = async (): Promise<void> => {
    if (aiBusy || aiPrompt.trim().length < 6) return;
    setAiBusy(true);
    setAiResult(null);
    try {
      const suggestion = await onGenerateLayout(aiPrompt.trim());
      if (suggestion) {
        setAiResult(`${suggestion.summary} (${suggestion.source}, ${suggestion.props.length} props)`);
      } else {
        setAiResult('Layout generation failed — try a different prompt.');
      }
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3 sm:p-4">
      {/* Top bar */}
      <div className="glass-panel pointer-events-auto flex flex-wrap items-center gap-3 rounded-2xl px-3 py-2.5 sm:px-4">
        <Link
          href="/"
          onClick={onLeave}
          className="rounded-lg border border-vybe-border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-vybe-text-secondary transition hover:border-vybe-primary/60 hover:text-vybe-text-primary"
        >
          ← Exit
        </Link>

        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-vybe-text-primary">{roomName}</p>
          <p className="text-[9px] uppercase tracking-[0.22em] text-vybe-accent">{themeTag}</p>
        </div>

        <span className={`hud-chip ${connected ? 'border-vybe-accent/40 text-vybe-accent' : 'text-vybe-danger'}`}>
          {connected ? <span className="live-dot" /> : null}
          {connected ? `${participants.length} live` : 'reconnecting'}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {voice.status === 'connected' ? (
            <button
              type="button"
              onClick={() => void voice.toggleMute()}
              className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] transition ${
                voice.muted
                  ? 'border-vybe-border text-vybe-text-secondary hover:border-vybe-accent/40'
                  : 'border-vybe-accent/60 bg-vybe-accent/15 text-vybe-accent'
              }`}
            >
              {voice.muted ? '🔇 mic muted' : '🎙️ mic live'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={toggleVoice}
            disabled={voice.status === 'connecting'}
            title={voice.error ?? 'Proximity voice powered by LiveKit'}
            className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] transition ${
              voice.status === 'connected'
                ? 'border-vybe-accent/60 bg-vybe-accent/15 text-vybe-accent'
                : voice.status === 'error'
                  ? 'border-vybe-danger/50 text-vybe-danger'
                  : 'border-vybe-border text-vybe-text-secondary hover:border-vybe-accent/40'
            }`}
          >
            {voice.status === 'connected'
              ? `🎧 voice · ${voice.participants}`
              : voice.status === 'connecting'
                ? '🎧 connecting…'
                : voice.status === 'error'
                  ? '🎧 retry voice'
                  : '🎧 join voice'}
          </button>
          <button
            type="button"
            onClick={() => setAiOpen((value) => !value)}
            className="btn-primary px-3 py-1.5 text-[10px] uppercase tracking-[0.16em]"
          >
            ✨ AI Room Builder
          </button>
        </div>
      </div>

      {/* AI drawer */}
      {aiOpen ? (
        <div className="glass-panel-strong pointer-events-auto mt-2 max-w-md self-end rounded-2xl p-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-vybe-accent">
            gemini room builder
          </p>
          <textarea
            value={aiPrompt}
            onChange={(event) => setAiPrompt(event.target.value)}
            rows={3}
            className="vybe-input mt-2 resize-none text-[12px]"
            placeholder="Describe the room you want…"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void generate()}
              disabled={aiBusy}
              className="btn-primary px-3 py-1.5 text-[10px] uppercase tracking-[0.16em]"
            >
              {aiBusy ? 'Generating…' : 'Generate layout'}
            </button>
            <button
              type="button"
              onClick={() => setAiOpen(false)}
              className="btn-ghost px-3 py-1.5 text-[10px]"
            >
              Close
            </button>
          </div>
          {aiResult ? (
            <p className="mt-2 text-[10px] leading-relaxed text-vybe-text-secondary">{aiResult}</p>
          ) : null}
        </div>
      ) : null}

      {/* Bottom HUD */}
      <div className="flex flex-col gap-2">
        <div className="flex items-end gap-2">
          {chatOpen ? (
            <div className="glass-panel pointer-events-auto flex h-64 w-full max-w-sm flex-col rounded-2xl p-3">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-vybe-accent">
                  spatial chat
                </p>
                <button
                  type="button"
                  onClick={() => setChatOpen(false)}
                  className="text-[10px] text-vybe-text-secondary hover:text-vybe-text-primary"
                >
                  hide
                </button>
              </div>
              <div className="mt-2 flex-1 space-y-1.5 overflow-y-auto pr-1">
                {messages.length === 0 ? (
                  <p className="text-[10px] leading-relaxed text-vybe-text-secondary">
                    Say hi — messages broadcast to everyone in this room.
                  </p>
                ) : (
                  messages.map((message) => (
                    <div key={message.id} className="text-[11px] leading-relaxed">
                      <span
                        className={`font-bold ${
                          message.userId === selfId ? 'text-vybe-primary' : 'text-vybe-accent'
                        }`}
                      >
                        {message.username}
                      </span>{' '}
                      <span className="text-vybe-text-primary/90">{message.content}</span>{' '}
                      <span className="text-[9px] text-vybe-text-secondary/60">
                        {timeAgo(message.sentAt)}
                      </span>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-2 flex gap-1.5">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void sendChat();
                    }
                  }}
                  maxLength={280}
                  placeholder="Message the room…"
                  className="vybe-input py-1.5 text-[11px]"
                />
                <button
                  type="button"
                  onClick={() => void sendChat()}
                  disabled={!draft.trim()}
                  className="btn-primary px-3 py-1.5 text-[10px]"
                >
                  Send
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setChatOpen(true)}
              className="glass-panel pointer-events-auto rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-vybe-accent"
            >
              💬 open chat ({messages.length})
            </button>
          )}

          <div className="pointer-events-auto ml-auto flex flex-wrap items-center justify-end gap-1.5">
            <span className="hud-chip hidden sm:inline-flex">emote wheel</span>
            {EMOTES.map((emote) => (
              <button
                key={emote.id}
                type="button"
                onClick={() => onEmote(emote.id)}
                className="glass-panel rounded-xl px-2.5 py-1.5 text-[10px] font-semibold text-vybe-text-primary transition hover:border-vybe-accent/60 hover:text-vybe-accent"
                title={emote.label}
              >
                {emote.glyph} {emote.label}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-panel pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-2xl px-3 py-2">
          <span className="hud-chip">prop spawner</span>
          {PROPS.map((prop) => (
            <button
              key={prop.id}
              type="button"
              onClick={() => onSpawnProp(prop.id)}
              className="rounded-lg border border-vybe-border bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold text-vybe-text-secondary transition hover:border-vybe-primary/60 hover:text-vybe-text-primary"
            >
              + {prop.label}
            </button>
          ))}
          <span className="ml-1 hidden items-center gap-1 sm:flex">
            {neonPalette.slice(0, 5).map((color) => (
              <span
                key={color}
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: color, boxShadow: `0 0 8px ${color}` }}
              />
            ))}
          </span>
          <Link href="/" onClick={onLeave} className="btn-ghost ml-auto px-3 py-1 text-[10px]">
            Exit to 2D Feed
          </Link>
        </div>
      </div>
    </div>
  );
}
