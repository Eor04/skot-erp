const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'admin@skot.com' },
    update: {},
    create: {
      email: 'admin@skot.com',
      name: 'Admin Principal',
      password: hashedPassword,
      role: 'ADMIN',
      active: true,
    },
  });
  
  console.log('Usuario creado exitosamente:');
  console.log('Email:', user.email);
  console.log('Contraseña: admin123');
  console.log('Rol:', user.role);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
