import { Logger } from '@nestjs/common'
import { envConfig } from 'src/shared/config'
import { RoleName } from 'src/shared/constants/role.constant'
import { HashingService } from 'src/shared/services/hashing.service'
import { PrismaService } from 'src/shared/services/prisma.service'

// Define default roles to seed
const predefinedRoles = [
  {
    name: RoleName.ProAdmin,
    slug: 'proadmin',
    displayName: 'Pro Admin',
    description: 'Administrator Pro role with full access',
  },
  {
    name: RoleName.Admin,
    slug: 'admin',
    displayName: 'Admin',
    description: 'Administrator role with full access',
  },
  {
    name: RoleName.Client,
    slug: 'client',
    displayName: 'Client',
    description: 'Client role with purchase permissions',
  },
]

// Create roles only if none exist
const createRolesIfNotExists = async (prisma: PrismaService) => {
  const roleCount = await prisma.role.count()
  if (roleCount > 0) {
    Logger.warn('Roles already exist. Skipping role creation.')
    return 0
  }
  const { count } = await prisma.role.createMany({ data: predefinedRoles })
  return count
}

// Create the default admin user
const createAdminUser = async (prisma: PrismaService, hashingService: HashingService) => {
  const adminRole = await prisma.role.findFirstOrThrow({
    where: { name: RoleName.Admin },
  })
  const hashedPassword = await hashingService.hashPassword(envConfig.adminPassword)
  const adminUser = await prisma.user.create({
    data: {
      email: envConfig.adminEmail,
      password: hashedPassword,
      firstName: envConfig.adminFirstName,
      lastName: envConfig.adminLastName,
      phone: envConfig.adminPhone,
      role: adminRole.id,
      isEmailVerified: true,
    },
    omit: {
      password: true,
    },
  })

  return adminUser
}

const main = async () => {
  const prisma = new PrismaService()
  const hashingService = new HashingService()
  const createdRoleCount = await createRolesIfNotExists(prisma)
  const adminUser = await createAdminUser(prisma, hashingService)
  return { createdRoleCount, adminUser }
}
main()
  .then(({ createdRoleCount, adminUser }) => {
    console.log(`Created ${createdRoleCount} role(s)`)
    console.log(`Admin user created: ${adminUser.email}`)
  })
  .catch((error) => {
    console.error('Seeding failed:', error.message)
    process.exit(1)
  })
