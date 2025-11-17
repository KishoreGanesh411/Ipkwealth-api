import { ForbiddenException, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Args, ID, Int, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { FirebaseAuthGuard } from '../core/firebase/firebase-auth.guard';
import {
  LeadInteractionInput,
  LeadNoteInput,
  UpdateLeadClientQaInput,
} from '../lead_event/dto/lead-event.input';
import { LeadEventEntity } from '../lead_event/entities/lead-event.model';
import { UserEntity, UserLiteModel } from '../user/entities/user.entity';
import { UserRoles } from '../user/enums/user.enums';
import { AssignLeadInput, AssignLeadsBulkInput } from './dto/assign.input';
import { ChangeStageInput } from './dto/change-stage.input';
import { BulkLeadRowInput, CreateIpkLeaddInput } from './dto/create-lead.input';
import { LeadListArgs } from './dto/lead-list.args';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadPhoneInput, UpdateLeadBioInput, UpdateLeadRemarkInput } from './dto/lead-phone.input';
import { ReassignLeadInput } from './dto/reassign-lead.input';
import { RmFirstContactInput } from './dto/rm-first-contact.input';
import { UpdateLeadDetailsInput } from './dto/update-lead-details.input';
import { UpdateIpkLeaddInput } from './dto/update-leadd.input';
import { BulkImportResult } from './entities/bulk-result.model';
import { AssignBulkResult, AssignResult, IpkLeaddEntity } from './entities/ipk-leadd.model';
import { RemarkEntry } from './entities/remark.model';
import { LeadPage } from './entities/lead-page.model';
import { LeadPhoneEntity } from './entities/lead-phone.model';
import { StageSummary } from './entities/stage-summary.model';
import { ClientStage, LeadStatus } from './enums/ipk-leadd.enum';
import { $Enums } from '@prisma/client';
import { IpkLeaddService } from './ipk-leadd.service';

@Resolver(() => IpkLeaddEntity)
export class IpkLeaddResolver {
  constructor(private readonly service: IpkLeaddService) {}

  @Mutation(() => IpkLeaddEntity, { name: 'createIpkLeadd' })
  createIpkLeadd(@Args('input') input: CreateIpkLeaddInput) {
    return this.service.createPendingLead(input);
  }

  // Back-compat for old FE call
  @Mutation(() => IpkLeaddEntity, { name: 'assignLead' })
  assignLead(@Args('id', { type: () => ID }) id: string) {
    return this.service.assignLead(id);
  }
  // Unified mutation: pass 1 or many IDs
  @Mutation(() => [IpkLeaddEntity], { name: 'assignLeads' })
  assignLeads(@Args({ name: 'ids', type: () => [ID] }) ids: string[]) {
    return this.service.assignLeads(ids);
  }

  // ---------- Admin-controlled assignment with mode (AUTO/MANUAL) ----------
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRoles.ADMIN)
  @Mutation(() => AssignResult, { name: 'assignLeadWithMode' })
  assignLeadWithMode(@Args('input') input: AssignLeadInput, @CurrentUser() user: UserEntity) {
    return this.service.assignLeadWithMode({
      leadId: input.leadId,
      mode: input.mode,
      rmId: input.rmId,
      authorId: user?.id,
    });
  }

  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRoles.ADMIN)
  @Mutation(() => AssignBulkResult, { name: 'assignLeadsWithMode' })
  async assignLeadsWithMode(
    @Args('input') input: AssignLeadsBulkInput,
    @CurrentUser() user: UserEntity,
  ) {
    const res = await this.service.assignLeadsWithMode({
      leadIds: input.leadIds,
      mode: input.mode,
      rmId: input.rmId,
      authorId: user?.id,
    });
    // Normalize item shape to expose `message` instead of `msg`
    return {
      items: res.items.map((i) => ({ id: i.id, ok: i.ok, message: i.msg })),
      assigned: res.assigned,
      failed: res.failed,
      errors: res.errors,
    } as AssignBulkResult;
  }

  @Query(() => [IpkLeaddEntity], { name: 'leadsOpen' })
  leadsOpen() {
    return this.service.leadsOpen();
  }

  @Query(() => [IpkLeaddEntity])
  ipkLeadds() {
    return this.service.listAll();
  }
  @Query(() => LeadPage, { name: 'leads' })
  leads(@Args('args', { type: () => LeadListArgs }) args: LeadListArgs) {
    return this.service.list(args);
  }
  @Mutation(() => BulkImportResult, { name: 'createLeadsBulk' })
  createLeadsBulk(
    @Args('rows', { type: () => [BulkLeadRowInput] })
    rows: CreateIpkLeaddInput[],
  ) {
    return this.service.createLeadsBulk(rows);
  }

  // ----------------------- Field resolvers -----------------------------
  @ResolveField(() => [LeadPhoneEntity], { name: 'phones', nullable: 'itemsAndList' })
  phones(@Parent() lead: IpkLeaddEntity) {
    return this.service.getPhones(lead.id);
  }

  @ResolveField(() => [LeadEventEntity], { name: 'events', nullable: 'itemsAndList' })
  events(@Parent() lead: IpkLeaddEntity) {
    return this.service.getEvents(lead.id);
  }

  @UseGuards(FirebaseAuthGuard)
  @Query(() => [LeadPhoneEntity], { name: 'leadPhones' })
  leadPhones(@Args('leadId', { type: () => ID }) leadId: string) {
    return this.service.getPhones(leadId);
  }

  // Remarks: normalize JSON into a typed array
  @ResolveField(() => [RemarkEntry], { name: 'remarks', nullable: 'itemsAndList' })
  remarks(@Parent() lead: IpkLeaddEntity): RemarkEntry[] | null {
    const raw = (lead as unknown as { remark?: unknown }).remark;
    if (raw === null || raw === undefined) return [];

    const toArray = (v: unknown): unknown[] => {
      if (!v) return [];
      if (Array.isArray(v)) return v;
      if (typeof v === 'string') {
        return [{ text: v, at: new Date().toISOString() }];
      }
      if (typeof v === 'object') {
        const r = v as Record<string, unknown>;
        const history = (r as { history?: unknown }).history;
        if (Array.isArray(history)) return history as unknown[];
      }
      return [];
    };

    const arr = toArray(raw);
    const mapped: RemarkEntry[] = arr
      .map((e) => {
        const obj = typeof e === 'object' && e !== null ? (e as Record<string, unknown>) : {};
        const textVal = obj['text'];
        let text: string;
        if (typeof textVal === 'string') text = textVal;
        else if (textVal == null) text = '';
        else if (typeof textVal === 'number' || typeof textVal === 'boolean')
          text = String(textVal);
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
        return { text, author, createdAt: at } as RemarkEntry;
      })
      .filter((x) => x.text && x.text.length > 0);

    return mapped;
  }

  // ----------------------- Phone mutations -----------------------------
  @UseGuards(FirebaseAuthGuard)
  @Mutation(() => [LeadPhoneEntity])
  addLeadPhone(
    @Args('leadId', { type: () => ID }) leadId: string,
    @Args('input') input: LeadPhoneInput,
    @CurrentUser() user: UserEntity,
  ) {
    return this.service.addPhone(leadId, input, user?.id);
  }

  @UseGuards(FirebaseAuthGuard)
  @Mutation(() => [LeadPhoneEntity])
  removeLeadPhone(
    @Args('phoneId', { type: () => ID }) phoneId: string,
    @CurrentUser() user: UserEntity,
  ) {
    return this.service.removePhone(phoneId, user?.id);
  }

  @UseGuards(FirebaseAuthGuard)
  @Mutation(() => [LeadPhoneEntity])
  markPrimaryLeadPhone(
    @Args('phoneId', { type: () => ID }) phoneId: string,
    @CurrentUser() user: UserEntity,
  ) {
    return this.service.markPrimaryPhone(phoneId, user?.id);
  }

  @UseGuards(FirebaseAuthGuard)
  @Mutation(() => LeadPhoneEntity)
  setLeadPhoneWhatsapp(
    @Args('phoneId', { type: () => ID }) phoneId: string,
    @Args('isWhatsapp', { type: () => Boolean }) isWhatsapp: boolean,
    @CurrentUser() user: UserEntity,
  ) {
    return this.service.setWhatsapp(phoneId, isWhatsapp, user?.id);
  }

  // ----------------------- Event mutations -----------------------------
  @UseGuards(FirebaseAuthGuard)
  @Mutation(() => LeadEventEntity)
  addLeadNote(@Args('input') input: LeadNoteInput, @CurrentUser() user: UserEntity) {
    return this.service.addNote(input.leadId, input.text, input.tags ?? [], user?.id);
  }

  @UseGuards(FirebaseAuthGuard)
  @Mutation(() => LeadEventEntity)
  addLeadInteraction(@Args('input') input: LeadInteractionInput, @CurrentUser() user: UserEntity) {
    return this.service.addInteraction(
      {
        leadId: input.leadId,
        text: input.text,
        tags: input.tags ?? [],
        channel: input.channel,
        outcome: input.outcome,
        nextFollowUpAt: input.nextFollowUpAt,
        dormantReason: input.dormantReason,
      },
      user?.id,
    );
  }

  // ----------------------- Lead updates --------------------------------
  @UseGuards(FirebaseAuthGuard)
  @Mutation(() => IpkLeaddEntity)
  updateLeadRemark(@Args('input') input: UpdateLeadRemarkInput, @CurrentUser() user: UserEntity) {
    return this.service.updateRemark(input.leadId, input.remark, user?.id, user?.name ?? null);
  }

  @UseGuards(FirebaseAuthGuard)
  @Mutation(() => IpkLeaddEntity)
  updateLeadBio(@Args('input') input: UpdateLeadBioInput, @CurrentUser() user: UserEntity) {
    return this.service.updateBio(input.leadId, input.bioText, user?.id);
  }

  // Update basic lead details (does not change leadCode or leadSource)
  @UseGuards(FirebaseAuthGuard)
  @Mutation(() => IpkLeaddEntity, { name: 'updateLeadDetails' })
  updateLeadDetails(@Args('input') input: UpdateLeadDetailsInput, @CurrentUser() user: UserEntity) {
    return this.service.updateLeadDetails(input, user?.id, user?.name ?? null);
  }

  // Generic lead update using UpdateIpkLeaddInput (backed by service.updateLead)
  @UseGuards(FirebaseAuthGuard)
  @Mutation(() => IpkLeaddEntity, { name: 'updateIpkLeadd' })
  updateIpkLeadd(@Args('input') input: UpdateIpkLeaddInput) {
    const { id, ...patch } = input as unknown as { id: string } & Record<string, unknown>;
    return this.service.updateLead(id, patch as unknown as UpdateLeadDto);
  }

  @UseGuards(FirebaseAuthGuard)
  @Mutation(() => IpkLeaddEntity)
  updateLeadStatus(
    @Args('leadId', { type: () => ID }) leadId: string,
    @Args('status', { type: () => LeadStatus }) status: LeadStatus,
    @CurrentUser() user: UserEntity,
  ) {
    return this.service.updateStatus(leadId, status as unknown as $Enums.LeadStatus, user?.id);
  }

  @UseGuards(FirebaseAuthGuard)
  @Mutation(() => IpkLeaddEntity)
  reassignLead(@Args('input') input: ReassignLeadInput, @CurrentUser() user: UserEntity) {
    return this.service.reassignLeadToUser(input.leadId, input.newRmId, user?.id);
  }

  @UseGuards(FirebaseAuthGuard)
  @Mutation(() => IpkLeaddEntity)
  updateLeadClientQa(
    @Args('input') input: UpdateLeadClientQaInput,
    @CurrentUser() user: UserEntity,
  ) {
    return this.service.updateClientQa(input.leadId, input.items, user?.id);
  }
  @UseGuards(FirebaseAuthGuard)
  @Mutation(() => IpkLeaddEntity)
  changeStage(@Args('input') input: ChangeStageInput, @CurrentUser() user: UserEntity) {
    return this.service.changeStage(input, user?.id);
  }
  @UseGuards(FirebaseAuthGuard)
  @Query(() => LeadPage, { name: 'myAssignedLeads' })
  myAssignedLeads(
    @Args('args', {
      type: () => LeadListArgs,
      defaultValue: { page: 1, pageSize: 10 },
    })
    args: LeadListArgs,
    @CurrentUser() user: UserEntity,
  ) {
    if (!user?.id) {
      throw new UnauthorizedException('User context missing');
    }
    if (user.role !== UserRoles.RM) {
      throw new ForbiddenException('Only RM users can access assigned leads');
    }

    const normalizedArgs = Object.assign(new LeadListArgs(), args);
    normalizedArgs.page = normalizedArgs.page ?? 1;
    normalizedArgs.pageSize = normalizedArgs.pageSize ?? 10;

    return this.service.listForRm(user.id, normalizedArgs);
  }
  @UseGuards(FirebaseAuthGuard)
  @Query(() => IpkLeaddEntity, { name: 'lead' })
  async lead(@Args('id', { type: () => ID }) id: string, @CurrentUser() user: UserEntity) {
    const data = await this.service.findLeadById(id);
    if (!data) throw new UnauthorizedException('Lead not found');

    // Access: Admin/Marketing can view all; RM only their leads
    if (user.role !== UserRoles.ADMIN && user.role !== UserRoles.MARKETING) {
      if (!(user.role === UserRoles.RM && data.assignedRmId === user.id)) {
        throw new ForbiddenException('You do not have permission to view this lead');
      }
    }
    return data;
  }

  @UseGuards(FirebaseAuthGuard)
  @Query(() => IpkLeaddEntity, { name: 'leadDetailWithTimeline' })
  async leadDetailWithTimeline(
    @Args('leadId', { type: () => ID }) leadId: string,
    @Args('eventsLimit', { type: () => Int, nullable: true }) eventsLimit = 50,
    @CurrentUser() user: UserEntity,
  ) {
    const data = await this.service.getLeadDetailWithTimeline({ leadId, eventsLimit });
    // Access: Admin/Marketing can view all; RM only their leads
    if (user.role !== UserRoles.ADMIN && user.role !== UserRoles.MARKETING) {
      if (!(user.role === UserRoles.RM && data.assignedRmId === user.id)) {
        throw new ForbiddenException('You do not have permission to view this lead');
      }
    }
    return data;
  }
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRoles.ADMIN) // Admin only
  @Query(() => [UserLiteModel], { name: 'activeRms' })
  activeRms() {
    return this.service.listActiveRms();
  }
  @UseGuards(FirebaseAuthGuard)
  @Query(() => StageSummary, { name: 'leadStageSummary' })
  leadStageSummary() {
    return this.service.stageSummary();
  }
  @UseGuards(FirebaseAuthGuard)
  @Query(() => LeadPage, { name: 'leadsByStage' })
  leadsByStage(
    @Args('stage', { type: () => ClientStage, nullable: true }) stage?: ClientStage,
    @Args('args', { type: () => LeadListArgs, nullable: true }) args?: LeadListArgs,
  ) {
    const a = Object.assign(new LeadListArgs(), args ?? {});
    a.clientStage = stage ?? a.clientStage;
    return this.service.list(a);
  }
  @UseGuards(FirebaseAuthGuard, RolesGuard)
  @Roles(UserRoles.RM)
  @Mutation(() => IpkLeaddEntity, { name: 'rmFirstContact' })
  rmFirstContact(@Args('input') input: RmFirstContactInput, @CurrentUser() user: UserEntity) {
    return this.service.rmFirstContact(input, user);
  }
}
