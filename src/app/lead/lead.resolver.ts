import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { IpkLeaddService } from './ipk-leadd.service';
import { IpkLeaddEntity } from './entities/ipk-leadd.model';
import { CreateIpkLeaddInput } from './dto/create-lead.input';
import { LeadListArgs } from './dto/lead-list.args';
import { LeadPage } from './entities/lead-page.model';

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
  // @Query(() => [IpkLeaddEntity], { name: 'ipkLeadds' })
  // ipkLeadds() {
  //   return this.service.list();
  // }
  // @Query(() => IpkLeaddEntity, { name: 'ipkLeadd' })
  // ipkLeadd(@Args('id', { type: () => ID }) id: string) {
  //   return this.service.findOne(id);
  // }
}
