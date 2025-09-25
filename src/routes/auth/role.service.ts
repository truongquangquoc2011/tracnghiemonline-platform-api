import { Injectable } from '@nestjs/common'
import { RoleName } from 'src/shared/constants/role.constant'
import { PrismaService } from 'src/shared/services/prisma.service'

@Injectable()
export class RolesService {
  constructor(private readonly prismaService: PrismaService) {}

  // Variable used to temporarily store (cache) the "Client" role ID
  // Initially set to null, will be assigned after the first database query
  // avoid calling database multiple times
  private clientRoleId: string | null = null

  //get roleid of database
  async getClientRoleId() {
    if (this.clientRoleId) {
      return this.clientRoleId
    }
    const role = await this.prismaService.role.findUniqueOrThrow({
      where: {
        name: RoleName.Client,
      },
    })
    this.clientRoleId = role.id

    return role.id
  }
}
