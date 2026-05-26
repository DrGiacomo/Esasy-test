import { Module } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService, MembershipsService],
  exports: [MembershipsService],
})
export class OrganizationsModule {}
