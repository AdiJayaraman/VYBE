import { z } from 'zod';

/** Access tokens are short-lived; the client refreshes them before joining voice. */
export const VOICE_TOKEN_TTL_SECONDS = 15 * 60;

export const VoiceTokenRequestSchema = z.object({
  roomSlug: z.string().min(1).max(64),
});
export type VoiceTokenRequest = z.infer<typeof VoiceTokenRequestSchema>;

export const VoiceTokenResponseSchema = z.object({
  /** LiveKit Cloud websocket endpoint, e.g. `wss://project.livekit.cloud`. */
  url: z.string().min(1),
  token: z.string().min(1),
  /** Deterministic LiveKit room name derived from the VYBE room id. */
  roomName: z.string().min(1),
  expiresAt: z.string().min(1),
  canPublish: z.boolean(),
});
export type VoiceTokenResponse = z.infer<typeof VoiceTokenResponseSchema>;

export const VOICE_CONFIGURED = 'VOICE_CONFIGURED' as const;
