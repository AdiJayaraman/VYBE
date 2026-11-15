import { describe, expect, it } from 'vitest';
import {
  AvatarConfigSchema,
  DEFAULT_AVATAR_CONFIG,
  parseAvatarConfig,
  CreatePostDtoSchema,
  CreateRoomDtoSchema,
  PlayerTransformPayloadSchema,
  RoomJoinPayloadSchema,
  ScenePropSchema,
  SendMessageDtoSchema,
} from './index';

describe('AvatarConfigSchema', () => {
  it('accepts the shared default avatar', () => {
    expect(AvatarConfigSchema.safeParse(DEFAULT_AVATAR_CONFIG).success).toBe(true);
  });

  it('rejects unknown skin tones and malformed colors', () => {
    const result = AvatarConfigSchema.safeParse({
      ...DEFAULT_AVATAR_CONFIG,
      skinTone: 'chrome',
      topColor: 'purple',
    });
    expect(result.success).toBe(false);
  });

  it('falls back to the default config for malformed stored JSON', () => {
    expect(parseAvatarConfig(null)).toEqual(DEFAULT_AVATAR_CONFIG);
    expect(parseAvatarConfig({ skinTone: 'nope' })).toEqual(DEFAULT_AVATAR_CONFIG);
  });
});

describe('ScenePropSchema', () => {
  const validProp = {
    id: 'sofa-1',
    modelType: 'sofa',
    position: [1, 0, 2],
    rotation: [0, 0.5, 0],
    scale: [1, 1, 1],
    color: '#7C3AED',
  };

  it('accepts a valid prop', () => {
    expect(ScenePropSchema.safeParse(validProp).success).toBe(true);
  });

  it('rejects a 2-element position and unknown model types', () => {
    expect(ScenePropSchema.safeParse({ ...validProp, position: [1, 0] }).success).toBe(false);
    expect(ScenePropSchema.safeParse({ ...validProp, modelType: 'spaceship' }).success).toBe(false);
  });
});

describe('social DTOs', () => {
  it('requires a post to carry content, media or a linked room', () => {
    expect(CreatePostDtoSchema.safeParse({}).success).toBe(false);
    expect(CreatePostDtoSchema.safeParse({ content: '   ' }).success).toBe(false);
    expect(CreatePostDtoSchema.safeParse({ content: 'hello' }).success).toBe(true);
    expect(CreatePostDtoSchema.safeParse({ linkedRoomId: 'room-1' }).success).toBe(true);
  });

  it('rejects oversized direct messages', () => {
    expect(
      SendMessageDtoSchema.safeParse({ recipientId: 'u1', content: 'x'.repeat(1001) }).success,
    ).toBe(false);
  });
});

describe('room and realtime payloads', () => {
  it('applies room creation defaults', () => {
    const parsed = CreateRoomDtoSchema.parse({ name: 'Test Room' });
    expect(parsed).toMatchObject({
      templateId: 'cyber_lounge_v1',
      isPublic: true,
      maxParticipants: 20,
    });
  });

  it('validates join and transform payloads', () => {
    expect(RoomJoinPayloadSchema.safeParse({ roomId: 'room-1' }).success).toBe(true);
    expect(RoomJoinPayloadSchema.safeParse({ roomId: '' }).success).toBe(false);
    expect(
      PlayerTransformPayloadSchema.safeParse({
        roomId: 'room-1',
        position: [0, 0, 0],
        rotation: 0,
        animation: 'walk',
      }).success,
    ).toBe(true);
    expect(
      PlayerTransformPayloadSchema.safeParse({
        roomId: 'room-1',
        position: [0, 0, 0],
        rotation: 0,
        animation: 'flying',
      }).success,
    ).toBe(false);
  });
});
