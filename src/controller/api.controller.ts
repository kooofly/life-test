import { Inject, Controller, Get, Query } from '@midwayjs/core';
import { Context } from '@midwayjs/koa';
import { UserService } from '../service/user.service';
import { GuitarService } from '../service/guitar.service';

@Controller('/api')
export class APIController {
  @Inject()
  ctx: Context;

  @Inject()
  userService: UserService;

  @Inject()
  guitarService: GuitarService;

  @Get('/get_user')
  async getUser(@Query('uid') uid) {
    const user = await this.userService.getUser({ uid });
    return { success: true, message: 'OK', data: user };
  }

  @Get('/guitar/all')
  async getGuitarAll() {
    const result = await this.guitarService.getGuitarAll();
    return result;
  }
}
