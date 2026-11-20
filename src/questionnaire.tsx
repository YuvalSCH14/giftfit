// The gift questionnaire ("למי המתנה?"): one question per step, then a review of all answers.
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AGE_GROUPS, INTERESTS, OCCASIONS, REGIONS, RELATIONS, validateSearch, type Gift, type Interest } from './catalog';
import { Choices, Price, PrimaryButton, asset, illustration } from './components';
import './questionnaire.css';
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

/** The six questions, in the order of the rows in the Figma frame. Labels are the frame's row labels. */
const STEPS = ['occasion', 'relation', 'age', 'interests', 'budget', 'location'] as const;
type StepKey = (typeof STEPS)[number];
/** Step index of the review that follows the last question. */
const REVIEW = STEPS.length;
const BUDGET = STEPS.indexOf('budget');

const LABELS: Record<StepKey, string> = {
  occasion: 'סוג האירוע',
  relation: 'קרבה למקבל המתנה',
  age: 'גיל מקבל המתנה',
  interests: 'תחומי עניין',
  budget: 'תקציב',
  location: 'מיקום',
};

const HINTS: Partial<Record<StepKey, string>> = {
  interests: 'אפשר לבחור כמה',
  budget: 'אפשר למלא רק מינימום או רק מקסימום',
};

function isAnswered(form: SearchForm, key: StepKey): boolean {
  switch (key) {
    case 'occasion':
      return form.occasion !== null;
    case 'relation':
      return form.relation !== null;
    case 'age':
      return form.age !== null;
    case 'interests':
      return form.unsureInterests || form.interests.length > 0;
    case 'budget':
      return form.budgetMin.trim() !== '' || form.budgetMax.trim() !== '';
    case 'location':
      return form.fulfilment !== null;
  }
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

function summary(form: SearchForm, key: StepKey): ReactNode {
  switch (key) {
    case 'occasion':
      return form.occasion ? OCCASIONS[form.occasion] : '';
    case 'relation':
      return form.relation ? RELATIONS[form.relation] : '';
    case 'age':
      return form.age ? AGE_GROUPS[form.age] : '';
    case 'interests':
      return form.unsureInterests ? 'לא בטוחה' : form.interests.map((i) => INTERESTS[i]).join(', ');
    case 'budget':
      return budgetSummary(form);
    case 'location':
      if (form.fulfilment === 'delivery') return 'משלוח';
      if (form.fulfilment === 'pickup') return `איסוף${form.region ? `, ${REGIONS[form.region]}` : ''}`;
      return '';
  }
}

/**
 * The questionnaire keeps its step in the browser history entry, so the phone's Back
 * gesture walks back through the questions without leaving the screen.
 */
interface WizardEntry {
  gfStep: number;
  /** How many wizard entries were pushed before this one in this visit. */
  gfDepth: number;
  /** Editing one answer from the review: confirming returns to the review. */
  gfReturn?: boolean;
}

function readEntry(): WizardEntry | null {
  try {
    const state = window.history.state as Partial<WizardEntry> | null;
    if (state && typeof state.gfStep === 'number' && state.gfStep >= 0 && state.gfStep <= REVIEW) {
      return { gfStep: state.gfStep, gfDepth: state.gfDepth ?? 0, gfReturn: state.gfReturn === true };
    }
  } catch {
    // Some embedded hosts do not expose history state.
  }
  return null;
}

function writeEntry(entry: WizardEntry, mode: 'push' | 'replace') {
  try {
    if (mode === 'push') window.history.pushState(entry, '');
    else window.history.replaceState(entry, '');
  } catch {
    // Without history the in-page Back button still works.
  }
}

/** Where to open: the review when editing a finished search, otherwise the first unanswered question. */
function openingStep(form: SearchForm, submitted: boolean): number {
  if (submitted) return REVIEW;
  if (JSON.stringify(form) === JSON.stringify(EMPTY_FORM)) return 0;
  const next = STEPS.findIndex((key) => !isAnswered(form, key));
  return next === -1 ? REVIEW : next;
}

/** How long a tapped choice stays visible before the next question appears. */
const ADVANCE_DELAY = 180;

export function Questionnaire() {
  const { search, setFlowActive } = useApp();
  const { form } = search;

  const [opening] = useState(() => {
    const entry = readEntry();
    return entry ? { step: entry.gfStep, editing: entry.gfReturn === true } : { step: openingStep(form, search.submitted), editing: false };
  });
  const [step, setStep] = useState(opening.step);
  /** True while changing a single answer from the review. */
  const [editing, setEditing] = useState(opening.editing);
  // The process has begun once a question was answered or skipped, or when opening past the first one.
  const [started, setStarted] = useState(() => !(opening.step === 0 && JSON.stringify(form) === JSON.stringify(EMPTY_FORM)));
  const [error, setError] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  // The bottom bar steps aside while the process is under way and always returns on leaving.
  useEffect(() => {
    setFlowActive(started);
    return () => setFlowActive(false);
  }, [started, setFlowActive]);

  const show = useCallback((next: number, edit: boolean) => {
    window.clearTimeout(timer.current);
    moved.current = true;
    setError(null);
    setStep(next);
    setEditing(edit);
  }, []);

  useEffect(() => {
    if (!readEntry()) writeEntry({ gfStep: opening.step, gfDepth: 0 }, 'replace');
    const onPop = () => {
      const entry = readEntry();
      if (entry) show(entry.gfStep, entry.gfReturn === true);
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.clearTimeout(timer.current);
    };
  }, [opening.step, show]);

  // After moving between steps, start at the top and let a screen reader read the new question.
  useEffect(() => {
    if (!moved.current) return;
    window.scrollTo(0, 0);
    heading.current?.focus({ preventScroll: true });
  }, [step]);

  const go = (next: number, edit = false) => {
    writeEntry({ gfStep: next, gfDepth: (readEntry()?.gfDepth ?? 0) + 1, gfReturn: edit }, 'push');
    show(next, edit);
  };

  /** Moves on from the current question: to the next one, or back to the review when editing. */
  const advance = (from: number, edit: boolean) => {
    setStarted(true);
    if (!edit) {
      go(from + 1);
      return;
    }
    const entry = readEntry();
    if (entry?.gfReturn && entry.gfDepth > 0) window.history.back();
    else go(REVIEW);
  };

  const back = () => {
    if ((readEntry()?.gfDepth ?? 0) > 0) {
      window.history.back();
      return;
    }
    // Opened part-way (pre-filled or editing): step back in place.
    const previous = step === REVIEW ? STEPS.length - 1 : step - 1;
    writeEntry({ gfStep: previous, gfDepth: 0 }, 'replace');
    show(previous, false);
  };

  const set = (patch: Partial<SearchForm>) => {
    setError(null);
    search.setForm({ ...form, ...patch });
  };

  /** A tapped choice shows as selected for a moment, then the next question appears. */
  const advanceSoon = () => {
    const from = step;
    const edit = editing;
    setStarted(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => advance(from, edit), ADVANCE_DELAY);
  };

  const pickSingle = <K extends 'occasion' | 'relation' | 'age'>(field: K, key: SearchForm[K]) => {
    const cleared = form[field] === key;
    set({ [field]: cleared ? null : key } as Partial<SearchForm>);
    if (cleared) window.clearTimeout(timer.current);
    else advanceSoon();
  };

  const toggleInterest = (interest: Interest) =>
    set({
      unsureInterests: false,
      interests: form.interests.includes(interest) ? form.interests.filter((i) => i !== interest) : [...form.interests, interest],
    });

  const isReview = step === REVIEW;
  const key = isReview ? null : STEPS[step];
  const answered = key ? isAnswered(form, key) : false;
  const dirty = JSON.stringify(form) !== JSON.stringify(EMPTY_FORM);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    window.clearTimeout(timer.current);
    const problem = validateSearch(toSearch(form));
    if (isReview) {
      if (problem) {
        go(BUDGET, true);
        setError(problem);
        return;
      }
      search.submit(form);
      navigate('results');
      return;
    }
    // A reversed budget is fixed on the budget question, with the typed values kept.
    if (key === 'budget' && problem) {
      setError(problem);
      return;
    }
    advance(step, editing);
  };

  const clear = () => {
    window.clearTimeout(timer.current);
    search.reset();
    setStarted(false);
    writeEntry({ gfStep: 0, gfDepth: readEntry()?.gfDepth ?? 0 }, 'replace');
    show(0, false);
  };

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

  const question = () => {
    switch (key) {
      case 'occasion':
        return <Choices legend={LABELS.occasion} options={OCCASIONS} selected={form.occasion ? [form.occasion] : []} onPick={(k) => pickSingle('occasion', k)} />;
      case 'relation':
        return <Choices legend={LABELS.relation} options={RELATIONS} selected={form.relation ? [form.relation] : []} onPick={(k) => pickSingle('relation', k)} />;
      case 'age':
        return <Choices legend={LABELS.age} options={AGE_GROUPS} selected={form.age ? [form.age] : []} onPick={(k) => pickSingle('age', k)} />;
      case 'interests':
        return (
          <>
            <Choices legend="תחומי עניין, אפשר לבחור כמה" options={INTERESTS} selected={form.interests} multiple onPick={toggleInterest} />
            <label className="chip chip-unsure">
              <input
                type="checkbox"
                checked={form.unsureInterests}
                onChange={(e) => set({ unsureInterests: e.target.checked, interests: e.target.checked ? [] : form.interests })}
              />
              <span>לא בטוחה</span>
            </label>
          </>
        );
      case 'budget':
        return (
          <>
            <div className="budget">
              {budgetField('מינימום (₪)', 'budgetMin')}
              {budgetField('מקסימום (₪)', 'budgetMax')}
            </div>
            {error && (
              <p id="budget-error" className="error" role="alert">
                {error}
              </p>
            )}
          </>
        );
      case 'location':
        return (
          <>
            <Choices
              legend="אופן קבלה"
              options={{ pickup: 'איסוף עצמי', delivery: 'משלוח' }}
              selected={form.fulfilment ? [form.fulfilment] : []}
              onPick={(k) => {
                const cleared = form.fulfilment === k;
                set({ fulfilment: cleared ? null : k });
                // Delivery needs nothing more; pickup goes on to ask for the region.
                if (!cleared && k === 'delivery') advanceSoon();
                else window.clearTimeout(timer.current);
              }}
            />
            {form.fulfilment === 'pickup' && (
              <>
                <p className="hint">באיזה אזור נוח לאסוף?</p>
                <Choices
                  legend="אזור איסוף"
                  options={REGIONS}
                  selected={form.region ? [form.region] : []}
                  onPick={(k) => {
                    const cleared = form.region === k;
                    set({ region: cleared ? null : k });
                    if (cleared) window.clearTimeout(timer.current);
                    else advanceSoon();
                  }}
                />
              </>
            )}
          </>
        );
      default:
        return null;
    }
  };

  const progressText = isReview ? 'סיכום הבחירות' : `שאלה ${step + 1} מתוך ${STEPS.length}`;

  return (
    <main className="screen screen-search">
      {step === 0 && <Gallery />}
      <form className="wizard" onSubmit={submit} noValidate>
        {step > 0 && (
          <button type="button" className="back wizard-back" onClick={back}>
            <img src={asset('chevron.svg')} alt="" width={14} height={7} />
            חזרה
          </button>
        )}
        <h1>למי המתנה?</h1>

        <div className="wizard-progress">
          <span className="wizard-dots" aria-hidden="true">
            {STEPS.map((stepKey, index) => (
              <span key={stepKey} className={index === step ? 'current' : isReview || index < step || isAnswered(form, stepKey) ? 'done' : undefined} />
            ))}
          </span>
          <span className="wizard-count" role="status">
            {progressText}
          </span>
        </div>

        {/* Keyed by step so each question settles in as it appears. */}
        <div className="wizard-step" key={step}>
          {key ? (
            <section className="wizard-card" aria-labelledby="wizard-question">
              <h2 id="wizard-question" ref={heading} tabIndex={-1}>
                {LABELS[key]}
              </h2>
              {HINTS[key] && <p className="hint wizard-hint">{HINTS[key]}</p>}
              {question()}
            </section>
          ) : (
            <section aria-labelledby="wizard-question">
              <h2 id="wizard-question" ref={heading} tabIndex={-1} className="wizard-review-title">
                אפשר לשנות כל תשובה
              </h2>
              <ul className="wizard-review">
                {STEPS.map((stepKey, index) => {
                  const value = summary(form, stepKey);
                  return (
                    <li key={stepKey}>
                      <button type="button" className="wizard-row" onClick={() => go(index, true)}>
                        <span className="wizard-row-label">{LABELS[stepKey]}</span>
                        <span className={`wizard-row-value${value ? '' : ' wizard-row-empty'}`}>{value || 'לא נבחר'}</span>
                        <img src={asset('chevron.svg')} alt="" width={14} height={7} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>

        <div className="wizard-actions">
          {isReview ? (
            <PrimaryButton type="submit">מצא לי מתנות מתאימות</PrimaryButton>
          ) : (
            <PrimaryButton type="submit" quiet={!answered && !editing}>
              {editing ? 'אישור' : answered ? 'המשך' : 'דילוג על השאלה'}
            </PrimaryButton>
          )}
        </div>
        {dirty && (
          <button type="button" className="text-link" onClick={clear}>
            ניקוי הבחירות
          </button>
        )}
      </form>
    </main>
  );
}
