import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RoomGateway } from './room.gateway.js';

@Module({
  imports: [AuthModule],
  providers: [RoomGateway],
})
export class GatewayModule {}
