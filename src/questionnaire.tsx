// The gift questionnaire ("למי המתנה?"): the media block with gift ideas and the questions.
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AGE_GROUPS, INTERESTS, OCCASIONS, REGIONS, RELATIONS, validateSearch, type Gift, type Interest } from './catalog';
import { Choices, Price, PrimaryButton, asset, illustration } from './components';
import { useApp } from './state';
import { EMPTY_FORM, href, navigate, toSearch, type SearchForm } from './storage';

/** One gift per category, so a short row shows variety. */
export function varied(gifts: Gift[], count: number, skip: Set<string> = new Set()): Gift[] {
  const seen = new Set<string>();
  const out: Gift[] = [];
  for (const gift of gifts) {
    if (skip.has(gift.id) || seen.has(gift.category)) continue;
    seen.add(gift.category);
    out.push(gift);
    if (out.length === count) break;
  }
  return out;
}

/** The media block from the questionnaire frame, as a swipeable row of gift ideas with the four dots. */
function Gallery() {
  const { catalog } = useApp();
  const slides = varied([...catalog].reverse(), 4);
  const track = useRef<HTMLDivElement>(null);
  const touched = useRef(false);
  const [current, setCurrent] = useState(0);

  const onScroll = () => {
    const el = track.current;
    if (el) setCurrent(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
  };

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      const el = track.current;
      if (!el || touched.current || document.hidden) return;
      const next = (Math.round(Math.abs(el.scrollLeft) / el.clientWidth) + 1) % slides.length;
      // In an RTL scroller, positions run from 0 down to negative values.
      el.scrollTo({ left: -next * el.clientWidth, behavior: 'smooth' });
    }, 4500);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const stop = () => {
    touched.current = true;
  };

  return (
    <section className="gallery" aria-label="רעיונות למתנות">
      <div className="gallery-track" ref={track} onScroll={onScroll} onPointerDown={stop} onFocus={stop} onWheel={stop}>
        {slides.map((gift) => (
          <a key={gift.id} className="gallery-slide" href={href('gift', gift.id)}>
            <img src={illustration(gift.category)} alt="" width={96} height={96} />
            <span className="gallery-caption">
              {gift.name} · <Price value={gift.price} />
            </span>
          </a>
        ))}
      </div>
      <div className="gallery-dots" aria-hidden="true">
        {slides.map((gift, index) => (
          <span key={gift.id} className={index === current ? 'current' : undefined} />
        ))}
      </div>
    </section>
  );
}

function Row(props: { label: string; value: ReactNode; open: boolean; onToggle: () => void; children: ReactNode }) {
  const id = useId();
  return (
    <div className={`row${props.open ? ' row-open' : ''}`}>
      <button type="button" className="row-head" aria-expanded={props.open} aria-controls={id} onClick={props.onToggle}>
        <span className="row-label">{props.label}</span>
        {props.value && <span className="row-value">{props.value}</span>}
        <img className="row-chevron" src={asset('chevron.svg')} alt="" width={14} height={7} />
      </button>
      <div id={id} className="row-panel" hidden={!props.open}>
        {props.children}
      </div>
    </div>
  );
}

function budgetSummary(form: SearchForm): ReactNode {
  const min = form.budgetMin.trim();
  const max = form.budgetMax.trim();
  if (!min && !max) return '';
  // The range itself reads left to right; the shekel sign follows it in the Hebrew flow.
  if (min && max) {
    return (
      <>
        <bdi dir="ltr">{`${min}–${max}`}</bdi> ₪
      </>
    );
  }
  return (
    <>
      {min ? 'מ־' : 'עד '}
      <bdi dir="ltr">{min || max}</bdi> ₪
    </>
  );
}

const ROWS = ['occasion', 'relation', 'age', 'interests', 'budget', 'location'] as const;
type RowKey = (typeof ROWS)[number];
type SingleField = 'occasion' | 'relation' | 'age';

export function Questionnaire() {
  const { search } = useApp();
  const { form } = search;
  const [open, setOpen] = useState<RowKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const set = (patch: Partial<SearchForm>) => {
    setError(null);
    search.setForm({ ...form, ...patch });
  };
  const toggleRow = (key: RowKey) => setOpen((current) => (current === key ? null : key));

  /** Single-choice rows move on to the next question once answered. */
  const pickSingle = <K extends SingleField>(field: K, key: SearchForm[K]) => {
    const cleared = form[field] === key;
    set({ [field]: cleared ? null : key } as Partial<SearchForm>);
    if (!cleared) setOpen(ROWS[ROWS.indexOf(field) + 1]);
  };
  const toggleInterest = (interest: Interest) =>
    set({
      unsureInterests: false,
      interests: form.interests.includes(interest)
        ? form.interests.filter((i) => i !== interest)
        : [...form.interests, interest],
    });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const problem = validateSearch(toSearch(form));
    if (problem) {
      setError(problem);
      setOpen('budget');
      return;
    }
    search.submit(form);
    navigate('results');
  };

  const interestsValue = form.unsureInterests ? 'לא בטוחה' : form.interests.map((i) => INTERESTS[i]).join(', ');
  const locationValue =
    form.fulfilment === 'delivery'
      ? 'משלוח'
      : form.fulfilment === 'pickup'
        ? `איסוף${form.region ? `, ${REGIONS[form.region]}` : ''}`
        : '';
  const dirty = JSON.stringify(form) !== JSON.stringify(EMPTY_FORM);
  const budgetField = (label: string, field: 'budgetMin' | 'budgetMax') => (
    <label>
      <span>{label}</span>
      <input
        id={field}
        dir="ltr"
        type="number"
        inputMode="numeric"
        min={0}
        step={10}
        placeholder="0"
        value={form[field]}
        onChange={(e) => set({ [field]: e.target.value })}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'budget-error' : undefined}
      />
    </label>
  );

  return (
    <main className="screen screen-search">
      <Gallery />
      <form className="questionnaire" onSubmit={submit} noValidate>
        <h1>למי המתנה?</h1>
        <div className="rows">
          <Row label="סוג האירוע" value={form.occasion ? OCCASIONS[form.occasion] : ''} open={open === 'occasion'} onToggle={() => toggleRow('occasion')}>
            <Choices legend="סוג האירוע" options={OCCASIONS} selected={form.occasion ? [form.occasion] : []} onPick={(k) => pickSingle('occasion', k)} />
          </Row>
          <Row label="קרבה למקבל המתנה" value={form.relation ? RELATIONS[form.relation] : ''} open={open === 'relation'} onToggle={() => toggleRow('relation')}>
            <Choices legend="קרבה למקבל המתנה" options={RELATIONS} selected={form.relation ? [form.relation] : []} onPick={(k) => pickSingle('relation', k)} />
          </Row>
          <Row label="גיל מקבל המתנה" value={form.age ? AGE_GROUPS[form.age] : ''} open={open === 'age'} onToggle={() => toggleRow('age')}>
            <Choices legend="גיל מקבל המתנה" options={AGE_GROUPS} selected={form.age ? [form.age] : []} onPick={(k) => pickSingle('age', k)} />
          </Row>
          <Row label="תחומי עניין" value={interestsValue} open={open === 'interests'} onToggle={() => toggleRow('interests')}>
            <p className="hint hint-first">אפשר לבחור כמה</p>
            <Choices legend="תחומי עניין, אפשר לבחור כמה" options={INTERESTS} selected={form.interests} multiple onPick={toggleInterest} />
            <label className="chip chip-unsure">
              <input
                type="checkbox"
                checked={form.unsureInterests}
                onChange={(e) => set({ unsureInterests: e.target.checked, interests: e.target.checked ? [] : form.interests })}
              />
              <span>לא בטוחה</span>
            </label>
          </Row>
          <Row label="תקציב" value={budgetSummary(form)} open={open === 'budget'} onToggle={() => toggleRow('budget')}>
            <div className="budget">
              {budgetField('מינימום (₪)', 'budgetMin')}
              {budgetField('מקסימום (₪)', 'budgetMax')}
            </div>
            {error && (
              <p id="budget-error" className="error" role="alert">
                {error}
              </p>
            )}
          </Row>
          <Row label="מיקום" value={locationValue} open={open === 'location'} onToggle={() => toggleRow('location')}>
            <Choices
              legend="אופן קבלה"
              options={{ pickup: 'איסוף עצמי', delivery: 'משלוח' }}
              selected={form.fulfilment ? [form.fulfilment] : []}
              onPick={(k) => set({ fulfilment: form.fulfilment === k ? null : k })}
            />
            {form.fulfilment === 'pickup' && (
              <>
                <p className="hint">באיזה אזור נוח לאסוף?</p>
                <Choices legend="אזור איסוף" options={REGIONS} selected={form.region ? [form.region] : []} onPick={(k) => set({ region: form.region === k ? null : k })} />
              </>
            )}
          </Row>
        </div>
        <div className="sticky-cta">
          <PrimaryButton type="submit">מצא לי מתנות מתאימות</PrimaryButton>
        </div>
        {dirty && (
          <button
            type="button"
            className="text-link"
            onClick={() => {
              setError(null);
              setOpen(null);
              search.reset();
            }}
          >
            ניקוי הבחירות
          </button>
        )}
      </form>
    </main>
  );
}
