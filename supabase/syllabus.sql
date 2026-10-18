-- Questions from the 2017-syllabus trials that are most likely outside the 2024 maths syllabuses (first HSC 2027).
-- syllabus_note is set by a trigger from the question's subject, topic and text, so new uploads are flagged automatically.
alter table public.questions add column if not exists syllabus_note text;

create or replace function public.syllabus_note_for(subj text, tp text, txt text) returns text
language sql immutable as $f$
  select case
    when subj = 'Ext1' and (tp = 'Normal Approx.' or txt ~* '(normal approximation|sample proportion|p̂|p-hat)')
      then 'The normal approximation to the binomial is not in the 2024 syllabus.'
    when subj = 'Ext1' and (txt ~* 't[- ]?formula|t[- ]results?\M' or (coalesce(tp, '') in ('Identities', 'Trig. Eqns', '') and txt ~* '\mt\s*[=~]\s*tan'))
      then 'The t-formulae are not in the 2024 syllabus.'
    when subj = 'Ext1' and txt ~* '(products? (to|as) (a )?sums?|sums? (to|as) products?)'
      then 'Products-to-sums identities are not in the 2024 syllabus.'
    when subj = 'Ext1' and txt ~* 'pigeonhole'
      then 'The pigeonhole principle is not in the 2024 syllabus.'
    when subj = 'Adv' and txt ~* '(correlation|regression|least[- ]squares?|line of best fit|pearson|scatter ?plot|bivariate|extrapolat)'
      then 'Correlation and regression are not in the 2024 syllabus.'
    when subj = 'Adv' and coalesce(tp, '') not in ('Continuous Probability Distributions', 'The Normal Distribution')
         and txt ~* '(box[- ]?(and[- ]whisker|plot)|interquartile|\mIQR\M|outlier|quartile|five[- ]number|stem[- ]and[- ]leaf)'
      then 'Box plots, quartiles and outliers are not in the 2024 syllabus.'
    when subj = 'Adv' and txt ~* '(interest factor|recurrence relation)'
      then 'Annuity tables and recurrence relations are not in the 2024 syllabus.'
  end
$f$;

create or replace function public.questions_syllabus_note() returns trigger
language plpgsql as $f$
begin
  new.syllabus_note := public.syllabus_note_for((select subject from public.papers where id = new.paper_id), new.topic, coalesce(new.text, ''));
  return new;
end
$f$;

drop trigger if exists questions_syllabus_note on public.questions;
create trigger questions_syllabus_note before insert or update of text, topic, paper_id on public.questions
  for each row execute function public.questions_syllabus_note();

update public.questions q set syllabus_note = public.syllabus_note_for(p.subject, q.topic, coalesce(q.text, ''))
  from public.papers p where p.id = q.paper_id;

-- 1-based pages of the paper each question is on (upload.py fills it), so the PDF preview can name flagged questions on each page
alter table public.questions add column if not exists pages int[];
