/**
 * Demo seed: 3 users, 3 public 3D rooms and a populated 2D feed.
 * Run with `pnpm --filter @vybe/database seed`.
 */
import 'dotenv/config';
import { cloneTemplateScene, getRoomTemplate } from '@vybe/3d-core';
import { DEFAULT_AVATAR_CONFIG, type AvatarConfig } from '@vybe/shared-types';
import { createPrismaClient } from './index';
import { hashPassword } from './password';

const prisma = createPrismaClient({ logQueries: false });

const DEMO_PASSWORD = 'vybe1234';

const users: {
  email: string;
  username: string;
  displayName: string;
  bio: string;
  avatarConfig: AvatarConfig;
}[] = [
  {
    email: 'nova@vybe.space',
    username: 'nova',
    displayName: 'Nova Reyes',
    bio: 'Spatial DJ. Building lo-fi rooms above the city grid.',
    avatarConfig: {
      ...DEFAULT_AVATAR_CONFIG,
      skinTone: 'bronze',
      hairStyleId: 'locs',
      hairColor: '#7C3AED',
      topId: 'tech_jacket',
      topColor: '#7C3AED',
      accessoryId: 'visor',
      accessoryColor: '#06B6D4',
    },
  },
  {
    email: 'kai@vybe.space',
    username: 'kai',
    displayName: 'Kai Mori',
    bio: 'Arcade cabinet collector. Neon sign enthusiast.',
    avatarConfig: {
      ...DEFAULT_AVATAR_CONFIG,
      skinTone: 'sand',
      hairStyleId: 'mohawk',
      hairColor: '#F472B6',
      topId: 'bomber',
      topColor: '#06B6D4',
      bottomId: 'joggers',
      shoesId: 'boots',
      accessoryId: 'earpiece',
      accessoryColor: '#22D3EE',
    },
  },
  {
    email: 'mira@vybe.space',
    username: 'mira',
    displayName: 'Mira Sol',
    bio: '3D interior architect. Ask me for a room layout prompt.',
    avatarConfig: {
      ...DEFAULT_AVATAR_CONFIG,
      skinTone: 'porcelain',
      hairStyleId: 'bob',
      hairColor: '#F59E0B',
      topId: 'cropped_hoodie',
      topColor: '#A855F7',
      bottomId: 'skirt',
      shoesId: 'sneakers',
      accessoryId: 'halo',
      accessoryColor: '#A3E635',
    },
  },
];

const rooms: {
  slug: string;
  name: string;
  description: string;
  templateId: string;
  themeTag: string;
  ownerUsername: string;
}[] = [
  {
    slug: 'cyber-lounge',
    name: 'Cyber Lounge',
    description: 'Lo-fi synth lounge with violet sofas and a pulsing portal ring.',
    templateId: 'cyber_lounge_v1',
    themeTag: 'CYBER LOUNGE',
    ownerUsername: 'nova',
  },
  {
    slug: 'neon-rooftop',
    name: 'Neon Rooftop',
    description: 'Open-air rooftop above the city grid. Cyan neon rim lighting.',
    templateId: 'neon_rooftop_v1',
    themeTag: 'NEON ROOFTOP',
    ownerUsername: 'kai',
  },
  {
    slug: 'creator-plaza',
    name: 'Creator Plaza',
    description: 'Retro arcade hall for creators to hang out and trade layouts.',
    templateId: 'arcade_hub_v1',
    themeTag: 'CREATOR PLAZA',
    ownerUsername: 'mira',
  },
];

async function main(): Promise<void> {
  const passwordHash = hashPassword(DEMO_PASSWORD);

  const seededUsers = new Map<string, string>();
  for (const demoUser of users) {
    const user = await prisma.user.upsert({
      where: { email: demoUser.email },
      update: {
        displayName: demoUser.displayName,
        bio: demoUser.bio,
        avatarConfig: demoUser.avatarConfig,
        passwordHash,
        presence: 'ONLINE',
        // Nova doubles as the demo moderator for the admin review queue.
        role: demoUser.username === 'nova' ? 'ADMIN' : 'USER',
      },
      create: {
        email: demoUser.email,
        username: demoUser.username,
        displayName: demoUser.displayName,
        bio: demoUser.bio,
        avatarConfig: demoUser.avatarConfig,
        passwordHash,
        presence: 'ONLINE',
        role: demoUser.username === 'nova' ? 'ADMIN' : 'USER',
      },
    });
    seededUsers.set(demoUser.username, user.id);
  }

  const seededRooms = new Map<string, string>();
  for (const room of rooms) {
    const template = getRoomTemplate(room.templateId);
    const ownerId = seededUsers.get(room.ownerUsername);
    const seeded = await prisma.room.upsert({
      where: { slug: room.slug },
      update: {
        name: room.name,
        description: room.description,
        templateId: template.templateId,
        themeTag: room.themeTag,
        sceneGraph: cloneTemplateScene(template.templateId),
        isPublic: true,
        maxParticipants: 20,
        ownerId,
      },
      create: {
        slug: room.slug,
        name: room.name,
        description: room.description,
        templateId: template.templateId,
        themeTag: room.themeTag,
        sceneGraph: cloneTemplateScene(template.templateId),
        isPublic: true,
        maxParticipants: 20,
        ownerId,
      },
    });
    seededRooms.set(room.slug, seeded.id);
  }

  const nova = seededUsers.get('nova');
  const kai = seededUsers.get('kai');
  const mira = seededUsers.get('mira');
  if (!nova || !kai || !mira) {
    throw new Error('Seed failed: demo users were not created');
  }

  // Idempotent demo follows.
  const followPairs: [string, string][] = [
    [kai, nova],
    [mira, nova],
    [nova, mira],
    [kai, mira],
  ];
  for (const [followerId, followingId] of followPairs) {
    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      update: {},
      create: { followerId, followingId },
    });
  }

  await prisma.post.deleteMany({ where: { authorId: { in: [nova, kai, mira] } } });

  const portalPost = await prisma.post.create({
    data: {
      authorId: nova,
      content:
        'Lounge is warm and the portal ring is humming. Pull up — lo-fi set starts in 10. #3D',
      mediaUrls: [],
      linkedRoomId: seededRooms.get('cyber-lounge') ?? null,
    },
  });

  const rooftopPost = await prisma.post.create({
    data: {
      authorId: kai,
      content: 'Rooftop skyline test passed. Grid reflections are unreal tonight.',
      mediaUrls: [],
      linkedRoomId: seededRooms.get('neon-rooftop') ?? null,
    },
  });

  const textPost = await prisma.post.create({
    data: {
      authorId: mira,
      content:
        'Prompted a "cyberpunk lo-fi chill lounge with neon sofas and an arcade corner" and got 12 props back. AI Room Builder is live.',
      mediaUrls: [],
      linkedRoomId: null,
    },
  });

  await prisma.post.create({
    data: {
      authorId: mira,
      content: 'Creator Plaza is open for layout critiques. Bring your sceneGraph.',
      mediaUrls: [],
      linkedRoomId: seededRooms.get('creator-plaza') ?? null,
    },
  });

  await prisma.comment.createMany({
    data: [
      { postId: portalPost.id, authorId: kai, content: 'On my way — saving you a sofa.' },
      { postId: rooftopPost.id, authorId: nova, content: 'That skyline shader is clean.' },
      { postId: textPost.id, authorId: kai, content: 'Try it with "arcade corner" removed.' },
    ],
  });

  await prisma.like.createMany({
    data: [
      { postId: portalPost.id, userId: kai },
      { postId: portalPost.id, userId: mira },
      { postId: rooftopPost.id, userId: nova },
      { postId: textPost.id, userId: kai },
    ],
  });

  await prisma.directMessage.createMany({
    data: [
      {
        senderId: kai,
        recipientId: nova,
        content: 'Sending you a room invite for the arcade wall build.',
        roomInviteId: seededRooms.get('creator-plaza') ?? null,
      },
      {
        senderId: nova,
        recipientId: kai,
        content: 'Perfect, I will remix the neon signs.',
      },
    ],
  });

  console.log('Seed complete');
  console.log(`  users: ${users.map((user) => user.username).join(', ')} (password: ${DEMO_PASSWORD})`);
  console.log(`  rooms: ${rooms.map((room) => `/${room.slug}`).join(', ')}`);
  console.log('  posts: 4 (2 room portals, 1 text, 1 room snapshot)');
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
