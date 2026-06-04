-- Movement dates are user-selected accounting dates. Require them explicitly and reject future dates.
alter table public.movements
  alter column date drop default;

alter table public.movements
  add constraint movements_date_not_future check (date <= current_date);
