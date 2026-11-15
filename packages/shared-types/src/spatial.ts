import { z } from 'zod';
import { AvatarConfigSchema, HexColorSchema } from './avatar';

/** `[x, y, z]` tuple — never a loose `number[]`. */
export const Vec3Schema = z.tuple([z.number(), z.number(), z.number()]);
export type Vec3 = z.infer<typeof Vec3Schema>;

export const MODEL_TYPES = ['sofa', 'neon_sign', 'arcade', 'table', 'portal'] as const;
export const ModelTypeSchema = z.enum(MODEL_TYPES);
export type ModelType = z.infer<typeof ModelTypeSchema>;

/** A single piece of furniture / neon prop persisted inside `Room.sceneGraph`. */
export const ScenePropSchema = z.object({
  id: z.string().min(1).max(64),
  modelType: ModelTypeSchema,
  position: Vec3Schema,
  rotation: Vec3Schema,
  scale: Vec3Schema,
  color: HexColorSchema,
});
export type SceneProp = z.infer<typeof ScenePropSchema>;

export const SceneGraphSchema = z.array(ScenePropSchema).max(120);
export type SceneGraph = z.infer<typeof SceneGraphSchema>;

export const ANIMATION_STATES = ['idle', 'walk', 'run', 'wave', 'dance', 'sit'] as const;
export const AnimationStateSchema = z.enum(ANIMATION_STATES);
export type AnimationState = z.infer<typeof AnimationStateSchema>;

export const EMOTE_TYPES = ['wave', 'dance', 'sit', 'cyber_pulse'] as const;
export const EmoteTypeSchema = z.enum(EMOTE_TYPES);
export type EmoteType = z.infer<typeof EmoteTypeSchema>;

/** `room:move` payload. Rotation is a yaw angle in radians (`y` axis). */
export const PlayerTransformPayloadSchema = z.object({
  roomId: z.string().min(1),
  position: Vec3Schema,
  rotation: z.number(),
  animation: AnimationStateSchema,
});
export type PlayerTransformPayload = z.infer<typeof PlayerTransformPayloadSchema>;

export const RoomParticipantSchema = z.object({
  userId: z.string().min(1),
  username: z.string().min(1),
  displayName: z.string().min(1),
  avatarConfig: AvatarConfigSchema,
  position: Vec3Schema,
  rotation: z.number(),
  animation: AnimationStateSchema,
  joinedAt: z.string().min(1),
  isSpeaking: z.boolean(),
});
export type RoomParticipant = z.infer<typeof RoomParticipantSchema>;

export const ROOM_TEMPLATE_IDS = ['cyber_lounge_v1', 'neon_rooftop_v1', 'arcade_hub_v1'] as const;
export const RoomTemplateIdSchema = z.enum(ROOM_TEMPLATE_IDS);
export type RoomTemplateId = z.infer<typeof RoomTemplateIdSchema>;

export const CreateRoomDtoSchema = z.object({
  name: z.string().min(3).max(48),
  description: z.string().max(240).default(''),
  templateId: RoomTemplateIdSchema.default('cyber_lounge_v1'),
  themeTag: z.string().min(2).max(24).optional(),
  isPublic: z.boolean().default(true),
  maxParticipants: z.number().int().min(2).max(40).default(20),
  sceneGraph: SceneGraphSchema.optional(),
});
export type CreateRoomDto = z.infer<typeof CreateRoomDtoSchema>;

export const UpdateRoomSceneDtoSchema = z.object({
  sceneGraph: SceneGraphSchema,
});
export type UpdateRoomSceneDto = z.infer<typeof UpdateRoomSceneDtoSchema>;

export const RoomJoinPayloadSchema = z.object({
  roomId: z.string().min(1),
  spawnPosition: Vec3Schema.optional(),
});
export type RoomJoinPayload = z.infer<typeof RoomJoinPayloadSchema>;

export const RoomLeavePayloadSchema = z.object({
  roomId: z.string().min(1),
});
export type RoomLeavePayload = z.infer<typeof RoomLeavePayloadSchema>;

export const AddPropPayloadSchema = z.object({
  roomId: z.string().min(1),
  props: z.array(ScenePropSchema).min(1).max(24),
});
export type AddPropPayload = z.infer<typeof AddPropPayloadSchema>;

export const RoomChatMessageSchema = z.object({
  id: z.string().min(1),
  roomId: z.string().min(1),
  userId: z.string().min(1),
  username: z.string().min(1),
  content: z.string().min(1).max(280),
  sentAt: z.string().min(1),
});
export type RoomChatMessage = z.infer<typeof RoomChatMessageSchema>;

export const RoomEmoteEventSchema = z.object({
  roomId: z.string().min(1),
  userId: z.string().min(1),
  username: z.string().min(1),
  emote: EmoteTypeSchema,
  animation: AnimationStateSchema,
  triggeredAt: z.string().min(1),
});
export type RoomEmoteEvent = z.infer<typeof RoomEmoteEventSchema>;

export const RoomPropAddedEventSchema = z.object({
  roomId: z.string().min(1),
  props: z.array(ScenePropSchema),
  addedByUserId: z.string().min(1),
  sceneGraph: SceneGraphSchema,
});
export type RoomPropAddedEvent = z.infer<typeof RoomPropAddedEventSchema>;

export const RoomStateSyncPayloadSchema = z.object({
  roomId: z.string().min(1),
  sceneGraph: SceneGraphSchema,
  participants: z.array(RoomParticipantSchema),
  serverTime: z.string().min(1),
});
export type RoomStateSyncPayload = z.infer<typeof RoomStateSyncPayloadSchema>;
