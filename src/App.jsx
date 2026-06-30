import { useState, useRef, useEffect, createContext, useContext } from "react";

// ═════════════════════════════════════════════════════════════════════════════
// PLANNOVA ARTIFICIAL INTELLIGENCE REVIEW CENTER — Supabase-Connected Enrollment & LMS
// ─────────────────────────────────────────────────────────────────────────────
// HOW TO CONFIGURE:
//   1. Create a project at supabase.com
//   2. Go to Project Settings → API
//   3. Copy your Project URL and anon/public key
//   4. Paste them into the two constants below
//   5. Run the SQL in SUPABASE_SETUP.sql to create all tables
// ═════════════════════════════════════════════════════════════════════════════

const SUPABASE_URL  = "https://ouxnnvltfdbxyodllgko.supabase.co";   // ← paste here
const SUPABASE_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91eG5udmx0ZmRieHlvZGxsZ2tvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2MjAzNjcsImV4cCI6MjA5ODE5NjM2N30.JBC-Bzi5kORcoWNNf4XDVTmQlLKyJZ3QMr1MRz6TqL0";                  // ← paste here

// ── Lightweight Supabase client (no npm needed inside Claude artifacts) ───────
const sb = {
  // Generic select
  async select(table, filters = "") {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=*${filters}&order=created_at.desc`;
    const res = await fetch(url, { headers: sbHeaders() });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  // Insert a row, returns inserted row
  async insert(table, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: { ...sbHeaders(), "Prefer": "return=representation" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    const rows = await res.json();
    return rows[0];
  },
  // Update rows matching a filter  e.g. "id=eq.5"
  async update(table, filter, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
      method: "PATCH",
      headers: { ...sbHeaders(), "Prefer": "return=representation" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  // Upload a file to Supabase Storage
  async upload(bucket, path, file) {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": file.type,
      },
      body: file,
    });
    if (!res.ok) throw new Error(await res.text());
    return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
  },
  // Sign in with email + password
  async signIn(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error((await res.json()).error_description || "Login failed");
    return res.json(); // { access_token, user, ... }
  },
  // Sign up a new user
  async signUp(email, password) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error((await res.json()).error_description || "Signup failed");
    return res.json();
  },
  // Sign out
  async signOut(token) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "apikey": SUPABASE_KEY },
    });
  },
};

function sbHeaders(token) {
  return {
    "Content-Type": "application/json",
    "apikey": SUPABASE_KEY,
    "Authorization": `Bearer ${token || SUPABASE_KEY}`,
  };
}

// ── Auth context ───────────────────────────────────────────────────────────────
const AuthCtx = createContext(null);
function useAuth() { return useContext(AuthCtx); }

// ── Anthropic API ─────────────────────────────────────────────────────────────
async function callClaude(messages, system = "") {
  const body = { model: "claude-sonnet-4-6", max_tokens: 1000, messages };
  if (system) body.system = system;
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return data.content?.find(b => b.type === "text")?.text || "";
}

// ── Static data ───────────────────────────────────────────────────────────────
const PROGRAMS = [
  { id:1, category:"Board Exam Review", title:"Environmental Planning Board Examination Review",
    modes:["Full Review","Weekend Classes","Online","Hybrid"], duration:"6 months",
    schedule:"Mon / Wed / Sat", fee:"₱25,000", fee_amount:25000, color:"#2E7D32",
    desc:"Comprehensive review covering all EPLEB subject areas. Designed by licensed Environmental Planners and topnotchers." },
  { id:2, category:"Specialization", title:"Urban Planning Specialization Program",
    modes:["Land Use Planning","GIS Applications","Climate Resilient Planning"],
    duration:"3 months", schedule:"Saturdays", fee:"₱12,000", fee_amount:12000, color:"#1976D2",
    desc:"Deep-dive modules for practicing planners seeking specialization in emerging urban challenges." },
  { id:3, category:"CPD Seminar", title:"CPD Seminars & Workshops",
    modes:["Green Infrastructure","Smart Cities","Environmental Management"],
    duration:"1–2 days", schedule:"Monthly", fee:"₱3,500", fee_amount:3500, color:"#388E3C",
    desc:"Accredited CPD units for licensed professionals. Topical and practitioner-led." },
];


// ── 2026 Passer Photos (GitHub hosted) ───────────────────────────────────
const PASSER_PHOTOS = [
  "https://raw.githubusercontent.com/urbanwiseplanning2025-ctrl/plannova-ai/main/EnP_Krisma.jpg",
  "https://raw.githubusercontent.com/urbanwiseplanning2025-ctrl/plannova-ai/main/EnP_Leah.jpg",
  "https://raw.githubusercontent.com/urbanwiseplanning2025-ctrl/plannova-ai/main/EnP_Angela.jpg",
  "https://raw.githubusercontent.com/urbanwiseplanning2025-ctrl/plannova-ai/main/EnP_Arvin.jpg",
];

const QUIZ_TOPICS = [
  "Environmental Planning Laws (RA 10587, PD 1151)",
  "Land Use Planning & CLUP Preparation",
  "GIS & Spatial Analysis",
  "Climate Change & Disaster Risk Reduction",
  "Urban Design & Physical Planning",
  "Environmental Impact Assessment",
  "Comprehensive Development Planning",
];

const SCHEDULE_DATA = [
  { date:"Jun 14", day:"Sat", type:"live",       label:"Urban Land Use Planning – Module 3" },
  { date:"Jun 16", day:"Mon", type:"exam",        label:"Mock Board Exam – Environmental Laws" },
  { date:"Jun 18", day:"Wed", type:"seminar",     label:"GIS Applications Webinar" },
  { date:"Jun 21", day:"Sat", type:"live",        label:"Climate Resilient Planning – Module 1" },
  { date:"Jun 23", day:"Mon", type:"assignment",  label:"CDP Submission" },
  { date:"Jun 28", day:"Sat", type:"exam",        label:"Mock Board Exam – Physical Planning" },
];

const typeTag = {
  live:       { bg:"#E8F5E9", color:"#2E7D32", label:"Live Class" },
  exam:       { bg:"#FFF3E0", color:"#E65100", label:"Exam" },
  seminar:    { bg:"#E3F2FD", color:"#1565C0", label:"Seminar" },
  assignment: { bg:"#F3E5F5", color:"#6A1B9A", label:"Assignment" },
};

// ── Small reusable UI ─────────────────────────────────────────────────────────
function StatCard({ value, label, color }) {
  return (
    <div style={{ background:"#fff", borderRadius:12, padding:"20px 24px",
      boxShadow:"0 2px 12px rgba(0,0,0,.07)", borderTop:`4px solid ${color}` }}>
      <div style={{ fontSize:28, fontWeight:800, color }}>{value}</div>
      <div style={{ fontSize:13, color:"#666", marginTop:4 }}>{label}</div>
    </div>
  );
}

function ProgressBar({ pct, color="#4CAF50" }) {
  return (
    <div style={{ background:"#E8F5E9", borderRadius:99, height:8, overflow:"hidden" }}>
      <div style={{ width:`${Math.min(pct,100)}%`, background:color, height:"100%",
        borderRadius:99, transition:"width .6s" }}/>
    </div>
  );
}

function Badge({ text }) {
  const map = {
    Approved:["#E8F5E9","#2E7D32"], Pending:["#FFF9C4","#F57F17"],
    Rejected:["#FFEBEE","#C62828"], Paid:["#E3F2FD","#1565C0"],
    Partial:["#FFF3E0","#E65100"],  Verified:["#E8F5E9","#2E7D32"],
  };
  const [bg,color] = map[text] || ["#F5F5F5","#333"];
  return (
    <span style={{ background:bg, color, borderRadius:99,
      padding:"3px 10px", fontSize:12, fontWeight:600 }}>{text}</span>
  );
}

function Spinner() {
  return (
    <div style={{ display:"flex", justifyContent:"center", padding:40 }}>
      <div style={{ width:36, height:36, border:"4px solid #E8F5E9",
        borderTop:"4px solid #2E7D32", borderRadius:"50%", animation:"spin 1s linear infinite" }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function Toast({ msg, type="success", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{ position:"fixed", bottom:24, right:24, zIndex:9999,
      background:type==="error"?"#C62828":"#2E7D32", color:"#fff",
      padding:"14px 20px", borderRadius:10, boxShadow:"0 4px 20px rgba(0,0,0,.2)",
      fontSize:14, fontWeight:600, display:"flex", alignItems:"center", gap:10 }}>
      {type==="error"?"⚠️":"✓"} {msg}
      <button onClick={onClose} style={{ background:"transparent", border:"none",
        color:"rgba(255,255,255,.7)", cursor:"pointer", fontSize:18, marginLeft:8 }}>×</button>
    </div>
  );
}

function TopoWatermark() {
  return (
    <svg viewBox="0 0 800 400" style={{ position:"absolute", inset:0, width:"100%",
      height:"100%", opacity:0.08, pointerEvents:"none" }} aria-hidden>
      {[40,80,120,160,200,240,280,320,360].map((d,i) =>
        <ellipse key={i} cx="400" cy="200" rx={80+d} ry={40+d*0.45}
          fill="none" stroke="#4CAF50" strokeWidth="1.2"/>)}
      {[60,110,160,210,260,310].map((d,i) =>
        <ellipse key={i} cx="650" cy="300" rx={30+d*0.6} ry={20+d*0.3}
          fill="none" stroke="#2196F3" strokeWidth="0.9"/>)}
    </svg>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// LOGIN / REGISTER MODAL
// ═════════════════════════════════════════════════════════════════════════════
function AuthModal({ onClose, onSuccess, S, border, textMain, textSub, bg1 }) {
  const [mode, setMode]       = useState("login"); // login | register
  const [email, setEmail]     = useState("");
  const [password, setPass]   = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const submit = async () => {
    setError(""); setLoading(true);
    try {
      let result;
      if (mode === "login") {
        result = await sb.signIn(email, password);
      } else {
        result = await sb.signUp(email, password);
        // After signup Supabase may need email confirmation
        if (!result.access_token) {
          setError("Check your email to confirm your account, then log in.");
          setLoading(false); return;
        }
      }
      onSuccess(result);
    } catch(e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)",
      zIndex:10000, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ ...S.card, width:"100%", maxWidth:400, margin:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:24 }}>
          <h3 style={{ fontWeight:900, fontSize:22, color:textMain }}>
            {mode==="login" ? "Sign In" : "Create Account"}
          </h3>
          <button onClick={onClose}
            style={{ background:"transparent", border:"none", fontSize:22,
              cursor:"pointer", color:textSub }}>×</button>
        </div>

        {error && (
          <div style={{ background:"#FFEBEE", color:"#C62828", borderRadius:8,
            padding:"10px 14px", fontSize:13, marginBottom:16 }}>{error}</div>
        )}

        <div style={{ marginBottom:16 }}>
          <label style={S.label}>Email</label>
          <input style={S.input} type="email" placeholder="your@email.com"
            value={email} onChange={e => setEmail(e.target.value)}/>
        </div>
        <div style={{ marginBottom:24 }}>
          <label style={S.label}>Password</label>
          <input style={S.input} type="password" placeholder="••••••••"
            value={password} onChange={e => setPass(e.target.value)}
            onKeyDown={e => e.key==="Enter" && submit()}/>
        </div>

        <button style={{ ...S.btn(true), width:"100%", textAlign:"center",
          padding:"14px", fontSize:15, opacity:loading?.6:1 }}
          onClick={submit} disabled={loading}>
          {loading ? "Please wait…" : mode==="login" ? "Sign In" : "Create Account"}
        </button>

        <p style={{ textAlign:"center", marginTop:16, fontSize:13, color:textSub }}>
          {mode==="login" ? "No account? " : "Already have one? "}
          <button onClick={() => { setMode(m => m==="login"?"register":"login"); setError(""); }}
            style={{ background:"transparent", border:"none", color:"#2E7D32",
              fontWeight:700, cursor:"pointer", fontSize:13 }}>
            {mode==="login" ? "Register here" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// AI STUDY ASSISTANT
// ═════════════════════════════════════════════════════════════════════════════
function AIStudyAssistant({ S, textMain, textSub, border, bg1 }) {
  const [msgs, setMsgs] = useState([{
    role:"assistant",
    content:"Hello! I'm **NOVA** 🌿 — your AI Study Assistant from PLANNOVA ARTIFICIAL INTELLIGENCE REVIEW CENTER!\n\nI'm here to help you ace the Environmental Planning Licensure Examination (EPLEB). Ask me about Philippine planning laws, CLUP, GIS, EIA, land use planning, and all EPLEB subjects!\n\nTry: *\"Explain RA 10587\"* or *\"What are the steps in CLUP preparation?\"*"
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);

  const SYSTEM = `You are NOVA, the official AI Study Assistant of PLANNOVA ARTIFICIAL INTELLIGENCE REVIEW CENTER — a DTI-registered review center in the Philippines specializing in the Environmental Planning Licensure Examination (EPLEB).
Help students prepare for the EPLEB (Environmental Planning Licensure Examination). 
Topics: RA 10587, PD 1151, RA 7160, CLUP preparation, Land Use Planning, GIS, EIA, physical planning, urban design, climate resilient planning, DRRM, HLURB/DHSUD regulations.
Give clear, accurate, well-structured answers. Use bullet points where helpful. Be encouraging.
Keep responses under 300 words. Always relate to Philippine laws and practice.`;

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    const updated = [...msgs, { role:"user", content:msg }];
    setMsgs(updated);
    setLoading(true);
    try {
      const history = updated.slice(1).map(m => ({ role:m.role, content:m.content }));
      const reply = await callClaude(history, SYSTEM);
      setMsgs(m => [...m, { role:"assistant", content:reply }]);
    } catch {
      setMsgs(m => [...m, { role:"assistant", content:"Connection error. Please try again." }]);
    }
    setLoading(false);
  };

  const renderText = (text) => text.split("\n").map((line, i) => {
    if (line === "") return <div key={i} style={{ height:6 }}/>;
    const cleaned = line.replace(/\*\*(.*?)\*\*/g,"$1").replace(/\*(.*?)\*/g,"$1");
    const isBullet = line.startsWith("- ") || line.startsWith("• ");
    return (
      <div key={i} style={{ fontSize:14, lineHeight:1.65, marginBottom:2,
        paddingLeft: isBullet ? 14 : 0 }}>
        {isBullet ? "• " + cleaned.slice(2) : cleaned}
      </div>
    );
  });

  const SUGGESTIONS = [
    "Explain RA 10587 and its key provisions",
    "What is CLUP and how is it prepared?",
    "Difference between EIA and IEE",
    "Key concepts in climate resilient planning",
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      <div style={{ flex:1, overflowY:"auto", padding:16, display:"flex",
        flexDirection:"column", gap:12, minHeight:0 }}>
        {msgs.map((m,i) => (
          <div key={i} style={{ display:"flex",
            justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
            {m.role==="assistant" && (
              <div style={{ width:32, height:32, borderRadius:"50%",
                background:"linear-gradient(135deg,#2E7D32,#4CAF50)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:14, flexShrink:0, marginRight:8, marginTop:4 }}>🌿</div>
            )}
            <div style={{ maxWidth:"78%", padding:"12px 16px",
              borderRadius:m.role==="user"?"16px 16px 4px 16px":"4px 16px 16px 16px",
              background:m.role==="user"?"#2E7D32":bg1,
              color:m.role==="user"?"#fff":textMain,
              boxShadow:"0 2px 8px rgba(0,0,0,.07)",
              border:m.role==="assistant"?`1px solid ${border}`:"none" }}>
              {renderText(m.content)}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ width:32, height:32, borderRadius:"50%",
              background:"linear-gradient(135deg,#2E7D32,#4CAF50)",
              display:"flex", alignItems:"center", justifyContent:"center" }}>🌿</div>
            <div style={{ background:bg1, border:`1px solid ${border}`,
              borderRadius:"4px 16px 16px 16px", padding:"14px 18px" }}>
              <div style={{ display:"flex", gap:4 }}>
                {[0,1,2].map(i =>
                  <div key={i} style={{ width:8, height:8, borderRadius:"50%",
                    background:"#4CAF50", animation:`bounce 1.2s ${i*.2}s infinite` }}/>)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {msgs.length <= 2 && (
        <div style={{ padding:"0 16px 10px", display:"flex", gap:8, flexWrap:"wrap" }}>
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => send(s)}
              style={{ background:"#E8F5E9", color:"#2E7D32", border:"1px solid #C8E6C9",
                borderRadius:20, padding:"6px 14px", fontSize:11, fontWeight:600,
                cursor:"pointer" }}>{s}</button>
          ))}
        </div>
      )}

      <div style={{ padding:"12px 16px", borderTop:`1px solid ${border}`,
        display:"flex", gap:10 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key==="Enter" && send()}
          placeholder="Ask about EP laws, CLUP, GIS, urban planning…"
          style={{ ...S.input, flex:1, borderRadius:20 }}/>
        <button onClick={() => send()} disabled={loading || !input.trim()}
          style={{ background:loading||!input.trim()?"#ccc":"#2E7D32",
            color:"#fff", border:"none", borderRadius:"50%", width:40, height:40,
            cursor:loading||!input.trim()?"not-allowed":"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:16, flexShrink:0 }}>➤</button>
      </div>
      <style>{`@keyframes bounce{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-6px)}}`}</style>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// AI QUIZ GENERATOR
// ═════════════════════════════════════════════════════════════════════════════
function AIQuizGenerator({ S, textMain, textSub, border, bg1, DM }) {
  const [topic, setTopic]         = useState(QUIZ_TOPICS[0]);
  const [difficulty, setDiff]     = useState("Moderate");
  const [numQ, setNumQ]           = useState(5);
  const [generating, setGen]      = useState(false);
  const [questions, setQs]        = useState(null);
  const [answers, setAnswers]     = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore]         = useState(0);
  const [explanation, setExp]     = useState({});
  const [loadingExp, setLoadExp]  = useState({});

  const generate = async () => {
    setGen(true); setQs(null); setAnswers({}); setSubmitted(false); setExp({});
    try {
      const raw = await callClaude([{ role:"user", content:
        `Generate exactly ${numQ} multiple-choice questions about "${topic}" for the Philippine EPLEB review. Difficulty: ${difficulty}.
Return ONLY valid JSON array, no markdown:
[{"q":"Question?","options":["A","B","C","D"],"answer":0,"rationale":"Why A is correct."}]
The "answer" is the 0-based index of the correct option. Base questions on Philippine laws and planning practice.`
      }]);
      setQs(JSON.parse(raw.replace(/```json|```/g,"").trim()));
    } catch { setQs("error"); }
    setGen(false);
  };

  const submit = () => {
    let s = 0;
    questions.forEach((q,i) => { if (answers[i]===q.answer) s++; });
    setScore(s); setSubmitted(true);
  };

  const getExp = async (idx) => {
    if (explanation[idx] || loadingExp[idx]) return;
    setLoadExp(l => ({...l,[idx]:true}));
    const q = questions[idx];
    const reply = await callClaude([{ role:"user",
      content:`Explain in 100 words why "${q.options[q.answer]}" is correct for: "${q.q}". Reference Philippine laws.`
    }], "You are an expert Environmental Planning reviewer for Philippine board exam candidates.");
    setExp(x => ({...x,[idx]:reply}));
    setLoadExp(l => ({...l,[idx]:false}));
  };

  const pct = questions && questions!=="error"
    ? Math.round((score/questions.length)*100) : 0;

  if (!questions) return (
    <div style={S.card}>
      <h3 style={{ fontWeight:800, fontSize:18, marginBottom:8, color:textMain }}>
        ✨ AI Quiz Generator
      </h3>
      <p style={{ color:textSub, fontSize:14, marginBottom:24 }}>
        Claude AI will generate a custom EPLEB practice quiz on any topic.
      </p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:24 }}>
        <div><label style={S.label}>Topic</label>
          <select style={S.input} value={topic} onChange={e => setTopic(e.target.value)}>
            {QUIZ_TOPICS.map(t => <option key={t}>{t}</option>)}
          </select></div>
        <div><label style={S.label}>Difficulty</label>
          <select style={S.input} value={difficulty} onChange={e => setDiff(e.target.value)}>
            {["Easy","Moderate","Difficult","Board Exam Level"].map(d => <option key={d}>{d}</option>)}
          </select></div>
        <div><label style={S.label}>Number of Questions</label>
          <select style={S.input} value={numQ} onChange={e => setNumQ(Number(e.target.value))}>
            {[3,5,8,10].map(n => <option key={n}>{n}</option>)}
          </select></div>
      </div>
      <button style={{ ...S.btn(true), fontSize:15, padding:"13px 28px" }}
        onClick={generate} disabled={generating}>
        {generating ? "⏳ Generating…" : "✨ Generate Quiz with AI"}
      </button>
      {generating && <p style={{ color:textSub, fontSize:13, marginTop:10 }}>
        Crafting {numQ} questions on {topic}…</p>}
    </div>
  );

  if (questions === "error") return (
    <div style={{ ...S.card, textAlign:"center", padding:40 }}>
      <p style={{ fontSize:40, marginBottom:12 }}>⚠️</p>
      <p style={{ color:textMain, fontWeight:700 }}>Failed to generate quiz. Please try again.</p>
      <button style={{ ...S.btn(true), marginTop:16 }} onClick={() => setQs(null)}>Try Again</button>
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h3 style={{ fontWeight:800, fontSize:18, color:textMain }}>{topic}</h3>
          <p style={{ color:textSub, fontSize:13 }}>{difficulty} · {questions.length} Questions · AI-Generated</p>
        </div>
        {!submitted && <button style={S.btn(false)} onClick={() => setQs(null)}>← New Quiz</button>}
      </div>

      {submitted && (
        <div style={{ ...S.card, textAlign:"center", marginBottom:24,
          background:"linear-gradient(135deg,#1B5E20,#2E7D32)", color:"#fff" }}>
          <div style={{ fontSize:48, marginBottom:8 }}>{pct>=75?"🏆":pct>=50?"📚":"📝"}</div>
          <div style={{ fontSize:40, fontWeight:900 }}>{score}/{questions.length}</div>
          <div style={{ fontSize:18, marginBottom:8 }}>{pct}%</div>
          <div style={{ fontSize:14, opacity:.85 }}>
            {pct>=75?"Excellent! You're on track." : pct>=50?"Good effort. Review missed items." : "Keep studying!"}
          </div>
          <button style={{ ...S.btn(true), background:"rgba(255,255,255,.2)",
            border:"2px solid rgba(255,255,255,.5)", marginTop:16, color:"#fff" }}
            onClick={() => setQs(null)}>Generate Another Quiz</button>
        </div>
      )}

      {questions.map((q,i) => {
        const chosen = answers[i], correct = q.answer;
        const isCorrect = chosen === correct;
        return (
          <div key={i} style={{ ...S.card, marginBottom:16,
            borderLeft:`5px solid ${submitted ? (isCorrect?"#4CAF50":"#E53935") : border}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
              <span style={{ fontSize:12, fontWeight:700, color:textSub, textTransform:"uppercase" }}>Q{i+1}</span>
              {submitted && <span style={{ fontSize:12, fontWeight:700, color:isCorrect?"#2E7D32":"#E53935" }}>
                {isCorrect?"✓ Correct":"✗ Incorrect"}</span>}
            </div>
            <p style={{ fontSize:15, fontWeight:700, color:textMain, marginBottom:14, lineHeight:1.5 }}>{q.q}</p>
            {q.options.map((opt,j) => {
              let bg=bg1, bc=border, tc=textMain, fw=400;
              if (submitted) {
                if (j===correct) { bg="#E8F5E9"; bc="#4CAF50"; tc="#1B5E20"; fw=700; }
                else if (j===chosen) { bg="#FFEBEE"; bc="#E53935"; tc="#B71C1C"; }
              } else if (chosen===j) { bg="#E8F5E9"; bc="#2E7D32"; tc="#2E7D32"; fw=700; }
              return (
                <button key={j} disabled={submitted} onClick={() => setAnswers(a=>({...a,[i]:j}))}
                  style={{ display:"block", width:"100%", textAlign:"left", padding:"11px 16px",
                    marginBottom:8, borderRadius:8, border:`2px solid ${bc}`,
                    background:bg, color:tc, fontWeight:fw,
                    cursor:submitted?"default":"pointer", fontSize:14 }}>
                  <span style={{ fontWeight:800, marginRight:8 }}>{String.fromCharCode(65+j)}.</span>{opt}
                </button>
              );
            })}
            {submitted && (
              <div style={{ marginTop:10 }}>
                <button onClick={() => getExp(i)}
                  style={{ background:"#E3F2FD", color:"#1565C0", border:"none",
                    borderRadius:6, padding:"6px 14px", fontSize:12, fontWeight:700, cursor:"pointer" }}>
                  {loadingExp[i]?"Loading…":"💡 Show AI Explanation"}
                </button>
                {explanation[i] && (
                  <div style={{ marginTop:10, background:DM?"#1E3A20":"#F1F8F1",
                    borderRadius:8, padding:14, fontSize:13, color:textMain,
                    lineHeight:1.7, borderLeft:"3px solid #4CAF50" }}>
                    <strong style={{ color:"#2E7D32" }}>Rationale: </strong>{explanation[i]}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {!submitted && (
        <div style={{ display:"flex", gap:12, justifyContent:"flex-end" }}>
          <button style={S.btn(false)} onClick={() => setQs(null)}>← New Quiz</button>
          <button style={S.btn(true)} onClick={submit}
            disabled={Object.keys(answers).length < questions.length}>
            Submit ({Object.keys(answers).length}/{questions.length} answered)
          </button>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═════════════════════════════════════════════════════════════════════════════
// ── Announcements Panel — proper React component ───────────────────────────
function AnnouncementsPanel({ S, textMain, textSub, border, bg1, DM, toast$ }) {
  const [annList, setAnnList] = useState([
    { id:1, title:"Enrollment Now Open — 2026 Batch",
      body:"Secure your slot now! Limited seats available for the 2026 EPLEB Review Batch. Enroll at plannova-ai.vercel.app",
      date:"Jun 29, 2026", badge:"New", badgeColor:"#2E7D32" },
    { id:2, title:"🏆 Congratulations 2026 EPLEB Passers!",
      body:"PLANNOVA is proud to announce our 5 board exam passers including EnP Theodorico M. Collano Jr. — Top 1 Topnotcher!",
      date:"Jun 28, 2026", badge:"Achievement", badgeColor:"#F9A825" },
    { id:3, title:"NOVA AI Study Tools Now Live",
      body:"Access NOVA AI Study Assistant and AI Quiz Generator — free for all enrolled students!",
      date:"Jun 27, 2026", badge:"Feature", badgeColor:"#1565C0" },
  ]);
  const [newTitle, setNewTitle] = useState("");
  const [newBody,  setNewBody]  = useState("");
  const [newBadge, setNewBadge] = useState("New");
  const [saving,   setSaving]   = useState(false);
  const [editId,   setEditId]   = useState(null);

  const badgeOptions = [
    { label:"New",         color:"#2E7D32" },
    { label:"Urgent",      color:"#C62828" },
    { label:"Reminder",    color:"#E65100" },
    { label:"Achievement", color:"#F9A825" },
    { label:"Feature",     color:"#1565C0" },
    { label:"Schedule",    color:"#6A1B9A" },
    { label:"General",     color:"#455A64" },
  ];
  const getBadgeColor = (label) => badgeOptions.find(b=>b.label===label)?.color||"#2E7D32";

  const saveAnn = () => {
    if (!newTitle.trim()||!newBody.trim()) { toast$("Please fill in Title and Message","error"); return; }
    setSaving(true);
    const today = new Date().toLocaleDateString("en-PH",{year:"numeric",month:"short",day:"numeric"});
    if (editId) {
      setAnnList(l=>l.map(a=>a.id===editId?{...a,title:newTitle,body:newBody,badge:newBadge,badgeColor:getBadgeColor(newBadge),date:today}:a));
      toast$("Announcement updated! ✓"); setEditId(null);
    } else {
      setAnnList(l=>[{id:Date.now(),title:newTitle,body:newBody,badge:newBadge,badgeColor:getBadgeColor(newBadge),date:today},...l]);
      toast$("Announcement posted! ✓");
    }
    setNewTitle(""); setNewBody(""); setNewBadge("New"); setSaving(false);
  };
  const deleteAnn = (id) => { setAnnList(l=>l.filter(a=>a.id!==id)); toast$("Deleted"); };
  const editAnn   = (ann) => { setEditId(ann.id); setNewTitle(ann.title); setNewBody(ann.body); setNewBadge(ann.badge); window.scrollTo(0,0); };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24, alignItems:"start" }}>
      {/* FORM */}
      <div style={{ ...S.card, borderTop:"4px solid #F9A825" }}>
        <h3 style={{ fontWeight:900, fontSize:18, color:textMain, marginBottom:6 }}>
          {editId?"✏️ Edit Announcement":"📢 Post New Announcement"}
        </h3>
        <p style={{ color:textSub, fontSize:13, marginBottom:20 }}>
          {editId?"Update this announcement.":"Post a message students will see on their dashboard."}
        </p>
        <div style={{ marginBottom:14 }}>
          <label style={S.label}>Title</label>
          <input style={S.input} placeholder="e.g. Mock Exam this Saturday!"
            value={newTitle} onChange={e=>setNewTitle(e.target.value)}/>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={S.label}>Message / Details</label>
          <textarea style={{ ...S.input, minHeight:110, resize:"vertical" }}
            placeholder="Write your announcement here — date, time, venue, or link..."
            value={newBody} onChange={e=>setNewBody(e.target.value)}/>
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={S.label}>Badge / Category</label>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:6 }}>
            {badgeOptions.map(b=>(
              <button key={b.label} onClick={()=>setNewBadge(b.label)}
                style={{ background:newBadge===b.label?b.color:"transparent",
                  color:newBadge===b.label?"#fff":textSub,
                  border:`2px solid ${newBadge===b.label?b.color:border}`,
                  borderRadius:99, padding:"5px 14px", cursor:"pointer", fontWeight:700, fontSize:12 }}>
                {b.label}
              </button>
            ))}
          </div>
        </div>
        {newTitle && (
          <div style={{ background:DM?"#1A3A1A":"#F1F8F1", borderRadius:10,
            padding:"14px 16px", marginBottom:20, borderLeft:"4px solid #F9A825" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#888", textTransform:"uppercase", marginBottom:6 }}>Preview</div>
            <span style={{ background:getBadgeColor(newBadge), color:"#fff",
              borderRadius:99, padding:"2px 10px", fontSize:10, fontWeight:700 }}>{newBadge}</span>
            <div style={{ fontWeight:700, fontSize:14, color:textMain, margin:"8px 0 4px" }}>{newTitle}</div>
            <div style={{ fontSize:12, color:textSub, lineHeight:1.6 }}>{newBody}</div>
          </div>
        )}
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={saveAnn} disabled={saving}
            style={{ ...S.btn(true), background:"#F9A825", flex:1, textAlign:"center", padding:13 }}>
            {saving?"Saving…":editId?"Update Announcement":"📢 Post Announcement"}
          </button>
          {editId && <button onClick={()=>{setEditId(null);setNewTitle("");setNewBody("");setNewBadge("New");}}
            style={{ ...S.btn(false), padding:"13px 18px" }}>Cancel</button>}
        </div>
      </div>

      {/* LIST */}
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <h3 style={{ fontWeight:900, fontSize:18, color:textMain }}>Posted Announcements</h3>
          <span style={{ background:"#E8F5E9", color:"#2E7D32", borderRadius:99,
            padding:"4px 14px", fontSize:12, fontWeight:700 }}>{annList.length} active</span>
        </div>
        {annList.length===0 ? (
          <div style={{ ...S.card, textAlign:"center", padding:40 }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
            <p style={{ color:textSub }}>No announcements yet.</p>
          </div>
        ) : annList.map(ann=>(
          <div key={ann.id} style={{ ...S.card, marginBottom:14, borderLeft:`4px solid ${ann.badgeColor}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ background:ann.badgeColor, color:"#fff",
                  borderRadius:99, padding:"2px 10px", fontSize:10, fontWeight:700 }}>{ann.badge}</span>
                <span style={{ fontSize:11, color:textSub }}>{ann.date}</span>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={()=>editAnn(ann)}
                  style={{ background:"#E3F2FD", color:"#1565C0", border:"none",
                    borderRadius:6, padding:"5px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>✏️ Edit</button>
                <button onClick={()=>deleteAnn(ann.id)}
                  style={{ background:"#FFEBEE", color:"#C62828", border:"none",
                    borderRadius:6, padding:"5px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>🗑️ Delete</button>
              </div>
            </div>
            <div style={{ fontWeight:800, fontSize:15, color:textMain, marginBottom:6 }}>{ann.title}</div>
            <div style={{ fontSize:13, color:textSub, lineHeight:1.7 }}>{ann.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [page, setPage]           = useState("home");
  const [darkMode, setDark]       = useState(false);
  const [aiTab, setAiTab]         = useState("assistant");
  const [adminTab, setAdminTab]   = useState("enrollments");
  const [portalTab, setPortalTab] = useState("dashboard");
  const [enrollStep, setEnrollStep] = useState(1);
  const [enrollData, setEnrollData] = useState({});
  const [toast, setToast]         = useState(null);

  // ── Auth state ─────────────────────────────────────────────────────────────
  const [session, setSession]     = useState(null); // { access_token, user }
  const [showAuth, setShowAuth]   = useState(false);
  const [authRedirect, setAuthRedirect] = useState(null);

  // ── Supabase data state ────────────────────────────────────────────────────
  const [students, setStudents]   = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [payProof, setPayProof]   = useState(null);
  const [contactSent, setContactSent] = useState(false);

  const DM = darkMode;
  const bg0      = DM ? "#0F1F10" : "#F5F9F5";
  const bg1      = DM ? "#162218" : "#fff";
  const textMain = DM ? "#E8F5E9" : "#1A2B1A";
  const textSub  = DM ? "#A5D6A7" : "#4A6741";
  const border   = DM ? "#2E4D2E" : "#D7EAD7";

  const showToast = (msg, type="success") => setToast({ msg, type });

  const nav = (p) => {
    // Guard protected pages
    if ((p==="student-portal" || p==="ai-tools") && !session) {
      setAuthRedirect(p); setShowAuth(true); return;
    }
    setPage(p); window.scrollTo(0,0);
  };

  // Load students when admin tab opens
  useEffect(() => {
    if (page==="admin" && session) {
      setLoadingStudents(true);
      sb.select("students")
        .then(data => setStudents(data))
        .catch(() => showToast("Could not load students","error"))
        .finally(() => setLoadingStudents(false));
    }
  }, [page, session]);

  const S = {
    page:  { minHeight:"100vh", background:bg0, color:textMain,
             fontFamily:"system-ui,-apple-system,sans-serif", transition:"background .3s,color .3s" },
    card:  { background:bg1, borderRadius:14, boxShadow:"0 2px 16px rgba(0,0,0,.08)",
             padding:24, border:`1px solid ${border}` },
    btn:   (primary=true) => ({ display:"inline-block", padding:"12px 28px", borderRadius:8,
             border:"none", cursor:"pointer", fontWeight:700, fontSize:14,
             background:primary?"#2E7D32":"transparent",
             color:primary?"#fff":"#2E7D32",
             outline:primary?"none":"2px solid #2E7D32" }),
    input: { width:"100%", padding:"10px 14px", borderRadius:8, border:`1px solid ${border}`,
             background:DM?"#1E3A20":"#FAFCFA", color:textMain, fontSize:14, boxSizing:"border-box" },
    label: { display:"block", fontSize:12, fontWeight:600, color:textSub, marginBottom:4,
             textTransform:"uppercase", letterSpacing:".06em" },
    sectionTitle: { fontFamily:"'Georgia',serif", fontSize:28, fontWeight:800,
             color:textMain, marginBottom:8 },
    tag:   (t) => ({ background:typeTag[t]?.bg, color:typeTag[t]?.color,
             borderRadius:6, padding:"2px 9px", fontSize:11, fontWeight:700 }),
  };

  // ── NAVBAR ─────────────────────────────────────────────────────────────────
  const Navbar = () => (
    <nav style={{ background:DM?"#0A160A":"#fff", borderBottom:`1px solid ${border}`,
      position:"sticky", top:0, zIndex:999, boxShadow:"0 2px 12px rgba(0,0,0,.07)" }}>
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 20px",
        display:"flex", alignItems:"center", justifyContent:"space-between", height:64 }}>

        <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }}
          onClick={() => nav("home")}>
          <div style={{ width:40, height:40, borderRadius:8,
            background:"linear-gradient(135deg,#2E7D32,#4CAF50)",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:20, fontWeight:900, color:"#fff" }}>UP</div>
          <div>
            <div style={{ fontWeight:800, fontSize:13, color:"#2E7D32", lineHeight:1 }}>PLANNOVA</div>
            <div style={{ fontSize:10, color:textSub }}>AI Review Center · DTI Registered</div>
          </div>
        </div>

        <div style={{ display:"flex", gap:2, alignItems:"center", flexWrap:"wrap" }}>
          {["Home","Programs","Enroll","Student Portal","AI Tools","Admin","Contact"].map(n => {
            const key = n.toLowerCase().replace(/ /g,"-");
            return (
              <button key={n} onClick={() => nav(key)}
                style={{ background:page===key?"#E8F5E9":"transparent",
                  color:n==="AI Tools"?"#1565C0":"#2E7D32",
                  border:n==="AI Tools"?"1px solid #BBDEFB":"none",
                  borderRadius:6, padding:"7px 11px", cursor:"pointer",
                  fontWeight:600, fontSize:12 }}>
                {n==="AI Tools"?"🤖 "+n:n}
              </button>
            );
          })}

          {session ? (
            <button onClick={async () => {
              await sb.signOut(session.access_token).catch(()=>{});
              setSession(null); nav("home");
            }} style={{ background:"#FFEBEE", color:"#C62828", border:"none",
              borderRadius:6, padding:"7px 12px", cursor:"pointer", fontWeight:700, fontSize:12 }}>
              Sign Out
            </button>
          ) : (
            <button onClick={() => setShowAuth(true)}
              style={{ ...S.btn(true), padding:"8px 16px", fontSize:12 }}>Sign In</button>
          )}

          <button onClick={() => setDark(d=>!d)}
            style={{ background:"transparent", border:`1px solid ${border}`,
              borderRadius:8, padding:"7px 10px", cursor:"pointer", fontSize:16, color:textMain }}>
            {DM?"☀️":"🌙"}
          </button>
        </div>
      </div>
    </nav>
  );

  // ── FOOTER ─────────────────────────────────────────────────────────────────
  const Footer = () => (
    <footer style={{ background:DM?"#0A160A":"#1A2B1A", color:"#A5D6A7",
      padding:"48px 20px 24px", marginTop:80 }}>
      <div style={{ maxWidth:1200, margin:"0 auto" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",
          gap:32, marginBottom:40 }}>
          <div>
            <div style={{ fontFamily:"'Georgia',serif", fontWeight:900, fontSize:16,
              color:"#4CAF50", marginBottom:4, letterSpacing:".04em" }}>PLANNOVA</div>
            <div style={{ fontSize:11, color:"#81C784", marginBottom:10,
              fontWeight:600, textTransform:"uppercase", letterSpacing:".08em" }}>
              Artificial Intelligence Review Center
            </div>
            <p style={{ fontSize:12, lineHeight:1.8, color:"#81C784" }}>
              DTI Registered · AI-Powered Environmental Planning Licensure Examination Review Center · Philippines
            </p>
            <div style={{ marginTop:10, fontSize:12, color:"#66BB6A", lineHeight:2 }}>
              📍 Metro Manila, Philippines<br/>
              📞 +63 917 123 4567<br/>
              ✉️ info@plannova.ph<br/>
              📘 fb.com/plannovaai
            </div>
          </div>
          {[["Quick Links",["Home","Programs","Enroll","Our Passers","Contact"]],
            ["Student",["Student Portal","My Courses","Schedule","NOVA AI Tools"]],
            ["Legal",["Privacy Policy","Terms & Conditions","DTI Registration"]]].map(([title,links]) => (
            <div key={title}>
              <div style={{ fontWeight:700, color:"#C8E6C9", marginBottom:10,
                fontSize:12, textTransform:"uppercase", letterSpacing:".08em" }}>{title}</div>
              {links.map(l => <div key={l} style={{ color:"#81C784", fontSize:13,
                marginBottom:8, cursor:"pointer" }}>{l}</div>)}
            </div>
          ))}
        </div>
        <div style={{ borderTop:"1px solid #2E4D2E", paddingTop:20,
          textAlign:"center", fontSize:12, color:"#66BB6A" }}>
          © 2026 PLANNOVA ARTIFICIAL INTELLIGENCE REVIEW CENTER. All Rights Reserved. · DTI Registered Business
        </div>
      </div>
    </footer>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // HOME PAGE
  // ════════════════════════════════════════════════════════════════════════════
  const HomePage = () => (
    <div>
      <div style={{ position:"relative", background:"linear-gradient(135deg,#1B5E20,#2E7D32 50%,#1565C0)",
        padding:"100px 20px", overflow:"hidden", minHeight:500, display:"flex", alignItems:"center" }}>
        <TopoWatermark/>
        <div style={{ maxWidth:760, margin:"0 auto", textAlign:"center", position:"relative" }}>
          <div style={{ display:"inline-block", background:"rgba(76,175,80,.25)",
            border:"1px solid rgba(76,175,80,.5)", borderRadius:99, padding:"6px 18px",
            fontSize:12, fontWeight:700, color:"#A5D6A7", marginBottom:20 }}>
            ✦ Philippines' Leading EP Review Center
          </div>
          <h1 style={{ fontFamily:"'Georgia',serif", fontWeight:900, lineHeight:1.1,
            fontSize:"clamp(36px,5vw,62px)", color:"#fff", marginBottom:20 }}>
            PLANNOVA<br/><span style={{ color:"#A5D6A7", fontSize:"clamp(20px,3vw,40px)" }}>AI Review Center</span><br/><span style={{ fontSize:"clamp(16px,2vw,24px)", color:"rgba(255,255,255,.85)" }}>Become a Licensed Environmental Planner</span>
          </h1>
          <p style={{ fontSize:18, color:"#C8E6C9", lineHeight:1.7, maxWidth:580,
            margin:"0 auto 36px" }}>
            Join the review center behind successful Environmental Planning Licensure
            Examination passers and topnotchers.
          </p>
          <div style={{ display:"flex", gap:14, justifyContent:"center", flexWrap:"wrap" }}>
            <button style={S.btn(true)} onClick={() => nav("enroll")}>Enroll Now →</button>
            <button style={{ ...S.btn(false), color:"#A5D6A7", outline:"2px solid rgba(165,214,167,.6)" }}
              onClick={() => nav("programs")}>View Programs</button>
            <button style={{ background:"rgba(33,150,243,.2)", color:"#90CAF9",
              border:"1px solid rgba(33,150,243,.5)", borderRadius:8,
              padding:"12px 24px", cursor:"pointer", fontWeight:700, fontSize:14 }}
              onClick={() => nav("ai-tools")}>🤖 Try AI Study Assistant</button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:"-40px auto 0", padding:"0 20px", position:"relative", zIndex:10 }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:16 }}>
          {[["2,400+","Licensure Passers","#2E7D32"],["94%","Board Exam Pass Rate","#1976D2"],
            ["18","Subject Modules","#388E3C"],["AI","Powered Study Tools","#7B1FA2"]].map(([v,l,c]) =>
            <StatCard key={l} value={v} label={l} color={c}/>)}
        </div>
      </div>

      {/* ── TOPNOTCHER SPOTLIGHT ─────────────────────────────────────────── */}
      <div style={{ maxWidth:1100, margin:"72px auto 0", padding:"0 20px" }}>
        <div style={{ position:"relative", overflow:"hidden", borderRadius:20,
          background:"linear-gradient(135deg,#1B5E20 0%,#2E7D32 45%,#F9A825 100%)",
          padding:"48px 40px", display:"grid", gridTemplateColumns:"auto 1fr",
          gap:40, alignItems:"center" }}>

          {/* Gold shimmer rings behind the avatar */}
          <div style={{ position:"absolute", top:-40, left:-40, width:260, height:260,
            borderRadius:"50%", border:"2px solid rgba(249,168,37,.25)", pointerEvents:"none" }}/>
          <div style={{ position:"absolute", top:-20, left:-20, width:220, height:220,
            borderRadius:"50%", border:"2px solid rgba(249,168,37,.18)", pointerEvents:"none" }}/>

          {/* Photo */}
          <div style={{ position:"relative", zIndex:2 }}>
            <div style={{ width:130, height:130, borderRadius:"50%", overflow:"hidden",
              boxShadow:"0 0 0 5px #F9A825, 0 0 0 10px rgba(249,168,37,.35), 0 8px 32px rgba(0,0,0,.35)",
              flexShrink:0 }}>
              <img src="https://raw.githubusercontent.com/urbanwiseplanning2025-ctrl/plannova-ai/main/EnP_Collano.jpg"
                alt="EnP Theodorico M. Collano Jr. — 2026 EPLEB Topnotcher"
                style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top" }}/>
            </div>
            {/* Topnotcher badge */}
            <div style={{ position:"absolute", bottom:-6, left:"50%", transform:"translateX(-50%)",
              background:"#F9A825", color:"#1A2B1A", borderRadius:99, padding:"3px 14px",
              fontSize:10, fontWeight:900, letterSpacing:".1em", whiteSpace:"nowrap",
              boxShadow:"0 2px 8px rgba(0,0,0,.2)" }}>
              🏆 # 1 TOPNOTCHER
            </div>
          </div>

          {/* Text */}
          <div style={{ position:"relative", zIndex:2 }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:8,
              background:"rgba(249,168,37,.2)", border:"1px solid rgba(249,168,37,.5)",
              borderRadius:99, padding:"4px 14px", marginBottom:14 }}>
              <span style={{ fontSize:14 }}>⭐</span>
              <span style={{ fontSize:11, fontWeight:700, color:"#FFD54F",
                letterSpacing:".12em", textTransform:"uppercase" }}>
                2026 EPLE Board Examination · PLANNOVA Graduate
              </span>
            </div>

            <h2 style={{ fontFamily:"'Georgia',serif", fontWeight:900, color:"#fff",
              fontSize:"clamp(22px,3.5vw,38px)", lineHeight:1.1, marginBottom:8 }}>
              EnP Theodorico M. Collano Jr.
            </h2>
            <p style={{ color:"#A5D6A7", fontSize:16, fontWeight:600, marginBottom:16 }}>
              Environmental Planner · 2026 EPLEB <span style={{ color:"#FFD54F" }}>Board Exam Topnotcher</span>
            </p>
            <p style={{ color:"rgba(255,255,255,.82)", fontSize:14, lineHeight:1.75,
              maxWidth:560, marginBottom:24 }}>
              "The first PLANNOVA reviewee to claim the coveted Top 1 spot in the 2026
              Environmental Planning Licensure Examination — a testament to what focused
              review, expert guidance, and dedication can achieve."
            </p>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              <button style={{ background:"#F9A825", color:"#1A2B1A", border:"none",
                borderRadius:8, padding:"11px 24px", fontWeight:800, fontSize:14, cursor:"pointer" }}
                onClick={() => nav("enroll")}>
                Follow His Path — Enroll Now
              </button>
              <button style={{ background:"rgba(255,255,255,.12)",
                border:"2px solid rgba(255,255,255,.35)", color:"#fff",
                borderRadius:8, padding:"11px 24px", fontWeight:700, fontSize:14, cursor:"pointer" }}
                onClick={() => nav("programs")}>
                View Programs
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── WALL OF SUCCESS ──────────────────────────────────────────────── */}
      <div style={{ maxWidth:1100, margin:"72px auto 0", padding:"0 20px" }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <p style={{ color:"#F9A825", fontWeight:700, fontSize:12,
            letterSpacing:".14em", textTransform:"uppercase", marginBottom:8 }}>
            🏅 Wall of Success
          </p>
          <h2 style={{ fontFamily:"'Georgia',serif", fontSize:"clamp(24px,3vw,36px)",
            fontWeight:900, color:textMain, marginBottom:12 }}>
            2026 EPLE Board Exam Passers
          </h2>
          <p style={{ color:textSub, fontSize:15, maxWidth:520, margin:"0 auto" }}>
            Congratulations to our proud PLANNOVA graduates who passed the 2026
            Environmental Planning Licensure Examination!
          </p>
        </div>

        {/* Topnotcher big card */}
        <div style={{ background:"linear-gradient(135deg,#1B5E20,#2E7D32)",
          borderRadius:16, padding:"28px 32px", marginBottom:20,
          display:"flex", alignItems:"center", gap:24, flexWrap:"wrap",
          boxShadow:"0 4px 24px rgba(46,125,50,.3)", border:"2px solid #4CAF50" }}>
          <div style={{ width:80, height:80, borderRadius:"50%", overflow:"hidden",
            flexShrink:0, boxShadow:"0 0 0 4px #F9A825, 0 0 0 7px rgba(249,168,37,.3)" }}>
            <img src="https://raw.githubusercontent.com/urbanwiseplanning2025-ctrl/plannova-ai/main/EnP_Collano.jpg"
              alt="EnP Theodorico M. Collano Jr."
              style={{ width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top" }}/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:4 }}>
              <span style={{ background:"#F9A825", color:"#1A2B1A", borderRadius:99,
                padding:"3px 14px", fontSize:11, fontWeight:900, letterSpacing:".08em" }}>
                # 1 TOPNOTCHER
              </span>
              <span style={{ background:"rgba(255,255,255,.15)", color:"#A5D6A7",
                borderRadius:99, padding:"3px 12px", fontSize:11, fontWeight:700 }}>
                2026 EPLEB
              </span>
            </div>
            <h3 style={{ fontFamily:"'Georgia',serif", fontWeight:900, color:"#fff",
              fontSize:24, margin:"6px 0 2px" }}>
              EnP Theodorico M. Collano Jr.
            </h3>
            <p style={{ color:"#A5D6A7", fontSize:13 }}>
              PLANNOVA's First Reviewee · Top 1 · 2026 Environmental Planning Licensure Examination
            </p>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:36, fontWeight:900, color:"#FFD54F" }}>🥇</div>
            <div style={{ fontSize:11, color:"#A5D6A7", fontWeight:600, marginTop:2 }}>Top 1</div>
          </div>
        </div>

        {/* Other passers grid — with real photos */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))", gap:16 }}>

          {/* EnP Krisma Palado Alcantara */}
          {[{
            name:"EnP Krisma Palado Alcantara",
            img:PASSER_PHOTOS[0], border:"#2E7D32",
            badge:"#E8F5E9", badgeText:"#2E7D32",
          },{
            name:"EnP Leah Leopoldo Guarana",
            img:PASSER_PHOTOS[1], border:"#1976D2",
            badge:"#E3F2FD", badgeText:"#1565C0",
          },{
            name:"EnP Angela Palanca Añonuevo",
            img:PASSER_PHOTOS[2], border:"#388E3C",
            badge:"#E8F5E9", badgeText:"#388E3C",
          },{
            name:"EnP Arvin Jay Manalo",
            img:PASSER_PHOTOS[3], border:"#7B1FA2",
            badge:"#F3E5F5", badgeText:"#6A1B9A",
          }].map(p => (
            <div key={p.name} style={{ ...S.card,
              borderTop:`4px solid ${p.border}`,
              display:"flex", alignItems:"center", gap:18 }}>
              <div style={{ width:76, height:76, borderRadius:"50%",
                overflow:"hidden", flexShrink:0,
                boxShadow:`0 0 0 3px ${p.border}, 0 0 0 6px ${p.border}33` }}>
                <img src={p.img} alt={p.name}
                  style={{ width:"100%", height:"100%",
                    objectFit:"cover", objectPosition:"center top" }}/>
              </div>
              <div>
                <span style={{ background:p.badge, color:p.badgeText,
                  borderRadius:99, padding:"2px 10px", fontSize:10,
                  fontWeight:700, display:"inline-block", marginBottom:6 }}>
                  2026 EPLEB Passer
                </span>
                <div style={{ fontWeight:800, fontSize:15,
                  color:textMain, lineHeight:1.3 }}>{p.name}</div>
                <div style={{ fontSize:12, color:textSub, marginTop:3 }}>
                  Licensed Environmental Planner
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA under the wall */}
        <div style={{ textAlign:"center", marginTop:36, padding:"28px 20px",
          background:DM?"#162218":"#F1F8F1", borderRadius:14, border:`1px solid ${border}` }}>
          <p style={{ color:textMain, fontWeight:700, fontSize:16, marginBottom:6 }}>
            Your name could be on this wall next. 🌿
          </p>
          <p style={{ color:textSub, fontSize:14, marginBottom:20 }}>
            Join PLANNOVA ARTIFICIAL INTELLIGENCE REVIEW CENTER — the review center that produced the 2026 EPLEB Topnotcher.
          </p>
          <button style={S.btn(true)} onClick={() => nav("enroll")}>
            Start Your Journey → Enroll Now
          </button>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:"60px auto 0", padding:"0 20px" }}>
        <div style={{ background:"linear-gradient(135deg,#0D47A1,#1565C0,#1976D2)",
          borderRadius:16, padding:"40px 32px", display:"grid",
          gridTemplateColumns:"1fr 1fr", gap:32, alignItems:"center" }}>
          <div>
            <div style={{ color:"#90CAF9", fontWeight:700, fontSize:12,
              textTransform:"uppercase", letterSpacing:".12em", marginBottom:10 }}>🤖 PLANNOVA Exclusive</div>
            <h2 style={{ fontFamily:"'Georgia',serif", fontWeight:800,
              color:"#fff", fontSize:26, marginBottom:12 }}>Study Smarter with AI</h2>
            <p style={{ color:"#BBDEFB", fontSize:14, lineHeight:1.7, marginBottom:20 }}>
              24/7 AI Study Assistant + instant AI-generated practice quizzes on any EPLEB topic.
            </p>
            <button style={{ ...S.btn(true), background:"rgba(255,255,255,.15)",
              border:"2px solid rgba(255,255,255,.4)", color:"#fff" }} onClick={() => nav("ai-tools")}>
              Try AI Tools →
            </button>
          </div>
          <div style={{ display:"grid", gap:10 }}>
            {[["🤖 AI Study Assistant","Ask anything about EP laws, CLUP, GIS, EIA"],
              ["✨ AI Quiz Generator","Custom practice quizzes on any EPLEB topic"],
              ["💡 Instant Explanations","AI explains every answer with law references"]].map(([t,d]) => (
              <div key={t} style={{ background:"rgba(255,255,255,.1)", borderRadius:10, padding:"14px 18px" }}>
                <div style={{ fontWeight:700, color:"#fff", fontSize:14, marginBottom:4 }}>{t}</div>
                <div style={{ color:"#BBDEFB", fontSize:13 }}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1100, margin:"60px auto 0", padding:"0 20px" }}>
        <p style={{ color:"#4CAF50", fontWeight:700, fontSize:12,
          letterSpacing:".12em", textTransform:"uppercase" }}>Programs</p>
        <h2 style={S.sectionTitle}>Designed for Planners</h2>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))", gap:20, marginTop:32 }}>
          {PROGRAMS.map(p => (
            <div key={p.id} style={{ ...S.card, borderTop:`4px solid ${p.color}` }}>
              <div style={{ fontSize:11, fontWeight:700, color:p.color,
                textTransform:"uppercase", letterSpacing:".1em", marginBottom:8 }}>{p.category}</div>
              <h3 style={{ fontSize:17, fontWeight:800, marginBottom:10, color:textMain }}>{p.title}</h3>
              <p style={{ fontSize:13, color:textSub, lineHeight:1.6, marginBottom:16 }}>{p.desc}</p>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
                {p.modes.map(m => <span key={m} style={{ background:"#E8F5E9", color:"#2E7D32",
                  borderRadius:6, padding:"3px 10px", fontSize:11, fontWeight:600 }}>{m}</span>)}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between",
                marginBottom:16, fontSize:13, color:textSub }}>
                <span>⏱ {p.duration}</span>
                <span style={{ fontWeight:800, color:p.color }}>{p.fee}</span>
              </div>
              <button style={{ ...S.btn(true), background:p.color, width:"100%", textAlign:"center" }}
                onClick={() => nav("enroll")}>Enroll Now</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // ENROLL PAGE — saves to Supabase
  // ════════════════════════════════════════════════════════════════════════════
  const EnrollPage = () => {
    const steps = ["Personal","Education","Program","Documents","Submit"];
    const [refNo, setRefNo] = useState("");

    const handleFileUpload = async (field, file) => {
      if (!file) return;
      try {
        const path = `${Date.now()}_${file.name}`;
        const url = await sb.upload("documents", path, file);
        setEnrollData(d => ({...d, [field]:url, [field+"_name"]:file.name}));
        showToast(`${file.name} uploaded ✓`);
      } catch {
        showToast("Upload failed — check Supabase storage settings","error");
      }
    };

    const submitEnrollment = async () => {
      setSubmitting(true);
      try {
        const ref = `PLANNOVA-2026-${Math.floor(Math.random()*9000)+1000}`;
        await sb.insert("students", {
          reference_no:    ref,
          first_name:      enrollData.firstName || "",
          middle_name:     enrollData.middleName || "",
          last_name:       enrollData.lastName || "",
          email:           enrollData.email || "",
          contact:         enrollData.contact || "",
          gender:          enrollData.gender || "",
          birthdate:       enrollData.birthdate || null,
          civil_status:    enrollData.civil || "",
          university:      enrollData.university || "",
          degree:          enrollData.degree || "",
          grad_year:       enrollData.gradYear || "",
          occupation:      enrollData.occupation || "",
          company:         enrollData.company || "",
          program:         enrollData.program || "",
          learning_mode:   enrollData.mode || "",
          valid_id_url:    enrollData.validId || "",
          diploma_url:     enrollData.diploma || "",
          photo_url:       enrollData.photo || "",
          status:          "Pending",
          payment_status:  "Unpaid",
          progress:        0,
        });
        setRefNo(ref);
        setEnrollStep(6);
        showToast("Enrollment submitted successfully!");
      } catch(e) {
        showToast("Submission failed: " + e.message, "error");
      }
      setSubmitting(false);
    };

    return (
      <div style={{ maxWidth:760, margin:"0 auto", padding:"48px 20px" }}>
        <h2 style={S.sectionTitle}>PLANNOVA Student Enrollment</h2>

        {/* Step bar */}
        <div style={{ display:"flex", alignItems:"center", marginBottom:36 }}>
          {steps.map((s,i) => (
            <div key={s} style={{ display:"flex", alignItems:"center", flex:1 }}>
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                <div style={{ width:32, height:32, borderRadius:"50%",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  background:enrollStep>i+1?"#4CAF50":enrollStep===i+1?"#2E7D32":border,
                  color:enrollStep>=i+1?"#fff":textSub, fontWeight:700, fontSize:13 }}>
                  {enrollStep>i+1?"✓":i+1}
                </div>
                <div style={{ fontSize:10, color:enrollStep===i+1?"#2E7D32":textSub,
                  fontWeight:600, whiteSpace:"nowrap" }}>{s}</div>
              </div>
              {i<steps.length-1 && <div style={{ flex:1, height:2,
                background:enrollStep>i+1?"#4CAF50":border, margin:"0 4px", marginBottom:20 }}/>}
            </div>
          ))}
        </div>

        <div style={S.card}>
          {/* Step 1 */}
          {enrollStep===1 && (
            <div>
              <h3 style={{ fontWeight:800, fontSize:18, marginBottom:20, color:textMain }}>Personal Information</h3>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                {[["First Name","firstName"],["Middle Name","middleName"],
                  ["Last Name","lastName"],["Contact Number","contact"],["Email","email"]].map(([l,k]) => (
                  <div key={k}>
                    <label style={S.label}>{l}</label>
                    <input style={S.input} placeholder={l} value={enrollData[k]||""}
                      onChange={e => setEnrollData(d=>({...d,[k]:e.target.value}))}/>
                  </div>
                ))}
                <div><label style={S.label}>Gender</label>
                  <select style={S.input} value={enrollData.gender||""}
                    onChange={e => setEnrollData(d=>({...d,gender:e.target.value}))}>
                    <option value="">Select</option>
                    <option>Male</option><option>Female</option><option>Prefer not to say</option>
                  </select></div>
                <div><label style={S.label}>Birthdate</label>
                  <input style={S.input} type="date" value={enrollData.birthdate||""}
                    onChange={e => setEnrollData(d=>({...d,birthdate:e.target.value}))}/></div>
                <div><label style={S.label}>Civil Status</label>
                  <select style={S.input} value={enrollData.civil||""}
                    onChange={e => setEnrollData(d=>({...d,civil:e.target.value}))}>
                    <option value="">Select</option>
                    <option>Single</option><option>Married</option><option>Widowed</option>
                  </select></div>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {enrollStep===2 && (
            <div>
              <h3 style={{ fontWeight:800, fontSize:18, marginBottom:20, color:textMain }}>Education & Career</h3>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
                {[["College / University","university"],["Degree Program","degree"],
                  ["Graduation Year","gradYear"],["Current Occupation","occupation"],
                  ["Company / Organization","company"]].map(([l,k]) => (
                  <div key={k}>
                    <label style={S.label}>{l}</label>
                    <input style={S.input} placeholder={l} value={enrollData[k]||""}
                      onChange={e => setEnrollData(d=>({...d,[k]:e.target.value}))}/>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 */}
          {enrollStep===3 && (
            <div>
              <h3 style={{ fontWeight:800, fontSize:18, marginBottom:20, color:textMain }}>Program & Mode</h3>
              <div style={{ display:"grid", gap:16 }}>
                <div><label style={S.label}>Review Program</label>
                  <select style={S.input} value={enrollData.program||""}
                    onChange={e => setEnrollData(d=>({...d,program:e.target.value}))}>
                    <option value="">Select Program</option>
                    <option>EP Board Review – Full Program</option>
                    <option>EP Board Review – Weekend Classes</option>
                    <option>EP Board Review – Online</option>
                    <option>Urban Planning Specialization</option>
                    <option>CPD Seminar</option>
                    <option>Workshop</option>
                  </select></div>
                <div><label style={S.label}>Learning Mode</label>
                  <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                    {["Face-to-Face","Online","Hybrid"].map(m => (
                      <label key={m} style={{ display:"flex", alignItems:"center",
                        gap:8, cursor:"pointer", fontSize:14, color:textMain }}>
                        <input type="radio" name="mode" value={m}
                          checked={enrollData.mode===m}
                          onChange={e => setEnrollData(d=>({...d,mode:e.target.value}))}/>{m}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4 — file uploads to Supabase Storage */}
          {enrollStep===4 && (
            <div>
              <h3 style={{ fontWeight:800, fontSize:18, marginBottom:8, color:textMain }}>Upload Documents</h3>
              <p style={{ color:textSub, fontSize:13, marginBottom:20 }}>
                Files are saved securely to Supabase Storage.
              </p>
              {[["Valid Government ID","validId"],
                ["Diploma or Transcript of Records","diploma"],
                ["Passport-size Photo","photo"]].map(([l,k]) => (
                <div key={k} style={{ marginBottom:20 }}>
                  <label style={S.label}>{l}</label>
                  <div style={{ border:`2px dashed ${border}`, borderRadius:10,
                    padding:"24px 20px", textAlign:"center",
                    background:enrollData[k+"_name"]?"#E8F5E9":"transparent" }}>
                    <input type="file" id={k} style={{ display:"none" }}
                      onChange={e => handleFileUpload(k, e.target.files[0])}/>
                    <label htmlFor={k} style={{ cursor:"pointer" }}>
                      {enrollData[k+"_name"]
                        ? <span style={{ color:"#2E7D32", fontWeight:700 }}>✓ {enrollData[k+"_name"]}</span>
                        : <span style={{ color:textSub }}>📎 Click to upload {l}</span>}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 5 — review */}
          {enrollStep===5 && (
            <div>
              <h3 style={{ fontWeight:800, fontSize:18, marginBottom:20, color:textMain }}>Review & Submit</h3>
              <div style={{ background:"#F1F8F1", borderRadius:10, padding:20, marginBottom:20 }}>
                {[["Name",`${enrollData.firstName||""} ${enrollData.lastName||""}`],
                  ["Email",enrollData.email||"—"],
                  ["Program",enrollData.program||"—"],
                  ["Mode",enrollData.mode||"—"],
                  ["University",enrollData.university||"—"],
                ].map(([k,v]) => (
                  <div key={k} style={{ display:"flex", justifyContent:"space-between",
                    padding:"8px 0", borderBottom:`1px solid #D7EAD7`, fontSize:14 }}>
                    <span style={{ color:textSub, fontWeight:600 }}>{k}</span>
                    <span style={{ color:textMain, fontWeight:700 }}>{v}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize:13, color:textSub, marginBottom:20 }}>
                By submitting you agree to our Terms & Conditions and Privacy Policy.
              </p>
              <button
                style={{ ...S.btn(true), width:"100%", textAlign:"center",
                  fontSize:15, padding:14, opacity:submitting?.6:1 }}
                onClick={submitEnrollment} disabled={submitting}>
                {submitting ? "Submitting…" : "Submit Enrollment Application"}
              </button>
            </div>
          )}

          {/* Step 6 — success */}
          {enrollStep===6 && (
            <div style={{ textAlign:"center", padding:"40px 20px" }}>
              <div style={{ fontSize:64, marginBottom:16 }}>🎉</div>
              <h3 style={{ fontWeight:900, fontSize:24, color:"#2E7D32", marginBottom:12 }}>
                Application Submitted!
              </h3>
              <p style={{ color:textSub, fontSize:15, marginBottom:8 }}>
                Reference No: <strong style={{ color:"#2E7D32" }}>{refNo}</strong>
              </p>
              <p style={{ fontSize:13, color:textSub, marginBottom:28 }}>
                Your data is saved to our database. We'll review your documents and
                email you within 2–3 business days.
              </p>
              <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
                <button style={S.btn(false)} onClick={() => { nav("ai-tools"); setEnrollStep(1); }}>
                  Try AI Tools
                </button>
                <button style={S.btn(true)} onClick={() => { nav("student-portal"); setEnrollStep(1); }}>
                  Student Portal
                </button>
              </div>
            </div>
          )}

          {enrollStep<6 && enrollStep!==5 && (
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:28 }}>
              {enrollStep>1 && <button style={S.btn(false)} onClick={() => setEnrollStep(s=>s-1)}>← Back</button>}
              <button style={{ ...S.btn(true), marginLeft:"auto" }}
                onClick={() => setEnrollStep(s=>s+1)}>Continue →</button>
            </div>
          )}
          {enrollStep===5 && (
            <div style={{ marginTop:16 }}>
              <button style={S.btn(false)} onClick={() => setEnrollStep(4)}>← Back</button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════════════
  // STUDENT PORTAL
  // ════════════════════════════════════════════════════════════════════════════
  const PortalPage = () => {
    const tabs = ["dashboard","courses","schedule","payments","lms"];
    const tabLabels = { dashboard:"Dashboard", courses:"Courses", schedule:"Schedule", payments:"Payments", lms:"Resources" };
    return (
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"36px 20px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
          marginBottom:24, flexWrap:"wrap", gap:12 }}>
          <div>
            <h2 style={S.sectionTitle}>Student Portal</h2>
            <p style={{ color:textSub, fontSize:14 }}>
              {session?.user?.email || "student@plannova.ph"}
            </p>
          </div>
          <div style={{ display:"flex", gap:6, background:DM?"#1E3A20":"#F1F8F1",
            borderRadius:10, padding:4, flexWrap:"wrap" }}>
            {tabs.map(t => (
              <button key={t} onClick={() => setPortalTab(t)}
                style={{ background:portalTab===t?"#2E7D32":"transparent",
                  color:portalTab===t?"#fff":textSub, border:"none", borderRadius:7,
                  padding:"8px 12px", cursor:"pointer", fontWeight:600, fontSize:12 }}>
                {tabLabels[t]}
              </button>
            ))}
            <button onClick={() => nav("ai-tools")}
              style={{ background:"#1565C0", color:"#fff", border:"none", borderRadius:7,
                padding:"8px 12px", cursor:"pointer", fontWeight:700, fontSize:12 }}>
              🤖 AI Tools
            </button>
          </div>
        </div>

        {portalTab==="dashboard" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",
              gap:16, marginBottom:28 }}>
              <StatCard value="Pending" label="Enrollment Status" color="#E65100"/>
              <StatCard value="Unpaid" label="Payment Status" color="#1976D2"/>
              <StatCard value="0%" label="Review Progress" color="#388E3C"/>
              <StatCard value="Jun 16" label="Next Exam" color="#E65100"/>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
              <div style={S.card}>
                <div style={{ display:"flex", justifyContent:"space-between",
                  alignItems:"center", marginBottom:16 }}>
                  <h4 style={{ fontWeight:800, color:textMain }}>📢 Announcements</h4>
                  <span style={{ background:"#E8F5E9", color:"#2E7D32",
                    borderRadius:99, padding:"3px 10px", fontSize:11, fontWeight:700 }}>
                    From Admin
                  </span>
                </div>
                {[{ title:"Enrollment Now Open — 2026 Batch",
                    body:"Secure your slot! Limited seats available for the 2026 EPLEB Review Batch.",
                    badge:"New", color:"#2E7D32", date:"Jun 29" },
                  { title:"🏆 Congratulations 2026 Passers!",
                    body:"EnP Collano Jr. topped the board! PLANNOVA is proud of all our passers.",
                    badge:"Achievement", color:"#F9A825", date:"Jun 28" },
                  { title:"NOVA AI Tools Now Live",
                    body:"AI Study Assistant and AI Quiz Generator are now available — try them free!",
                    badge:"Feature", color:"#1565C0", date:"Jun 27" },
                ].map((ann) => (
                  <div key={ann.title} style={{ padding:"12px 0",
                    borderBottom:`1px solid ${border}` }}>
                    <div style={{ display:"flex", alignItems:"center",
                      gap:8, marginBottom:5 }}>
                      <span style={{ background:ann.color, color:"#fff",
                        borderRadius:99, padding:"2px 9px",
                        fontSize:10, fontWeight:700 }}>{ann.badge}</span>
                      <span style={{ fontSize:11, color:textSub }}>{ann.date}</span>
                    </div>
                    <div style={{ fontWeight:700, fontSize:14,
                      color:textMain, marginBottom:3 }}>{ann.title}</div>
                    <div style={{ fontSize:12, color:textSub,
                      lineHeight:1.6 }}>{ann.body}</div>
                  </div>
                ))}
              </div>
              <div style={S.card}>
                <h4 style={{ fontWeight:800, marginBottom:16, color:textMain }}>📈 Progress</h4>
                {[["Environmental Laws",80,"#2E7D32"],["Land Use Planning",65,"#1976D2"],
                  ["Urban Design",55,"#388E3C"],["GIS Applications",45,"#E65100"]].map(([s,p,c]) => (
                  <div key={s} style={{ marginBottom:14 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:4 }}>
                      <span style={{ color:textMain }}>{s}</span>
                      <span style={{ color:c, fontWeight:700 }}>{p}%</span>
                    </div>
                    <ProgressBar pct={p} color={c}/>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {portalTab==="courses" && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))", gap:20 }}>
            {[["Environmental Laws & Ethics",80,"12/15"],["Land Use Planning",65,"9/14"],
              ["Urban Design",55,"8/14"],["GIS Applications",45,"6/13"],
              ["Climate & DRR",30,"4/14"]].map(([t,p,sub]) => (
              <div key={t} style={S.card}>
                <div style={{ fontSize:32, marginBottom:12 }}>📚</div>
                <h4 style={{ fontWeight:800, fontSize:15, marginBottom:4, color:textMain }}>{t}</h4>
                <p style={{ fontSize:12, color:textSub, marginBottom:12 }}>{sub} modules</p>
                <ProgressBar pct={p}/>
                <div style={{ display:"flex", gap:8, marginTop:14, flexWrap:"wrap" }}>
                  {["PDFs","Videos","Guides"].map(a => (
                    <button key={a} style={{ background:"#E8F5E9", color:"#2E7D32", border:"none",
                      borderRadius:6, padding:"5px 10px", fontSize:11, fontWeight:600, cursor:"pointer" }}>
                      ⬇ {a}
                    </button>
                  ))}
                  <button onClick={() => nav("ai-tools")}
                    style={{ background:"#E3F2FD", color:"#1565C0", border:"none",
                      borderRadius:6, padding:"5px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                    🤖 Quiz
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {portalTab==="schedule" && (
          <div style={S.card}>
            <h3 style={{ fontWeight:800, marginBottom:20, color:textMain }}>Class Schedule – June 2026</h3>
            {SCHEDULE_DATA.map(ev => (
              <div key={ev.label} style={{ display:"flex", alignItems:"center",
                gap:16, padding:"14px 0", borderBottom:`1px solid ${border}` }}>
                <div style={{ textAlign:"center", minWidth:52, background:"#E8F5E9",
                  borderRadius:8, padding:"6px 0" }}>
                  <div style={{ fontSize:18, fontWeight:900, color:"#2E7D32" }}>{ev.date.split(" ")[1]}</div>
                  <div style={{ fontSize:10, color:"#4CAF50", fontWeight:700 }}>{ev.day}</div>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:textMain }}>{ev.label}</div>
                </div>
                <span style={S.tag(ev.type)}>{typeTag[ev.type]?.label}</span>
              </div>
            ))}
          </div>
        )}

        {portalTab==="payments" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
            <div style={S.card}>
              <h3 style={{ fontWeight:800, fontSize:18, marginBottom:20, color:textMain }}>Pay Now</h3>
              {[["GCash","💚","09XX-XXX-XXXX"],["Maya","💜","09XX-XXX-XXXX"],
                ["BDO Bank","🏦","Acct: 0042-1234-5678"]].map(([m,ic,d]) => (
                <div key={m} style={{ display:"flex", alignItems:"center", gap:12,
                  padding:"12px 0", borderBottom:`1px solid ${border}` }}>
                  <span style={{ fontSize:22 }}>{ic}</span>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14, color:textMain }}>{m}</div>
                    <div style={{ fontSize:12, color:textSub }}>{d}</div>
                  </div>
                </div>
              ))}
              <div style={{ marginTop:20 }}>
                <label style={S.label}>Upload Proof of Payment</label>
                <input type="file" id="payproof" style={{ display:"none" }}
                  onChange={async e => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setPayProof("uploading…");
                    try {
                      const url = await sb.upload("documents", `payments/${Date.now()}_${file.name}`, file);
                      setPayProof(file.name);
                      showToast("Payment proof uploaded ✓");
                    } catch {
                      setPayProof(null);
                      showToast("Upload failed","error");
                    }
                  }}/>
                <label htmlFor="payproof" style={{ display:"block", border:`2px dashed ${border}`,
                  borderRadius:10, padding:20, textAlign:"center", cursor:"pointer",
                  color:payProof?"#2E7D32":textSub, background:payProof?"#E8F5E9":"transparent" }}>
                  {payProof ? `✓ ${payProof}` : "📎 Click to upload receipt"}
                </label>
              </div>
            </div>
            <div style={S.card}>
              <h3 style={{ fontWeight:800, fontSize:18, marginBottom:16, color:textMain }}>History</h3>
              <p style={{ color:textSub, fontSize:13 }}>No payment records yet. After uploading proof, our admin team will verify within 24 hours.</p>
            </div>
          </div>
        )}

        {portalTab==="lms" && (
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",
              gap:16, marginBottom:24 }}>
              {[["📄","PDF Reviewers","14 files"],["🎬","Video Lectures","42 videos"],
                ["📓","E-books","8 titles"],["🎙","Webinars","19 recordings"]].map(([ic,t,s]) => (
                <div key={t} style={{ ...S.card, textAlign:"center" }}>
                  <div style={{ fontSize:36, marginBottom:10 }}>{ic}</div>
                  <div style={{ fontWeight:800, fontSize:15, color:textMain }}>{t}</div>
                  <div style={{ color:textSub, fontSize:13, marginBottom:12 }}>{s}</div>
                  <button style={{ ...S.btn(true), fontSize:12, padding:"8px 16px" }}>Browse</button>
                </div>
              ))}
            </div>
            <div style={{ ...S.card, background:"linear-gradient(135deg,#0D47A1,#1565C0)", marginBottom:20 }}>
              <div style={{ display:"flex", justifyContent:"space-between",
                alignItems:"center", flexWrap:"wrap", gap:12 }}>
                <div>
                  <div style={{ fontWeight:800, color:"#fff", fontSize:15, marginBottom:4 }}>
                    🤖 AI Study Assistant
                  </div>
                  <div style={{ color:"#BBDEFB", fontSize:13 }}>
                    Ask any EP review question and get expert AI answers instantly.
                  </div>
                </div>
                <button style={{ ...S.btn(true), background:"rgba(255,255,255,.2)",
                  border:"2px solid rgba(255,255,255,.4)", color:"#fff" }}
                  onClick={() => nav("ai-tools")}>Open →</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ════════════════════════════════════════════════════════════════════════════
  // AI TOOLS PAGE
  // ════════════════════════════════════════════════════════════════════════════
  const AIToolsPage = () => (
    <div style={{ maxWidth:1100, margin:"0 auto", padding:"36px 20px" }}>
      <div style={{ marginBottom:24 }}>
        <h2 style={S.sectionTitle}>🤖 AI Study Tools</h2>
        <p style={{ color:textSub, fontSize:15 }}>Powered by Claude AI — built for EPLEB review.</p>
      </div>
      <div style={{ display:"flex", gap:0, marginBottom:24,
        background:DM?"#1E3A20":"#F1F8F1", borderRadius:10, padding:4, width:"fit-content" }}>
        {[["assistant","🌿 AI Study Assistant"],["quiz","✨ AI Quiz Generator"]].map(([t,l]) => (
          <button key={t} onClick={() => setAiTab(t)}
            style={{ background:aiTab===t?(t==="quiz"?"#1565C0":"#2E7D32"):"transparent",
              color:aiTab===t?"#fff":textSub, border:"none", borderRadius:7,
              padding:"10px 20px", cursor:"pointer", fontWeight:700, fontSize:14 }}>{l}</button>
        ))}
      </div>

      {aiTab==="assistant" && (
        <div style={{ ...S.card, padding:0, overflow:"hidden", height:620,
          display:"flex", flexDirection:"column" }}>
          <div style={{ background:"linear-gradient(135deg,#2E7D32,#4CAF50)",
            padding:"14px 20px", display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:"50%",
              background:"rgba(255,255,255,.2)", display:"flex",
              alignItems:"center", justifyContent:"center", fontSize:18 }}>🌿</div>
            <div>
              <div style={{ fontWeight:800, color:"#fff", fontSize:15 }}>NOVA — PLANNOVA AI Study Assistant</div>
              <div style={{ fontSize:11, color:"#C8E6C9" }}>Powered by Claude AI · EPLEB Expert · DTI Registered</div>
            </div>
            <div style={{ marginLeft:"auto", width:8, height:8, borderRadius:"50%",
              background:"#A5D6A7", boxShadow:"0 0 0 3px rgba(165,214,167,.3)" }}/>
          </div>
          <AIStudyAssistant S={S} textMain={textMain} textSub={textSub} border={border} bg1={bg1}/>
        </div>
      )}

      {aiTab==="quiz" && (
        <AIQuizGenerator S={S} textMain={textMain} textSub={textSub}
          border={border} bg1={bg1} DM={DM}/>
      )}
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // ADMIN PAGE — reads from Supabase
  // ════════════════════════════════════════════════════════════════════════════
  const AdminPage = () => {
    const updateStatus = async (id, status) => {
      try {
        await sb.update("students", `id=eq.${id}`, { status });
        setStudents(ss => ss.map(s => s.id===id ? {...s, status} : s));
        showToast(`Student ${status.toLowerCase()} ✓`);
      } catch {
        showToast("Update failed","error");
      }
    };

    return (
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"36px 20px" }}>
        <div style={{ display:"flex", justifyContent:"space-between",
          alignItems:"center", marginBottom:28, flexWrap:"wrap", gap:12 }}>
          <div>
            <h2 style={S.sectionTitle}>Admin Dashboard</h2>
            <p style={{ color:textSub, fontSize:14 }}>PLANNOVA ARTIFICIAL INTELLIGENCE REVIEW CENTER</p>
          </div>
          <div style={{ display:"flex", gap:6, background:DM?"#1E3A20":"#F1F8F1",
            borderRadius:10, padding:4 }}>
            {["enrollments","students","announcements","finance","reports"].map(t => (
              <button key={t} onClick={() => setAdminTab(t)}
                style={{ background:adminTab===t?(t==="announcements"?"#F9A825":"#2E7D32"):"transparent",
                  color:adminTab===t?"#fff":textSub, border:"none", borderRadius:7,
                  padding:"8px 14px", cursor:"pointer", fontWeight:600,
                  fontSize:13, textTransform:"capitalize" }}>{t==="announcements"?"📢 Announcements":t}</button>
            ))}
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",
          gap:16, marginBottom:32 }}>
          <StatCard value={students.length || "—"} label="Total Applicants" color="#2E7D32"/>
          <StatCard value={students.filter(s=>s.status==="Pending").length || "—"} label="Pending" color="#E65100"/>
          <StatCard value={students.filter(s=>s.status==="Approved").length || "—"} label="Approved" color="#1976D2"/>
          <StatCard value="94%" label="Pass Rate" color="#388E3C"/>
        </div>

        {adminTab==="enrollments" && (
          <div style={S.card}>
            <h3 style={{ fontWeight:800, fontSize:18, marginBottom:16, color:textMain }}>
              Enrollment Applications
              <span style={{ fontSize:13, color:textSub, fontWeight:400, marginLeft:10 }}>
                (live from Supabase)
              </span>
            </h3>
            {loadingStudents ? <Spinner/> : students.length===0 ? (
              <p style={{ color:textSub, fontSize:14, padding:20, textAlign:"center" }}>
                No applications yet. Data will appear here once students submit the enrollment form.
              </p>
            ) : (
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14 }}>
                  <thead><tr style={{ background:"#E8F5E9" }}>
                    {["Ref No","Name","Program","Mode","Status","Documents","Actions"].map(h => (
                      <th key={h} style={{ padding:"10px 12px", textAlign:"left",
                        fontWeight:700, color:"#2E7D32", fontSize:11, textTransform:"uppercase",
                        letterSpacing:".06em" }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>{students.map(s => (
                    <tr key={s.id} style={{ borderBottom:`1px solid ${border}` }}>
                      <td style={{ padding:"12px", color:"#4CAF50", fontWeight:700, fontSize:11 }}>{s.reference_no}</td>
                      <td style={{ padding:"12px", fontWeight:600, color:textMain }}>
                        {s.first_name} {s.last_name}
                        <div style={{ fontSize:11, color:textSub }}>{s.email}</div>
                      </td>
                      <td style={{ padding:"12px", color:textSub, fontSize:12 }}>{s.program}</td>
                      <td style={{ padding:"12px", color:textSub, fontSize:12 }}>{s.learning_mode}</td>
                      <td style={{ padding:"12px" }}><Badge text={s.status}/></td>
                      <td style={{ padding:"12px" }}>
                        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                          {[["ID",s.valid_id_url],["Diploma",s.diploma_url],["Photo",s.photo_url]].map(([l,u]) =>
                            u ? <a key={l} href={u} target="_blank" rel="noreferrer"
                              style={{ background:"#E3F2FD", color:"#1565C0", borderRadius:5,
                                padding:"3px 8px", fontSize:10, fontWeight:700, textDecoration:"none" }}>{l}</a>
                            : <span key={l} style={{ background:"#F5F5F5", color:"#999",
                                borderRadius:5, padding:"3px 8px", fontSize:10 }}>{l}</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding:"12px" }}>
                        <div style={{ display:"flex", gap:6 }}>
                          <button onClick={() => updateStatus(s.id,"Approved")}
                            style={{ background:"#E8F5E9", color:"#2E7D32", border:"none",
                              borderRadius:6, padding:"5px 9px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                            ✓ Approve
                          </button>
                          <button onClick={() => updateStatus(s.id,"Rejected")}
                            style={{ background:"#FFEBEE", color:"#C62828", border:"none",
                              borderRadius:6, padding:"5px 9px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                            ✕ Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {adminTab==="students" && (
          <div style={S.card}>
            <h3 style={{ fontWeight:800, fontSize:18, marginBottom:16, color:textMain }}>Student Records</h3>
            {loadingStudents ? <Spinner/> : students.length===0 ? (
              <p style={{ color:textSub, fontSize:14, textAlign:"center", padding:20 }}>No students yet.</p>
            ) : students.map(s => (
              <div key={s.id} style={{ display:"flex", alignItems:"center",
                gap:16, padding:"16px 0", borderBottom:`1px solid ${border}` }}>
                <div style={{ width:44, height:44, borderRadius:"50%",
                  background:"linear-gradient(135deg,#2E7D32,#4CAF50)",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  color:"#fff", fontWeight:800, fontSize:16 }}>{s.first_name?.[0]}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, color:textMain }}>{s.first_name} {s.last_name}</div>
                  <div style={{ fontSize:12, color:textSub }}>{s.reference_no} · {s.program}</div>
                  <div style={{ marginTop:6 }}><ProgressBar pct={s.progress||0}/></div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <Badge text={s.status}/>
                  <div style={{ fontSize:11, color:textSub, marginTop:4 }}>{s.learning_mode}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {adminTab==="finance" && (
          <div style={S.card}>
            <h3 style={{ fontWeight:800, fontSize:18, marginBottom:12, color:textMain }}>Finance</h3>
            <p style={{ color:textSub, fontSize:14 }}>Connect PayMongo for live payment data. Revenue reports will appear here once payments are processed.</p>
          </div>
        )}

        {adminTab==="reports" && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))", gap:16 }}>
            {[["📊 Enrollment Report","Total applicants, approved, pending"],
              ["💰 Revenue Report","Monthly revenue by program"],
              ["📈 Student Performance","Quiz scores, exam pass rates"],
              ["🏫 Course Popularity","Most enrolled programs"]].map(([t,d]) => (
              <div key={t} style={S.card}>
                <h4 style={{ fontWeight:800, fontSize:15, color:textMain, marginBottom:8 }}>{t}</h4>
                <p style={{ color:textSub, fontSize:13, marginBottom:16 }}>{d}</p>
                <button style={S.btn(true)}>Generate →</button>
              </div>
            ))}
          </div>
        )}

        {/* ── ANNOUNCEMENTS MANAGEMENT ──────────────────────────────────────── */}
        {adminTab==="announcements" && <AnnouncementsPanel S={S} textMain={textMain} textSub={textSub} border={border} bg1={bg1} DM={DM} toast$={showToast}/>}
      </div>
    );
  };


  // ════════════════════════════════════════════════════════════════════════════
  // PROGRAMS + CONTACT
  // ════════════════════════════════════════════════════════════════════════════
  const ProgramsPage = () => (
    <div style={{ maxWidth:1100, margin:"0 auto", padding:"48px 20px" }}>
      <h2 style={S.sectionTitle}>All Programs</h2>
      {PROGRAMS.map(p => (
        <div key={p.id} style={{ ...S.card, marginBottom:24, borderLeft:`6px solid ${p.color}` }}>
          <div style={{ display:"flex", justifyContent:"space-between",
            alignItems:"flex-start", flexWrap:"wrap", gap:12 }}>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, fontWeight:700, color:p.color,
                textTransform:"uppercase", letterSpacing:".1em", marginBottom:4 }}>{p.category}</div>
              <h3 style={{ fontSize:20, fontWeight:800, marginBottom:8, color:textMain }}>{p.title}</h3>
              <p style={{ fontSize:14, color:textSub, lineHeight:1.7, maxWidth:600 }}>{p.desc}</p>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:12 }}>
                {p.modes.map(m => <span key={m} style={{ background:"#E8F5E9", color:"#2E7D32",
                  borderRadius:6, padding:"3px 10px", fontSize:11, fontWeight:600 }}>{m}</span>)}
              </div>
            </div>
            <div style={{ textAlign:"right", minWidth:160 }}>
              <div style={{ fontSize:28, fontWeight:900, color:p.color }}>{p.fee}</div>
              <div style={{ fontSize:13, color:textSub }}>⏱ {p.duration}</div>
              <div style={{ fontSize:13, color:textSub, marginBottom:16 }}>📅 {p.schedule}</div>
              <button style={{ ...S.btn(true), background:p.color }} onClick={() => nav("enroll")}>Enroll</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const ContactPage = () => (
    <div style={{ maxWidth:900, margin:"0 auto", padding:"48px 20px" }}>
      <h2 style={S.sectionTitle}>Contact Us</h2>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:28 }}>
        <div style={S.card}>
          {contactSent ? (
            <div style={{ textAlign:"center", padding:32 }}>
              <div style={{ fontSize:48, marginBottom:12 }}>✅</div>
              <h3 style={{ fontWeight:800, color:"#2E7D32" }}>Message Sent!</h3>
              <p style={{ color:textSub }}>We'll reply within 24 hours.</p>
            </div>
          ) : (
            <div>
              <h3 style={{ fontWeight:800, fontSize:18, marginBottom:20, color:textMain }}>Send a Message</h3>
              {[["Name","text"],["Email","email"],["Subject","text"]].map(([l,t]) => (
                <div key={l} style={{ marginBottom:16 }}>
                  <label style={S.label}>{l}</label>
                  <input style={S.input} type={t} placeholder={l}/>
                </div>
              ))}
              <div style={{ marginBottom:20 }}>
                <label style={S.label}>Message</label>
                <textarea style={{ ...S.input, minHeight:100, resize:"vertical" }} placeholder="Your message…"/>
              </div>
              <button style={{ ...S.btn(true), width:"100%", textAlign:"center" }}
                onClick={() => setContactSent(true)}>Send Message</button>
            </div>
          )}
        </div>
        <div>
          <div style={{ ...S.card, marginBottom:20 }}>
            <h3 style={{ fontWeight:800, fontSize:18, marginBottom:16, color:textMain }}>Get in Touch</h3>
            {[["📍","Address","Manila, Metro Manila, Philippines"],
              ["📞","Phone","+63 917 123 4567"],
              ["✉️","Email","info@plannova.ph"],
              ["📘","Facebook","fb.com/plannovaai"]].map(([ic,l,v]) => (
              <div key={l} style={{ display:"flex", gap:12, marginBottom:14 }}>
                <span style={{ fontSize:20 }}>{ic}</span>
                <div>
                  <div style={{ fontSize:11, fontWeight:700, color:textSub, textTransform:"uppercase" }}>{l}</div>
                  <div style={{ fontSize:14, color:textMain }}>{v}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ ...S.card, background:"linear-gradient(135deg,#2E7D32,#4CAF50)", color:"#fff" }}>
            <h3 style={{ fontWeight:800, fontSize:18, marginBottom:8 }}>Office Hours</h3>
            <p style={{ fontSize:14, opacity:.9 }}>Mon–Fri: 8:00 AM – 5:00 PM</p>
            <p style={{ fontSize:14, opacity:.9 }}>Saturday: 8:00 AM – 12:00 PM</p>
          </div>
        </div>
      </div>
    </div>
  );

  // ── RENDER ─────────────────────────────────────────────────────────────────
  const pages = {
    home: <HomePage/>, programs: <ProgramsPage/>, enroll: <EnrollPage/>,
    "student-portal": <PortalPage/>, "ai-tools": <AIToolsPage/>,
    admin: <AdminPage/>, contact: <ContactPage/>,
  };

  return (
    <AuthCtx.Provider value={{ session, setSession }}>
      <div style={S.page}>
        <Navbar/>
        {pages[page] || <HomePage/>}
        <Footer/>

        {/* Auth modal */}
        {showAuth && (
          <AuthModal
            S={S} border={border} textMain={textMain} textSub={textSub} bg1={bg1}
            onClose={() => { setShowAuth(false); setAuthRedirect(null); }}
            onSuccess={(result) => {
              setSession(result);
              setShowAuth(false);
              if (authRedirect) { setPage(authRedirect); setAuthRedirect(null); }
              showToast("Signed in successfully!");
            }}
          />
        )}

        {/* Toast */}
        {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)}/>}
      </div>
    </AuthCtx.Provider>
  );
}
