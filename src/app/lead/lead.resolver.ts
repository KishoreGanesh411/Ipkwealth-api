import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { IpkLeaddService } from './ipk-leadd.service';
import { IpkLeaddEntity } from './entities/ipk-leadd.model';
import { BulkLeadRowInput, CreateIpkLeaddInput } from './dto/create-lead.input';
import { LeadListArgs } from './dto/lead-list.args';
import { LeadPage } from './entities/lead-page.model';
import { BulkImportResult } from './entities/bulk-result.model';
import { LeadPhoneEntity } from './entities/lead-phone.model';
import { LeadEventEntity } from './entities/lead-event.model';
import { LeadPhoneInput, UpdateLeadBioInput, UpdateLeadRemarkInput } from './dto/lead-phone.input';
import { ClientQaItemInput, LeadInteractionInput, LeadNoteInput, UpdateLeadClientQaInput } from './dto/lead-event.input';
import { UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../core/firebase/firebase-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UserEntity } from '../user/entities/user.entity';
import { LeadStatus } from './enums/ipk-leadd.enum';
import { ReassignLeadInput } from './dto/reassign-lead.input';

@Resolver(() => IpkLeaddEntity)
export class IpkLeaddResolver {
  constructor(private readonly service: IpkLeaddService) { }

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
  addLeadInteraction(
    @Args('input') input: LeadInteractionInput,
    @CurrentUser() user: UserEntity,
  ) {
    return this.service.addInteraction(input.leadId, input.text, input.tags ?? [], user?.id);
  }

  // ----------------------- Lead updates --------------------------------
  @UseGuards(FirebaseAuthGuard)
  @Mutation(() => IpkLeaddEntity)
  updateLeadRemark(
    @Args('input') input: UpdateLeadRemarkInput,
    @CurrentUser() user: UserEntity,
  ) {
    return this.service.updateRemark(input.leadId, input.remark, user?.id);
  }

  @UseGuards(FirebaseAuthGuard)
  @Mutation(() => IpkLeaddEntity)
  updateLeadBio(
    @Args('input') input: UpdateLeadBioInput,
    @CurrentUser() user: UserEntity,
  ) {
    return this.service.updateBio(input.leadId, input.bioText, user?.id);
  }

  @UseGuards(FirebaseAuthGuard)
  @Mutation(() => IpkLeaddEntity)
  updateLeadStatus(
    @Args('leadId', { type: () => ID }) leadId: string,
    @Args('status', { type: () => LeadStatus }) status: LeadStatus,
    @CurrentUser() user: UserEntity,
  ) {
    return this.service.updateStatus(leadId, status as any, user?.id);
  }

  @UseGuards(FirebaseAuthGuard)
  @Mutation(() => IpkLeaddEntity)
  reassignLead(
    @Args('input') input: ReassignLeadInput,
    @CurrentUser() user: UserEntity,
  ) {
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
}
