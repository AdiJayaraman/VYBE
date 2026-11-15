import { Controller, Get } from '@nestjs/common';

interface HealthPayload {
  status: 'ok';
  service: 'vybe-api';
  timestamp: string;
}

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): HealthPayload {
    return { status: 'ok', service: 'vybe-api', timestamp: new Date().toISOString() };
  }
}
