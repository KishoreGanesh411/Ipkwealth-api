import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { UserApiService } from './user-api.service';
import { CreateUserInput } from './dto/create-user.dto';
import { UserEntity } from './entities/user.entity';
// import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';

@Controller('users')
export class UserController {
  constructor(private readonly users: UserApiService) { }

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
  // @UseGuards(FirebaseAuthGuard)
  // @Post('profile')
  // async getProfile(@Req() req) {
  //   const userToken = req.user;
  //   const dbUser = await this.userApiService.getUserByFirebaseUid(userToken.uid);
  //   if (!dbUser) {
  //     // optionally you may auto-create user here if policy allows
  //     throw new UnauthorizedException('User not found in database');
  //   }
  //   return {
  //     id: dbUser.id,
  //     name: dbUser.name,
  //     email: dbUser.email,
  //     role: dbUser.role,
  //     firebaseUid: dbUser.firebaseUid,
  //   };
  // }
}
