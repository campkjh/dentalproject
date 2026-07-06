export const siteConfig = {
  companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || '메디니티',
  representative: process.env.NEXT_PUBLIC_COMPANY_REPRESENTATIVE || '정태라',
  businessNumber: process.env.NEXT_PUBLIC_COMPANY_BUSINESS_NUMBER || '889-29-02076',
  mailOrderNumber: process.env.NEXT_PUBLIC_COMPANY_MAIL_ORDER_NUMBER || '',
  postalCode: process.env.NEXT_PUBLIC_COMPANY_POSTAL_CODE || '',
  address:
    process.env.NEXT_PUBLIC_COMPANY_ADDRESS ||
    '서울특별시 송파구 위례서로 252, 318호(거여동, 유원플러스송파)',
  phone: process.env.NEXT_PUBLIC_COMPANY_PHONE || '010-2654-4664',
  email: process.env.NEXT_PUBLIC_COMPANY_EMAIL || 'medinity0105@gmail.com',
  copyrightName: process.env.NEXT_PUBLIC_COPYRIGHT_NAME || '마이닥',
};
