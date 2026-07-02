export const siteConfig = {
  companyName: process.env.NEXT_PUBLIC_COMPANY_NAME || '메니디티',
  representative: process.env.NEXT_PUBLIC_COMPANY_REPRESENTATIVE || '대표자 미등록',
  businessNumber: process.env.NEXT_PUBLIC_COMPANY_BUSINESS_NUMBER || '사업자등록번호 미등록',
  mailOrderNumber: process.env.NEXT_PUBLIC_COMPANY_MAIL_ORDER_NUMBER || '통신판매업신고번호 미등록',
  postalCode: process.env.NEXT_PUBLIC_COMPANY_POSTAL_CODE || '',
  address:
    process.env.NEXT_PUBLIC_COMPANY_ADDRESS ||
    '서울특별시 금천구 가산디지털1로 225, 11층 1123-에이-2호',
  phone: process.env.NEXT_PUBLIC_COMPANY_PHONE || '고객센터 번호 미등록',
  email: process.env.NEXT_PUBLIC_COMPANY_EMAIL || '이메일 미등록',
  copyrightName: process.env.NEXT_PUBLIC_COPYRIGHT_NAME || '마이닥',
};
