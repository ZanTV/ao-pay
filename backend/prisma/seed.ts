import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin@123456', 12);

  const superAdmin = await prisma.admin.upsert({
    where: { email: 'ortoman95@gmail.com' },
    update: {
      phone: '+255659721405',
    },
    create: {
      email: 'ortoman95@gmail.com',
      passwordHash,
      firstName: 'Ortoman',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      phone: '+255659721405',
    },
  });

  const gateways = [
    {
      name: 'stripe',
      slug: 'stripe',
      displayName: 'Stripe',
      supportedCurrencies: ['USD', 'EUR', 'GBP'],
      supportedMethods: ['visa', 'mastercard', 'apple_pay', 'google_pay'],
    },
    {
      name: 'paypal',
      slug: 'paypal',
      displayName: 'PayPal',
      supportedCurrencies: ['USD', 'EUR', 'GBP'],
      supportedMethods: ['paypal'],
    },
    {
      name: 'flutterwave',
      slug: 'flutterwave',
      displayName: 'Flutterwave',
      supportedCurrencies: ['USD', 'NGN', 'KES', 'TZS', 'UGX'],
      supportedMethods: ['visa', 'mastercard', 'mobile_money', 'bank'],
    },
    {
      name: 'pesapal',
      slug: 'pesapal',
      displayName: 'Pesapal',
      supportedCurrencies: ['KES', 'TZS', 'UGX', 'USD'],
      supportedMethods: ['visa', 'mastercard', 'mobile_money'],
    },
    {
      name: 'selcom',
      slug: 'selcom',
      displayName: 'Selcom',
      supportedCurrencies: ['TZS', 'USD'],
      supportedMethods: ['mobile_money', 'bank'],
    },
    {
      name: 'dpo',
      slug: 'dpo',
      displayName: 'DPO Pay',
      supportedCurrencies: ['USD', 'KES', 'TZS', 'ZAR'],
      supportedMethods: ['visa', 'mastercard', 'mobile_money'],
    },
  ];

  for (const gateway of gateways) {
    await prisma.gateway.upsert({
      where: { slug: gateway.slug },
      update: gateway,
      create: gateway,
    });
  }

  const currencies = [
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
    { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh' },
    { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh' },
    { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  ];

  for (const currency of currencies) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      update: currency,
      create: currency,
    });
  }

  const paymentMethods = [
    { name: 'PayPal', slug: 'paypal', icon: 'paypal' },
    { name: 'Visa', slug: 'visa', icon: 'visa' },
    { name: 'MasterCard', slug: 'mastercard', icon: 'mastercard' },
    { name: 'Apple Pay', slug: 'apple_pay', icon: 'apple_pay' },
    { name: 'Google Pay', slug: 'google_pay', icon: 'google_pay' },
    { name: 'Bank Transfer', slug: 'bank', icon: 'bank' },
    { name: 'Mobile Money', slug: 'mobile_money', icon: 'mobile_money' },
  ];

  for (const method of paymentMethods) {
    await prisma.paymentMethod.upsert({
      where: { slug: method.slug },
      update: method,
      create: method,
    });
  }

  await prisma.systemSetting.upsert({
    where: { key: 'company' },
    update: {
      value: {
        name: 'AO PAY',
        tagline: 'Create Payment Links. Get Paid Anywhere.',
        email: 'ortoman95@gmail.com',
        phone: '+255659721405',
        country: 'Tanzania',
        currency: 'TZS',
        address: 'Dar es Salaam, Tanzania',
        logo: '',
        primaryColor: '#0F172A',
        secondaryColor: '#1E40AF',
        accentColor: '#3B82F6',
      },
    },
    create: {
      key: 'company',
      value: {
        name: 'AO PAY',
        tagline: 'Create Payment Links. Get Paid Anywhere.',
        email: 'ortoman95@gmail.com',
        phone: '+255659721405',
        country: 'Tanzania',
        currency: 'TZS',
        address: 'Dar es Salaam, Tanzania',
        logo: '',
        primaryColor: '#0F172A',
        secondaryColor: '#1E40AF',
        accentColor: '#3B82F6',
      },
    },
  });

  console.log('Seed completed. Super Admin:', superAdmin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
