export const up = async (queryInterface, { models }) => {
  await queryInterface.bulkInsert('users', [
    {
      name: 'Administrador',
      email: 'admin@adminjs.com',
      password: '$2b$12$l1bHrac77.lU29M0M4Q34ORHqKByUUvHhrpU6cugl1CbxPCUrsXrm',
      role: 'admin',
      status: 1,
      phone: '+51 999 999 999',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);

  console.log('✅ Seed completed');
};

export const down = async (queryInterface) => {
  await queryInterface.bulkDelete('users', null, {});
};
