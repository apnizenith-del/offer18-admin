import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";
import crypto from "crypto";

const prisma = new PrismaClient();

function id26() {
  return (crypto.randomUUID().replace(/-/g, "") + "00000000000000000000000000").slice(0, 26);
}

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.ADMIN_PASSWORD ?? "admin1234";

  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (!existing) {
    const passwordHash = await hashPassword(password);
    await prisma.adminUser.create({
      data: {
        id: id26(),
        email,
        username: "admin",
        passwordHash,
        isActive: true,
      },
    });
    console.log(`Created admin: ${email} / ${password}`);
  } else {
    console.log("Admin already exists");
  }

  // Seed minimum permissions
  const perms = [
    { permKey: "offers.create", module: "offers", label: "Create offers" },
    { permKey: "offers.edit", module: "offers", label: "Edit offers" },
    { permKey: "conversions.moderate", module: "conversions", label: "Moderate conversions" },
    { permKey: "payouts.manage", module: "payouts", label: "Manage payouts" },
    { permKey: "audit.view", module: "audit", label: "View audit logs" },
  ];

  const role = await prisma.role.upsert({
    where: { name: "Super Admin" },
    update: {},
    create: { id: id26(), name: "Super Admin" },
  });

  for (const p of perms) {
    const perm = await prisma.permission.upsert({
      where: { permKey: p.permKey },
      update: { module: p.module, label: p.label },
      create: { id: id26(), permKey: p.permKey, module: p.module, label: p.label },
    });

    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
      update: {},
      create: { id: id26(), roleId: role.id, permissionId: perm.id },
    });
  }

  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (admin) {
    await prisma.adminRoleMap.upsert({
      where: { adminId_roleId: { adminId: admin.id, roleId: role.id } },
      update: {},
      create: { id: id26(), adminId: admin.id, roleId: role.id },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
