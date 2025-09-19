import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { UserApiService } from './user-api.service';
import { CreateUserInput } from './dto/create-user.dto';
import { UserEntity } from './entities/user.entity';

@Controller('users')
export class UserController {
  constructor(private readonly users: UserApiService) {}

  // Create a user
  @Post()
  create(@Body() dto: CreateUserInput): Promise<UserEntity> {
    return this.users.createUser(dto);
  }

  // Find a user by id
  @Get(':id')
  findOne(@Param('id') id: string): Promise<UserEntity | null> {
    return this.users.getUser(id);
  }

  // Soft delete a user (archived = true)
  @Delete(':id')
  remove(@Param('id') id: string): Promise<UserEntity> {
    return this.users.deleteUser(id);
  }
}
