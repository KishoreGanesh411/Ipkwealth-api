// // src/app/lead/lead.controller.ts
// import {
//   Body,
//   Controller,
//   Get,
//   Param,
//   Post,
//   Patch,
//   Delete,
// } from '@nestjs/common';
// import { IpkLeaddService } from './ipk-leadd.service';

// @Controller('ipk-leadd')
// export class LeadController {
//   constructor(private readonly service: IpkLeaddService) {}

//   @Post()
//   create(@Body() body: any) {
//     return this.service.create(body);
//   }

//   @Get()
//   findAll() {
//     return this.service.findAll();
//   }

//   @Get(':id')
//   findOne(@Param('id') id: string) {
//     return this.service.findOne(id);
//   }

//   @Patch(':id')
//   update(@Param('id') id: string, @Body() body: any) {
//     return this.service.update({ id, ...body });
//   }

//   @Delete(':id')
//   remove(@Param('id') id: string) {
//     return this.service.remove(id);
//   }
// }
