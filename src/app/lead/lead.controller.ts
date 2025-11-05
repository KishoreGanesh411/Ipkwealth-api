import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { IpkLeaddService } from './ipk-leadd.service';

@Controller('ipk-leads')
export class LeadController {
  constructor(private readonly leads: IpkLeaddService) {}

  private computeAgingFields(lead: any) {
    const approach: Date | null = lead?.approachAt ? new Date(lead.approachAt) : null;
    const created: Date | null = lead?.createdAt ? new Date(lead.createdAt) : null;
    const base: Date | null = approach && !isNaN(approach.getTime()) ? approach : created;
    const msPerDay = 86_400_000;
    const agingDays = base ? Math.max(0, Math.floor((Date.now() - base.getTime()) / msPerDay)) : 0;
    return { agingDays, baseDateForAging: base ?? null };
  }

  private parseRemarks(raw: unknown) {
    if (raw === null || raw === undefined) return [] as Array<{ text: string; author?: string | null; createdAt: Date }>;
    const toArray = (v: unknown): unknown[] => {
      if (!v) return [];
      if (Array.isArray(v)) return v;
      if (typeof v === 'string') return [{ text: v, at: new Date().toISOString() }];
      if (typeof v === 'object') {
        const r = v as Record<string, unknown>;
        const history = (r as { history?: unknown }).history;
        if (Array.isArray(history)) return history as unknown[];
      }
      return [];
    };
    const arr = toArray(raw);
    return arr
      .map((e) => {
        const obj = typeof e === 'object' && e !== null ? (e as Record<string, unknown>) : {};
        const textVal = obj['text'];
        let text: string;
        if (typeof textVal === 'string') text = textVal;
        else if (textVal == null) text = '';
        else if (typeof textVal === 'number' || typeof textVal === 'boolean') text = String(textVal);
        else text = JSON.stringify(textVal);
        const atRaw = obj['at'];
        let at: Date;
        if (atRaw instanceof Date && !isNaN(atRaw.getTime())) at = atRaw;
        else if (typeof atRaw === 'string' || typeof atRaw === 'number') {
          const d = new Date(atRaw);
          at = isNaN(d.getTime()) ? new Date() : d;
        } else {
          at = new Date();
        }
        const byNameVal = obj['byName'];
        const byVal = obj['by'];
        const author =
          typeof byNameVal === 'string' && byNameVal.trim().length > 0
            ? byNameVal
            : typeof byVal === 'string'
            ? byVal
            : null;
        return { text, author, createdAt: at };
      })
      .filter((x) => x.text && x.text.length > 0);
  }

  @Post()
  create(@Body() input: CreateLeadDto) {
    return this.leads.createLead(input);
  }

  @Get()
  findAll(@Query('archived') archived?: string) {
    const includeArchived = archived === 'true';
    return this.leads.findAllLeads(includeArchived).then((rows) =>
      rows.map((r) => {
        const { agingDays, baseDateForAging } = this.computeAgingFields(r);
        const remarks = this.parseRemarks(r.remark ?? null);
        return { ...r, agingDays, baseDateForAging, remarks } as any;
      }),
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.leads.findLeadById(id).then((r) => {
      if (!r) return r as any;
      const { agingDays, baseDateForAging } = this.computeAgingFields(r);
      const remarks = this.parseRemarks(r.remark ?? null);
      return { ...r, agingDays, baseDateForAging, remarks } as any;
    });
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
