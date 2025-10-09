import { Controller, Get, Param, Query } from '@nestjs/common';
import { RmService } from './rm.service';

@Controller('rms')
export class RmController {
  constructor(private readonly rms: RmService) {}

  @Get()
  listActive() {
    return this.rms.getActiveRms();
  }

  @Get(':id')
  getRm(@Param('id') id: string) {
    return this.rms.getRm(id);
  }

  @Get(':id/leads')
  getRmLeads(@Param('id') id: string, @Query('archived') archived?: string) {
    const includeArchived = archived === 'true';
    return this.rms.getRmLeads(id, includeArchived);
  }
}
