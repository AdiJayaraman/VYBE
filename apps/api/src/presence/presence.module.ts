import { Global, Module } from '@nestjs/common';
import { RoomPresenceStore } from './room-presence.store.js';

@Global()
@Module({
  providers: [RoomPresenceStore],
  exports: [RoomPresenceStore],
})
export class PresenceModule {}
