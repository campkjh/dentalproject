-- 계좌정보는 공개 hospitals 조회에서 분리하며, 서버의 소유 확인 뒤에만 조회한다.
CREATE TABLE public.hospital_payment_settings (
  hospital_id uuid PRIMARY KEY REFERENCES public.hospitals(id) ON DELETE CASCADE,
  app_payment_requested boolean NOT NULL,
  bank_name text NOT NULL DEFAULT '',
  account_number text NOT NULL DEFAULT '',
  account_holder text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hospital_payment_account_valid CHECK (
    length(bank_name) <= 40 AND length(account_holder) <= 60
    AND ((NOT app_payment_requested AND bank_name = '' AND account_number = '' AND account_holder = '')
      OR (length(trim(bank_name)) > 0 AND length(trim(account_holder)) > 0 AND account_number ~ '^[0-9]{6,30}$'))
  )
);
ALTER TABLE public.hospital_payment_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hospital_payment_settings FROM anon, authenticated;
GRANT ALL ON public.hospital_payment_settings TO service_role;

CREATE FUNCTION public.save_hospital_payment_settings(p_hospital_id uuid, p_methods text[], p_settings jsonb)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF jsonb_typeof(p_settings->'appPaymentRequested') IS DISTINCT FROM 'boolean'
    OR (('앱결제' = ANY(p_methods)) IS DISTINCT FROM (p_settings->>'appPaymentRequested')::boolean) THEN
    RAISE EXCEPTION '앱결제 신청 여부와 예약방식을 확인해 주세요.';
  END IF;
  UPDATE public.hospitals SET booking_methods = p_methods WHERE id = p_hospital_id;
  IF NOT FOUND THEN RAISE EXCEPTION '병원을 찾을 수 없습니다.'; END IF;
  INSERT INTO public.hospital_payment_settings (hospital_id, app_payment_requested, bank_name, account_number, account_holder)
  VALUES (p_hospital_id, (p_settings->>'appPaymentRequested')::boolean,
    p_settings->>'bankName', p_settings->>'accountNumber', p_settings->>'accountHolder')
  ON CONFLICT (hospital_id) DO UPDATE SET
    app_payment_requested = EXCLUDED.app_payment_requested, bank_name = EXCLUDED.bank_name,
    account_number = EXCLUDED.account_number, account_holder = EXCLUDED.account_holder, updated_at = now();
END $$;
REVOKE ALL ON FUNCTION public.save_hospital_payment_settings(uuid, text[], jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_hospital_payment_settings(uuid, text[], jsonb) TO service_role;

-- 신청과 계좌 저장 중 하나라도 실패하면 병원 생성도 함께 취소한다.
CREATE FUNCTION public.create_hospital_application_with_payment(p_hospital jsonb, p_settings jsonb, p_methods text[])
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO public.hospitals (name, category, phone, tags, cover_images, address, owner_id, status, submitted_documents, booking_methods)
  VALUES (p_hospital->>'name', p_hospital->>'category', p_hospital->>'phone',
    ARRAY(SELECT jsonb_array_elements_text(p_hospital->'tags')), ARRAY[]::text[],
    p_hospital->>'address', (p_hospital->>'owner_id')::uuid, 'pending', p_hospital->'submitted_documents', p_methods)
  RETURNING id INTO v_id;
  PERFORM public.save_hospital_payment_settings(v_id, p_methods, p_settings);
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.create_hospital_application_with_payment(jsonb, jsonb, text[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_hospital_application_with_payment(jsonb, jsonb, text[]) TO service_role;
