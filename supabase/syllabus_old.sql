-- HSC Extension 1 papers from 2015-2019 were set on the previous syllabus. Their questions on content that has since left
-- the course (circle geometry, the parametric parabola, simple harmonic motion, Newton's method, limits, angles between
-- lines...) are uploaded with the topic 'Old Syllabus'. This adds that rule to the function syllabus.sql made, so they are
-- flagged "most likely not in syllabus" like the others, then re-flags the Extension 1 questions. Run it once in the SQL editor.
create or replace function public.syllabus_note_for(subj text, tp text, txt text) returns text
language sql immutable as $f$
  select case
    when subj = 'Ext1' and tp = 'Old Syllabus'
      then 'From an HSC paper set before 2020: this topic is not in the current Extension 1 course.'
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

update public.questions q set syllabus_note = public.syllabus_note_for(p.subject, q.topic, coalesce(q.text, ''))
  from public.papers p where p.id = q.paper_id and p.subject = 'Ext1';
