import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { IpkLeaddService } from './ipk-leadd.service';

@Controller('ipk-leads')
export class LeadController {
  constructor(private readonly leads: IpkLeaddService) {}

  @Post()
  create(@Body() input: CreateLeadDto) {
    return this.leads.createLead(input);
  }

  @Get()
  findAll(@Query('archived') archived?: string) {
    const includeArchived = archived === 'true';
    return this.leads.findAllLeads(includeArchived);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leads.findLeadById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() input: UpdateLeadDto) {
    return this.leads.updateLead(id, input);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.leads.removeLead(id);
  }
}
