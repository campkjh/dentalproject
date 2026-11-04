-- Keep a durable link to each reward even if a review is later removed.
alter table public.point_history add column if not exists review_id uuid;
create unique index if not exists point_history_review_reward_unique
  on public.point_history(review_id) where review_id is not null;

-- Called only by the authenticated server route after validating the review.
-- The profile lock serializes concurrent submissions from one member.
create or replace function public.create_review_with_points(p_author_id uuid, p_review jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_review_id uuid;
  v_point_id uuid;
  v_points integer;
  v_hospital_id uuid := (p_review->>'hospital_id')::uuid;
  v_product_id uuid := (p_review->>'product_id')::uuid;
  v_reservation_id uuid := (p_review->>'reservation_id')::uuid;
  v_date date := (p_review->>'treatment_date')::date;
begin
  perform 1 from public.profiles where id = p_author_id for update;
  if not found then raise exception 'Member profile not found' using errcode = 'P0002'; end if;
  if v_hospital_id is null then raise exception 'Hospital is required' using errcode = '22023'; end if;
  if exists (
    select 1 from public.reviews r
    where (v_reservation_id is not null and r.reservation_id = v_reservation_id)
       or (r.author_id = p_author_id
           and ((v_product_id is not null and r.product_id = v_product_id)
                or (v_product_id is null and r.hospital_id = v_hospital_id))
           and (v_date is null or r.treatment_date = v_date))
  ) then raise exception 'Review already exists' using errcode = '23505'; end if;

  insert into public.reviews (
    author_id, hospital_id, product_id, reservation_id, doctor_id, rating, content,
    treatment_name, treatment_date, total_cost, before_image, after_image
  ) values (
    p_author_id, v_hospital_id, v_product_id, v_reservation_id, (p_review->>'doctor_id')::uuid,
    (p_review->>'rating')::numeric, p_review->>'content', p_review->>'treatment_name', v_date,
    coalesce((p_review->>'total_cost')::integer, 0), p_review->>'before_image', p_review->>'after_image'
  ) returning id into v_review_id;

  insert into public.point_history(user_id, type, description, amount, review_id)
    values(p_author_id, 'earn', '후기작성', 500, v_review_id) returning id into v_point_id;
  update public.profiles set points = points + 500 where id = p_author_id returning points into v_points;
  return jsonb_build_object('id', v_review_id, 'pointHistoryId', v_point_id, 'pointsAwarded', 500, 'points', v_points);
end;
$$;
revoke all on function public.create_review_with_points(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.create_review_with_points(uuid, jsonb) to service_role;
