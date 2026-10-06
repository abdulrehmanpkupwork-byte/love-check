import React, { useState, useEffect, useRef } from 'react';
import { Heart, Sparkles, RefreshCw, Share2, Sun, Moon, Check, ChevronDown, ArrowRight, History, Trash2 } from 'lucide-react';

type PageId = 'home' | 'calc' | 'tips' | 'about';

interface MatchRecord {
  id: string;
  nameA: string;
  nameB: string;
  percent: number;
  message: string;
  timestamp: string;
}

const PAGES: PageId[] = ['home', 'calc', 'tips', 'about'];

/* ========== Result messages (upper limit, message) ========== */
const MESSAGES: [number, string][] = [
  [25, 'Abhi thoda faasla hai, lekin dosti se shuruaat ho sakti hai.'],
  [45, 'Kuch baat to hai! Thoda waqt dein aur aik doosray ko samjhein.'],
  [65, 'Acha jodi hai. Thodi koshish se rishta aur khoobsurat ho sakta hai.'],
  [85, 'Wah! Aap dono aik doosray ke liye bohat khaas hain.'],
  [101, 'Perfect match! Yeh to aasmaan mein likha hua rishta lagta hai.'],
];

const SCALE_ITEMS = [
  { range: '1 – 24%', text: 'Abhi thoda faasla hai, lekin dosti se shuruaat ho sakti hai.' },
  { range: '25 – 44%', text: 'Kuch baat to hai! Aik doosray ko waqt dein.' },
  { range: '45 – 64%', text: 'Acha jodi hai, thodi koshish se aur behtar banegi.' },
  { range: '65 – 84%', text: 'Bohat khaas rishta, aap dono mein acha taal-mel hai.' },
  { range: '85 – 100%', text: 'Perfect match! Aisi jodi kam hi milti hai.' },
];

const LOVE_TIPS = [
  { title: 'Dil se baat karein', desc: 'Roz thoda waqt sirf ek doosray ke liye nikaalein, phone door rakh kar.' },
  { title: 'Shukriya kehna na bhoolein', desc: 'Chhoti baaton par bhi thank you kehne se rishta mazboot hota hai.' },
  { title: 'Dhyan se sunein', desc: 'Jawab dene se pehle poori baat suniye, phir apni raaye dein.' },
  { title: 'Ikhtilaf ko izzat dein', desc: 'Behas mein jeetna zaroori nahi, samajhna zaroori hai.' },
  { title: 'Saath waqt guzaarein', desc: 'Chai, walk ya koi khel, kuch aisa karein jo aap dono ko pasand ho.' },
  { title: 'Waqt par jawab dein', desc: 'Messages ka jawab dena yeh batata hai ke aap samne wale ko ahmiyat dete hain.' },
  { title: 'Chhoti surprises', desc: 'Phool, aik note ya pasandeeda khana, bina kisi mauqe ke bhi khushi dete hain.' },
  { title: 'Maazrat karna seekhein', desc: 'Ghalti maan lena rishtay ko zyada mazboot banata hai.' },
  { title: 'Khwabon par baat karein', desc: 'Aane wale saalon ke baare mein khul kar baat karein taake rasta aik ho.' },
  { title: 'Apni jagah bhi dein', desc: 'Har kisi ko apne shauq aur doston ke liye waqt chahiye hota hai.' },
];

const SAMPLE_PAIRS = [
  ['Ali', 'Sara'],
  ['Zain', 'Ayesha'],
  ['Hamza', 'Fatima'],
  ['Bilal', 'Zoya'],
];

/* ========== Love percent calculation ========== */
// The same two names always give the same percent (order does not matter).
function calculatePercent(nameA: string, nameB: string): number {
  const key = [nameA, nameB]
    .map((s) => s.trim().toLowerCase().replace(/\s+/g, ' '))
    .sort()
    .join('|');

  let hash = 7;
  for (const ch of key) {
    hash = (hash * 31 + ch.charCodeAt(0)) % 100003;
  }

  return 11 + (hash % 90); // result is between 11 and 100
}

function getMessageForPercent(percent: number): string {
  const found = MESSAGES.find((m) => percent < m[0]);
  return found ? found[1] : MESSAGES[MESSAGES.length - 1][1];
}

export default function App() {
  const [activePage, setActivePage] = useState<PageId>(() => {
    const hash = window.location.hash.slice(1) as PageId;
    return PAGES.includes(hash) ? hash : 'home';
  });

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lp_theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  // Calculator state
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');
  const [error, setError] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [targetPercent, setTargetPercent] = useState(0);
  const [displayPercent, setDisplayPercent] = useState(0);
  const [submittedNames, setSubmittedNames] = useState<{ a: string; b: string }>({ a: '', b: '' });
  const [resultMessage, setResultMessage] = useState('');
  const [copiedShare, setCopiedShare] = useState(false);
  const [history, setHistory] = useState<MatchRecord[]>(() => {
    try {
      const saved = localStorage.getItem('lp_recent_matches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const input1Ref = useRef<HTMLInputElement>(null);
  const animFrameRef = useRef<number | null>(null);

  // Sync theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('lp_theme', theme);
    } catch {}
  }, [theme]);

  // Listen to hash changes (back/forward navigation)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1) as PageId;
      if (PAGES.includes(hash)) {
        setActivePage(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const go = (page: PageId) => {
    const targetPage = PAGES.includes(page) ? page : 'home';
    setActivePage(targetPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      window.history.replaceState(null, '', '#' + targetPage);
    } catch {}
  };

  const triggerAnimation = (finalPercent: number) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setDisplayPercent(0);

    const startTime = performance.now();
    const duration = 1400; // milliseconds

    const animate = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      // Smooth ease-out cubic curve while maintaining linear accuracy
      const eased = 1 - Math.pow(1 - progress, 2.2);
      const value = Math.round(finalPercent * eased);

      setDisplayPercent(value);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayPercent(finalPercent);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  };

  const runCalculation = (rawA: string, rawB: string) => {
    const trimmedA = rawA.trim();
    const trimmedB = rawB.trim();

    if (!trimmedA || !trimmedB) {
      setError('Dono naam likhna zaroori hai.');
      return;
    }

    setError('');
    const pct = calculatePercent(trimmedA, trimmedB);
    const msg = getMessageForPercent(pct);

    setSubmittedNames({ a: trimmedA, b: trimmedB });
    setTargetPercent(pct);
    setResultMessage(msg);
    setShowResult(true);
    triggerAnimation(pct);

    // Save to local browser history (purely client-side for convenience)
    const newRecord: MatchRecord = {
      id: `${Date.now()}`,
      nameA: trimmedA,
      nameB: trimmedB,
      percent: pct,
      message: msg,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setHistory((prev) => {
      const filtered = prev.filter(
        (item) =>
          !(
            (item.nameA.toLowerCase() === trimmedA.toLowerCase() &&
              item.nameB.toLowerCase() === trimmedB.toLowerCase()) ||
            (item.nameA.toLowerCase() === trimmedB.toLowerCase() &&
              item.nameB.toLowerCase() === trimmedA.toLowerCase())
          )
      );
      const updated = [newRecord, ...filtered].slice(0, 5);
      try {
        localStorage.setItem('lp_recent_matches', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runCalculation(name1, name2);
  };

  const handleReset = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setShowResult(false);
    setName1('');
    setName2('');
    setError('');
    setDisplayPercent(0);
    setTimeout(() => {
      input1Ref.current?.focus();
    }, 50);
  };

  const handleQuickFill = (a: string, b: string) => {
    setName1(a);
    setName2(b);
    setError('');
    if (activePage !== 'calc') {
      go('calc');
    }
    runCalculation(a, b);
  };

  const handleShare = async () => {
    const shareText = `${submittedNames.a} ♥ ${submittedNames.b} ka Love Percent ${targetPercent}% hai! "${resultMessage}" — Apna bhi check karein!`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Love Percent – Apna pyaar naapein',
          text: shareText,
          url: window.location.href,
        });
        return;
      } catch {
        // Fallback to clipboard copy
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    } catch {}
  };

  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem('lp_recent_matches');
    } catch {}
  };

  const fillY = 90 - (90 * displayPercent) / 100;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-[var(--ink)] selection:bg-[var(--rose)] selection:text-white">
      {/* ========== Header (Top Bar Contract: Brand | Nav Links | Action) ========== */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-[var(--bg)]/90 border-b-2 border-[var(--line)] transition-colors">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          {/* Zone 1: Brand Title */}
          <div
            className="font-display text-2xl sm:text-[1.65rem] text-[var(--rose)] cursor-pointer select-none tracking-tight whitespace-nowrap"
            onClick={() => go('home')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                go('home');
              }
            }}
            role="link"
            tabIndex={0}
          >
            ♥ Love Percent
          </div>

          {/* Zone 2: Navigation Links */}
          <nav
            aria-label="Pages"
            className="order-3 sm:order-2 w-full sm:w-auto flex items-center justify-center gap-1.5 sm:gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--line)]/60 overflow-x-auto"
          >
            {[
              { id: 'home', label: 'Home' },
              { id: 'calc', label: 'Love Calculator' },
              { id: 'tips', label: 'Love Tips' },
              { id: 'about', label: 'About' },
            ].map((item) => {
              const isCurrent = activePage === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => go(item.id as PageId)}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={`font-semibold text-[15px] rounded-full px-3.5 py-1.5 cursor-pointer transition-all whitespace-nowrap shrink-0 border-2 ${
                    isCurrent
                      ? 'bg-[var(--rose)] text-[var(--on-rose)] border-[var(--rose)] shadow-sm'
                      : 'bg-transparent text-[var(--ink)] border-transparent hover:border-[var(--rose)]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Theme Toggle & Quick Action */}
          <div className="order-2 sm:order-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              aria-label={theme === 'light' ? 'Dark mode lagayein' : 'Light mode lagayein'}
              title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
              className="w-10 h-10 rounded-full border-2 border-[var(--line)] bg-[var(--card)] text-[var(--ink)] flex items-center justify-center cursor-pointer hover:border-[var(--rose)] transition-colors"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-[var(--gold)]" />}
            </button>
          </div>
        </div>
      </header>

      {/* ========== Main Content Container ========== */}
      <main className="flex-1 w-full max-w-[920px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* ========== Page 1: Home ========== */}
        {activePage === 'home' && (
          <section id="home" className="page-enter space-y-14">
            {/* Hero Section */}
            <div className="text-center py-6 sm:py-10 px-4 rounded-[32px] bg-[var(--card)] border-2 border-[var(--line)] shadow-sm relative overflow-hidden">
              <svg className="big-heart" viewBox="0 0 100 90" aria-hidden="true">
                <path
                  d="M50 85C10 55 2 35 2 24 2 11 12 3 25 3c10 0 19 6 25 15C56 9 65 3 75 3c13 0 23 8 23 21 0 11-8 31-48 61z"
                  fill="var(--rose)"
                />
              </svg>

              <h1 className="max-w-2xl mx-auto text-[var(--ink)] mb-4">
                Aap ka pyaar kitna strong hai?
              </h1>

              <p className="max-w-[36ch] mx-auto mb-8 text-[var(--muted)] text-lg sm:text-xl leading-relaxed">
                Apna aur apne humsafar ka naam likhein aur dekhein aap dono ka love percent kitna banta hai.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
                <button
                  type="button"
                  onClick={() => go('calc')}
                  className="w-full sm:w-auto font-extrabold text-lg bg-[var(--rose)] hover:bg-[var(--rose2)] text-[var(--on-rose)] rounded-full px-8 py-3.5 cursor-pointer transition-all shadow-md hover:shadow-lg inline-flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <span>Love percent dekhein</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              {/* Quick sample pairs */}
              <div className="mt-8 pt-6 border-t border-[var(--line)]/70 flex flex-wrap items-center justify-center gap-2 text-sm text-[var(--muted)]">
                <span>Misal ke taur par check karein:</span>
                {SAMPLE_PAIRS.map(([a, b], idx) => (
                  <React.Fragment key={a + b}>
                    <button
                      type="button"
                      onClick={() => handleQuickFill(a, b)}
                      className="font-bold text-[var(--rose)] hover:underline cursor-pointer px-1.5 py-0.5 rounded"
                    >
                      {a} ♥ {b}
                    </button>
                    {idx < SAMPLE_PAIRS.length - 1 && <span aria-hidden="true">·</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Key Value Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              <div className="bg-[var(--card)] border-2 border-[var(--line)] rounded-[22px] p-6 text-center sm:text-left">
                <h3 className="text-[var(--rose)] mb-2">Sirf 2 naam</h3>
                <p className="m-0 text-[var(--muted)]">
                  Koi sign-up nahi. Bas dono naam likhein aur result mil jaye.
                </p>
              </div>
              <div className="bg-[var(--card)] border-2 border-[var(--line)] rounded-[22px] p-6 text-center sm:text-left">
                <h3 className="text-[var(--rose)] mb-2">Hamesha same result</h3>
                <p className="m-0 text-[var(--muted)]">
                  Same naamon par har dafa wohi percent aata hai, chahe naam aage peechay likhein.
                </p>
              </div>
              <div className="bg-[var(--card)] border-2 border-[var(--line)] rounded-[22px] p-6 text-center sm:text-left">
                <h3 className="text-[var(--rose)] mb-2">Dosto ke saath share</h3>
                <p className="m-0 text-[var(--muted)]">
                  Result dosto ko dikhayein aur unka percent bhi check karein.
                </p>
              </div>
            </div>

            {/* How it works */}
            <div>
              <h2 className="text-center sm:text-left mb-5">Kaise kaam karta hai?</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                <div className="bg-[var(--card)] border-2 border-[var(--line)] rounded-[22px] p-6">
                  <h3 className="text-[var(--ink)] mb-2">1. Naam likhein</h3>
                  <p className="m-0 text-[var(--muted)]">
                    Calculator page par apna aur apne humsafar ka naam daalein.
                  </p>
                </div>
                <div className="bg-[var(--card)] border-2 border-[var(--line)] rounded-[22px] p-6">
                  <h3 className="text-[var(--ink)] mb-2">2. Formula chalta hai</h3>
                  <p className="m-0 text-[var(--muted)]">
                    Dono naamon ke huroof se aik fixed number banta hai.
                  </p>
                </div>
                <div className="bg-[var(--card)] border-2 border-[var(--line)] rounded-[22px] p-6">
                  <h3 className="text-[var(--ink)] mb-2">3. Result dekhein</h3>
                  <p className="m-0 text-[var(--muted)]">
                    Dil bharta hai aur aap ko percent ke saath aik pyara message milta hai.
                  </p>
                </div>
              </div>
            </div>

            {/* Percent Scale List */}
            <div>
              <h2 className="text-center sm:text-left mb-5">Percent ka matlab kya hai?</h2>
              <ul className="grid gap-3 list-none p-0 m-0">
                {SCALE_ITEMS.map((item) => (
                  <li
                    key={item.range}
                    className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 bg-[var(--card)] border-2 border-[var(--line)] rounded-[18px] px-5 py-4"
                  >
                    <strong className="font-display font-normal text-[var(--rose)] sm:min-w-[105px] text-xl tabular-nums">
                      {item.range}
                    </strong>
                    <span className="text-[var(--ink)]">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Who is it for */}
            <div>
              <h2 className="text-center sm:text-left mb-5">Kis ke liye hai?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                <div className="bg-[var(--card)] border-2 border-[var(--line)] rounded-[22px] p-6">
                  <h3 className="text-[var(--rose)] mb-2">Jodiyon ke liye</h3>
                  <p className="m-0 text-[var(--muted)]">
                    Apne shaadi shuda ya engaged rishtay ka mazay mein percent dekhein.
                  </p>
                </div>
                <div className="bg-[var(--card)] border-2 border-[var(--line)] rounded-[22px] p-6">
                  <h3 className="text-[var(--rose)] mb-2">Doston ke liye</h3>
                  <p className="m-0 text-[var(--muted)]">
                    Crush, class fellow ya best friend ka naam daal kar dosto ke saath hasein.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="text-center py-10 px-6 bg-[var(--card)] border-2 border-[var(--line)] rounded-[26px]">
              <h2 className="mb-2">Tayyar hain?</h2>
              <p className="text-[var(--muted)] mt-0 mb-6 text-lg">Sirf aik minute lagta hai.</p>
              <button
                type="button"
                onClick={() => go('calc')}
                className="w-full sm:w-auto font-extrabold text-lg bg-[var(--rose)] hover:bg-[var(--rose2)] text-[var(--on-rose)] rounded-full px-8 py-3.5 cursor-pointer transition-colors whitespace-nowrap"
              >
                Abhi try karein
              </button>
            </div>
          </section>
        )}

        {/* ========== Page 2: Love Calculator ========== */}
        {activePage === 'calc' && (
          <section id="calc" className="page-enter space-y-12">
            <div className="text-center max-w-xl mx-auto">
              <h2 className="mb-2">Love Calculator</h2>
              <p className="text-[var(--muted)] m-0">
                Apna aur apne khaas insaan ka naam likh kar dekhein aap dono ka dil kitna milta hai.
              </p>
            </div>

            {/* Centered Calculator Card */}
            <div className="max-w-[520px] mx-auto bg-[var(--card)] border-2 border-[var(--line)] rounded-[28px] p-6 sm:p-8 shadow-sm">
              {!showResult ? (
                <form id="f" onSubmit={handleSubmit} className="grid gap-5" noValidate>
                  <div>
                    <label htmlFor="n1" className="block font-extrabold mb-2 text-[var(--ink)]">
                      Aap ka naam
                    </label>
                    <input
                      ref={input1Ref}
                      id="n1"
                      type="text"
                      value={name1}
                      onChange={(e) => {
                        setName1(e.target.value);
                        if (error) setError('');
                      }}
                      autoComplete="off"
                      placeholder="Maslan: Ali"
                      className="w-full font-semibold text-lg px-4 py-3.5 rounded-[14px] border-2 border-[var(--line)] bg-[var(--bg)]/50 text-[var(--ink)] placeholder:text-[var(--muted)]/60 transition-colors focus:border-[var(--rose)]"
                    />
                  </div>

                  <div className="flex items-center justify-center -my-1">
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[var(--surface-subtle)] text-[var(--rose)] font-display text-lg">
                      ♥
                    </span>
                  </div>

                  <div>
                    <label htmlFor="n2" className="block font-extrabold mb-2 text-[var(--ink)]">
                      Unka naam
                    </label>
                    <input
                      id="n2"
                      type="text"
                      value={name2}
                      onChange={(e) => {
                        setName2(e.target.value);
                        if (error) setError('');
                      }}
                      autoComplete="off"
                      placeholder="Maslan: Sara"
                      className="w-full font-semibold text-lg px-4 py-3.5 rounded-[14px] border-2 border-[var(--line)] bg-[var(--bg)]/50 text-[var(--ink)] placeholder:text-[var(--muted)]/60 transition-colors focus:border-[var(--rose)]"
                    />
                  </div>

                  <p
                    id="err"
                    role="alert"
                    className="text-[var(--rose2)] font-bold min-h-[1.5em] m-0 text-center"
                  >
                    {error}
                  </p>

                  <button
                    type="submit"
                    className="w-full font-extrabold text-lg bg-[var(--rose)] hover:bg-[var(--rose2)] text-[var(--on-rose)] rounded-full py-4 px-8 cursor-pointer transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <Sparkles className="w-5 h-5" />
                    <span>Percent nikaalein</span>
                  </button>
                </form>
              ) : (
                /* Animated Result View */
                <div id="result" aria-live="polite" className="text-center py-2 page-enter">
                  <svg
                    className="w-[190px] h-[190px] sm:w-[210px] sm:h-[210px] mx-auto mb-2 pulse-subtle"
                    viewBox="0 0 100 90"
                    aria-hidden="true"
                  >
                    <defs>
                      <clipPath id="clip">
                        <rect id="fill" x="0" y={fillY} width="100" height="90" />
                      </clipPath>
                    </defs>
                    {/* Empty heart (background) */}
                    <path
                      d="M50 85C10 55 2 35 2 24 2 11 12 3 25 3c10 0 19 6 25 15C56 9 65 3 75 3c13 0 23 8 23 21 0 11-8 31-48 61z"
                      fill="var(--line)"
                    />
                    {/* Filled heart (clipped according to the percent) */}
                    <path
                      d="M50 85C10 55 2 35 2 24 2 11 12 3 25 3c10 0 19 6 25 15C56 9 65 3 75 3c13 0 23 8 23 21 0 11-8 31-48 61z"
                      fill="var(--rose)"
                      clipPath="url(#clip)"
                    />
                  </svg>

                  <div
                    id="pct"
                    className="font-display text-[3.4rem] sm:text-[4rem] leading-none text-[var(--rose)] my-2 tabular-nums"
                  >
                    {displayPercent}%
                  </div>

                  <p id="who" className="font-extrabold text-xl sm:text-2xl text-[var(--ink)] m-0">
                    {submittedNames.a} <span className="text-[var(--rose)]">♥</span> {submittedNames.b}
                  </p>

                  <p
                    id="msg"
                    className="max-w-[34ch] mx-auto mt-3 mb-7 text-[1.1rem] text-[var(--muted)] leading-relaxed"
                  >
                    {resultMessage}
                  </p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      id="again"
                      type="button"
                      onClick={handleReset}
                      className="w-full sm:w-auto font-extrabold text-base sm:text-lg bg-[var(--rose)] hover:bg-[var(--rose2)] text-[var(--on-rose)] rounded-full py-3.5 px-7 cursor-pointer transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Dobara try karein</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleShare}
                      className="w-full sm:w-auto font-bold text-base bg-transparent hover:bg-[var(--surface-subtle)] text-[var(--ink)] border-2 border-[var(--line)] rounded-full py-3.5 px-6 cursor-pointer transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      {copiedShare ? (
                        <>
                          <Check className="w-4 h-4 text-[var(--rose)]" />
                          <span>Copy ho gaya!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-4 h-4 text-[var(--rose)]" />
                          <span>Result share karein</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <p className="text-center text-[var(--muted)] text-[0.95rem] max-w-md mx-auto">
              Yeh sirf mazay ke liye hai. Asli pyaar naamon se nahi, rishtay se naapa jata hai.
            </p>

            {/* Recent Checks (Local Browser Memory) */}
            {history.length > 0 && (
              <div className="max-w-[520px] mx-auto bg-[var(--card)] border-2 border-[var(--line)] rounded-[22px] p-5 sm:p-6">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 font-extrabold text-[var(--ink)]">
                    <History className="w-4 h-4 text-[var(--rose)]" />
                    <span>Haal hi mein check kiye gaye naam</span>
                  </div>
                  <button
                    type="button"
                    onClick={clearHistory}
                    className="text-xs font-bold text-[var(--muted)] hover:text-[var(--rose2)] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Saaf karein</span>
                  </button>
                </div>
                <ul className="divide-y divide-[var(--line)]/60 m-0 p-0 list-none">
                  {history.map((item) => (
                    <li
                      key={item.id}
                      className="py-2.5 flex items-center justify-between gap-3 text-sm sm:text-base"
                    >
                      <button
                        type="button"
                        onClick={() => handleQuickFill(item.nameA, item.nameB)}
                        className="font-bold text-[var(--ink)] hover:text-[var(--rose)] text-left cursor-pointer truncate"
                      >
                        {item.nameA} ♥ {item.nameB}
                      </button>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-[var(--muted)]">{item.timestamp}</span>
                        <span className="font-display text-[var(--rose)] text-lg tabular-nums">
                          {item.percent}%
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Understanding the Result */}
            <div>
              <h2 className="text-center sm:text-left mb-5">Result ko kaise samjhein</h2>
              <ul className="grid gap-3 list-none p-0 m-0">
                {SCALE_ITEMS.map((item) => (
                  <li
                    key={item.range}
                    className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 bg-[var(--card)] border-2 border-[var(--line)] rounded-[18px] px-5 py-4"
                  >
                    <strong className="font-display font-normal text-[var(--rose)] sm:min-w-[105px] text-xl tabular-nums">
                      {item.range}
                    </strong>
                    <span className="text-[var(--ink)]">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Tips for Better Results */}
            <div>
              <h3 className="text-center sm:text-left mb-4">Behtar result ke liye</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 list-none p-0 m-0">
                <li className="bg-[var(--card)] border-2 border-[var(--line)] rounded-[18px] p-5">
                  <b className="block text-[var(--rose)] text-lg mb-1">Poora naam ya pyara naam?</b>
                  <span className="text-[var(--muted)]">
                    Dono try karein. Har naam ka result alag aata hai, is liye shuru wala naam aur nickname dono check karein.
                  </span>
                </li>
                <li className="bg-[var(--card)] border-2 border-[var(--line)] rounded-[18px] p-5">
                  <b className="block text-[var(--rose)] text-lg mb-1">Order ki fikar nahi</b>
                  <span className="text-[var(--muted)]">
                    Pehle kis ka naam likha, is se result nahi badalta.
                  </span>
                </li>
              </ul>
            </div>
          </section>
        )}

        {/* ========== Page 3: Love Tips ========== */}
        {activePage === 'tips' && (
          <section id="tips" className="page-enter space-y-12">
            <div className="text-center sm:text-left">
              <h2 className="mb-2">Love Tips</h2>
              <p className="text-[var(--muted)] m-0">
                Khushgawar aur mazboot rishtay ke liye chhoti magar ahem baatein.
              </p>
            </div>

            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none p-0 m-0">
              {LOVE_TIPS.map((tip, index) => (
                <li
                  key={tip.title}
                  className="bg-[var(--card)] border-2 border-[var(--line)] rounded-[20px] p-5 sm:p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-baseline justify-between gap-2 mb-1.5">
                      <b className="text-[var(--rose)] text-lg">{tip.title}</b>
                      <span className="text-xs font-bold text-[var(--muted)] tabular-nums">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <p className="m-0 text-[var(--ink)]/90">{tip.desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div>
              <h2 className="text-center sm:text-left mb-5">Kya karein, kya na karein</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="bg-[var(--card)] border-2 border-[var(--line)] rounded-[22px] p-6">
                  <h3 className="text-[var(--rose)] mb-3">Karein</h3>
                  <ul className="m-0 pl-5 space-y-2 text-[var(--muted)]">
                    <li>Tareef karein</li>
                    <li>Sach bolein</li>
                    <li>Aik doosray ka saath dein</li>
                    <li>Khushiyan mil kar manayein</li>
                  </ul>
                </div>
                <div className="bg-[var(--card)] border-2 border-[var(--line)] rounded-[22px] p-6">
                  <h3 className="text-[var(--rose2)] mb-3">Na karein</h3>
                  <ul className="m-0 pl-5 space-y-2 text-[var(--muted)]">
                    <li>Taane ya mazaq udana</li>
                    <li>Purani baatein baar baar dohrana</li>
                    <li>Dosron se mawazna karna</li>
                    <li>Gusse mein faislay karna</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========== Page 4: About ========== */}
        {activePage === 'about' && (
          <section id="about" className="page-enter space-y-12">
            <div>
              <h2 className="text-center sm:text-left mb-4">About</h2>
              <div className="bg-[var(--card)] border-2 border-[var(--line)] rounded-[22px] p-6 sm:p-7">
                <p className="m-0 text-[var(--ink)] text-lg leading-relaxed">
                  Love Percent aik chhoti si fun website hai jahan aap do naamon ka love percent dekh sakte hain. Percent naamon ke huroof se ek fixed formula ke zariye banta hai, is liye same naamon ka result hamesha same rehta hai.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-center sm:text-left mb-4">Kaise kaam karta hai?</h3>
              <ul className="grid grid-cols-1 md:grid-cols-3 gap-4 list-none p-0 m-0">
                <li className="bg-[var(--card)] border-2 border-[var(--line)] rounded-[18px] p-5">
                  <b className="block text-[var(--rose)] mb-1">1. Naam likhein</b>
                  <span className="text-[var(--muted)]">Dono naam calculator page par daalein.</span>
                </li>
                <li className="bg-[var(--card)] border-2 border-[var(--line)] rounded-[18px] p-5">
                  <b className="block text-[var(--rose)] mb-1">2. Formula chalta hai</b>
                  <span className="text-[var(--muted)]">Naamon ke huroof se aik number banta hai.</span>
                </li>
                <li className="bg-[var(--card)] border-2 border-[var(--line)] rounded-[18px] p-5">
                  <b className="block text-[var(--rose)] mb-1">3. Result</b>
                  <span className="text-[var(--muted)]">
                    Aap ko 1 se 100 ke beech percent aur aik pyara sa message milta hai.
                  </span>
                </li>
              </ul>
              <p className="mt-6 text-[var(--muted)] text-[0.95rem] text-center sm:text-left">
                Yeh website sirf entertainment ke liye hai.
              </p>
            </div>

            {/* FAQ Section */}
            <div>
              <h2 className="text-center sm:text-left mb-5">Aksar poochay jane wale sawal</h2>
              <div className="space-y-3">
                {[
                  {
                    q: 'Kya yeh result sach hota hai?',
                    a: 'Nahi, yeh sirf tafreeh ke liye hai. Asli rishta aap ke rawayyon aur samajh se banta hai.',
                  },
                  {
                    q: 'Har dafa result alag kyun nahi aata?',
                    a: 'Kyun ke percent naamon se banta hai. Same naam likhein to same result milta hai, chahe tarteeb badal dein.',
                  },
                  {
                    q: 'Kya meray naam save hote hain?',
                    a: 'Nahi. Sab kuch aap ke browser mein hota hai, kuch bhi kahin save ya bheja nahi jata.',
                  },
                  {
                    q: 'Kya yeh free hai?',
                    a: 'Ji haan, bilkul free hai. Jitni dafa chahein try karein.',
                  },
                ].map((faq) => (
                  <details
                    key={faq.q}
                    className="group bg-[var(--card)] border-2 border-[var(--line)] rounded-[18px] px-5 py-4 transition-colors"
                  >
                    <summary className="font-extrabold cursor-pointer flex items-center justify-between gap-4 text-[var(--ink)] select-none">
                      <span>{faq.q}</span>
                      <ChevronDown className="w-5 h-5 text-[var(--rose)] shrink-0 transition-transform duration-200 group-open:rotate-180" />
                    </summary>
                    <p className="mt-3 mb-0 text-[var(--muted)] leading-relaxed border-t border-[var(--line)]/50 pt-3">
                      {faq.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="text-center py-10 px-6 bg-[var(--card)] border-2 border-[var(--line)] rounded-[26px]">
              <h2 className="mb-5">Apna percent dekhein</h2>
              <button
                type="button"
                onClick={() => go('calc')}
                className="w-full sm:w-auto font-extrabold text-lg bg-[var(--rose)] hover:bg-[var(--rose2)] text-[var(--on-rose)] rounded-full px-8 py-3.5 cursor-pointer transition-colors whitespace-nowrap"
              >
                Calculator kholein
              </button>
            </div>
          </section>
        )}
      </main>

      {/* ========== Footer ========== */}
      <footer className="text-center py-6 px-4 text-[var(--muted)] border-t-2 border-[var(--line)] text-[0.95rem] bg-[var(--card)]/40">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>Banaya gaya pyaar ke saath ♥</span>
          <div className="flex items-center gap-4 text-sm">
            <button type="button" onClick={() => go('home')} className="hover:text-[var(--rose)] cursor-pointer">
              Home
            </button>
            <span aria-hidden="true">·</span>
            <button type="button" onClick={() => go('calc')} className="hover:text-[var(--rose)] cursor-pointer">
              Calculator
            </button>
            <span aria-hidden="true">·</span>
            <button type="button" onClick={() => go('tips')} className="hover:text-[var(--rose)] cursor-pointer">
              Tips
            </button>
            <span aria-hidden="true">·</span>
            <button type="button" onClick={() => go('about')} className="hover:text-[var(--rose)] cursor-pointer">
              About
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
