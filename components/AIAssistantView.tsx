import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2, Sparkles, AlertCircle, User, Copy, Check, Plus, Trash2, MessageCircle, Zap, ShieldQuestion } from 'lucide-react';
import { Patient, ClinicalRecord, Appointment, Doctor, TreatmentType, User as UserType, Medicine } from '../types';
import { api } from '../services/api';

// Custom CSS for animations
const customStyles = `
  @keyframes fade-in-up {
    0% {
      opacity: 0;
      transform: translateY(20px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
  
  .animate-fade-in-up {
    animation: fade-in-up 0.3s ease-out forwards;
  }
  
  .animate-shake {
    animation: shake 0.5s ease-in-out;
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = customStyles;
  document.head.appendChild(styleSheet);
}

// ============================================================
// IMPORTANT: REPLACE MOCK API KEY WITH YOUR REAL API KEY FROM APIFREE.AI
// ============================================================
// This is a MOCK API key for demonstration purposes.
// To use the real AI Assistant:
// 1. Get your API key from: https://apifree.ai
// 2. Add it to your .env file as: AI_API_KEY=your_actual_api_key_here
// 3. The vite.config.ts is already configured to read it as process.env.AI_API_KEY
// ============================================================
const MOCK_API_KEY = 'REPLACE_WITH_YOUR_AI_API_KEY';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

interface AIAssistantViewProps {
  patients: Patient[];
  treatmentRecords: ClinicalRecord[];
  appointments: Appointment[];
  doctors: Doctor[];
  treatmentTypes: TreatmentType[];
  users: UserType[];
  medicines: Medicine[];
}

const AIAssistantView: React.FC<AIAssistantViewProps> = ({ 
  patients, 
  treatmentRecords,
  appointments,
  doctors,
  treatmentTypes,
  users,
  medicines
}) => {
  const DAILY_LIMIT = 4;

  const getDefaultMessages = (): Message[] => [{
    id: '1',
    role: 'assistant',
    content: `👋 Hello! I'm Loli, your AI Clinical Assistant. I can help you with:

• Patient case analysis
• Treatment recommendations
• Dental diagnosis suggestions
• Clinical documentation
• Medical history interpretation

How can I assist you today?

💡 *Note: You have ${DAILY_LIMIT} free requests per day.*`,
    timestamp: new Date()
  }];

  // Daily usage limit tracking
  const [dailyUsageCount, setDailyUsageCount] = useState<number>(() => {
    const today = new Date().toDateString();
    const savedData = localStorage.getItem('loli_usage');
    if (savedData) {
      const { date, count } = JSON.parse(savedData);
      if (date === today) {
        return count;
      }
    }
    return 0;
  });
  
  // Chat session state
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => {
    const saved = localStorage.getItem('loli_chat_sessions');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Convert timestamp strings back to Date objects
      return parsed.map((session: any) => ({
        ...session,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt),
        messages: session.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }))
      }));
    }
    return [];
  });
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => {
    const saved = localStorage.getItem('loli_current_session');
    return saved || '';
  });
  const [messages, setMessages] = useState<Message[]>(() => {
    if (currentSessionId) {
      const session = chatSessions.find(s => s.id === currentSessionId);
      if (session) {
        // Ensure timestamps are Date objects
        return session.messages.map(msg => ({
          ...msg,
          timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)
        }));
      }
    }
    return getDefaultMessages();
  });
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'ask' | 'agent'>('ask');
  const [apiStatus, setApiStatus] = useState<'ready' | 'mock' | 'error'>('mock');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Add subtle typing indicator effect
  const [isTyping, setIsTyping] = useState(false);
  
  useEffect(() => {
    if (isLoading) {
      setIsTyping(true);
      const timer = setTimeout(() => setIsTyping(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Cleanup old chat sessions on mount and at regular intervals
  useEffect(() => {
    // Run cleanup immediately on mount
    cleanupOldSessions();
    
    // Set up periodic cleanup (every 24 hours)
    const cleanupInterval = setInterval(() => {
      cleanupOldSessions();
    }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
    
    return () => clearInterval(cleanupInterval);
  }, [chatSessions]);

  // Check if real API key is configured
  useEffect(() => {
    const apiKey = process.env.AI_API_KEY || MOCK_API_KEY;
    if (apiKey === MOCK_API_KEY || apiKey === 'REPLACE_WITH_YOUR_AI_API_KEY') {
      setApiStatus('mock');
    } else {
      setApiStatus('ready');
    }
  }, []);

  const copyToClipboard = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const createNewSession = () => {
    const sessionId = Date.now().toString();
    const newSession: ChatSession = {
      id: sessionId,
      title: 'New Conversation',
      messages: getDefaultMessages(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const updated = [newSession, ...chatSessions];
    setChatSessions(updated);
    setCurrentSessionId(sessionId);
    setMessages(newSession.messages);
    localStorage.setItem('loli_chat_sessions', JSON.stringify(updated));
    localStorage.setItem('loli_current_session', sessionId);
  };

  const switchSession = (sessionId: string) => {
    const session = chatSessions.find(s => s.id === sessionId);
    if (session) {
      setCurrentSessionId(sessionId);
      // Ensure timestamps are Date objects when switching sessions
      const messagesWithDates = session.messages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp)
      }));
      setMessages(messagesWithDates);
      localStorage.setItem('loli_current_session', sessionId);
    }
  };

  const deleteSession = (sessionId: string) => {
    const updated = chatSessions.filter(s => s.id !== sessionId);
    setChatSessions(updated);
    if (currentSessionId === sessionId) {
      if (updated.length > 0) {
        switchSession(updated[0].id);
      } else {
        setCurrentSessionId('');
        setMessages(getDefaultMessages());
        localStorage.removeItem('loli_current_session');
      }
    }
    localStorage.setItem('loli_chat_sessions', JSON.stringify(updated));
  };

  const saveSession = (newMessages: Message[]) => {
    // If there's no current session, create one
    if (!currentSessionId) {
      const sessionId = Date.now().toString();
      const newSession: ChatSession = {
        id: sessionId,
        title: newMessages.find(m => m.role === 'user')?.content.substring(0, 30) + '...' || 'New Conversation',
        messages: newMessages,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const updated = [newSession, ...chatSessions];
      setChatSessions(updated);
      setCurrentSessionId(sessionId);
      setMessages(newMessages);
      localStorage.setItem('loli_chat_sessions', JSON.stringify(updated));
      localStorage.setItem('loli_current_session', sessionId);
      return;
    }
    
    const updated = chatSessions.map(s => {
      if (s.id === currentSessionId) {
        const userMsg = newMessages.find(m => m.role === 'user');
        const title = userMsg?.content.substring(0, 30) + '...' || s.title;
        return { ...s, messages: newMessages, title, updatedAt: new Date() };
      }
      return s;
    });
    setChatSessions(updated);
    localStorage.setItem('loli_chat_sessions', JSON.stringify(updated));
  };

  const cleanupOldSessions = () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    const filtered = chatSessions.filter(session => {
      const sessionDate = session.createdAt instanceof Date ? session.createdAt : new Date(session.createdAt);
      return sessionDate > threeDaysAgo;
    });
    
    // Only update if something was deleted
    if (filtered.length < chatSessions.length) {
      setChatSessions(filtered);
      localStorage.setItem('loli_chat_sessions', JSON.stringify(filtered));
      
      // If current session was deleted, switch to first available
      if (!filtered.find(s => s.id === currentSessionId)) {
        if (filtered.length > 0) {
          switchSession(filtered[0].id);
        } else {
          setCurrentSessionId('');
          setMessages(getDefaultMessages());
          localStorage.removeItem('loli_current_session');
        }
      }
    }
  };

  const getContextualData = (isActionQuery: boolean = false) => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Basic stats always included
    const baseData = {
      td: today,
      s: {
        p: patients.length,
        a: appointments.length,
        d: doctors.length,
        t: treatmentTypes.length,
        m: medicines.length
      }
    };

    if (!isActionQuery && mode === 'ask') {
      // Highly optimized/compressed data for minimal token usage
      return {
        ...baseData,
        dr: doctors.map(d => ({ i: d.id, n: d.name, s: d.specialization })), 
        ta: appointments.filter(a => a.status === 'Scheduled' && a.date === today).map(a => ({ p: a.patient_name, d: a.doctor_name, t: a.time })),
        ua: appointments.filter(a => a.status === 'Scheduled' && a.date >= today).slice(0, 5).map(a => ({ p: a.patient_name, d: a.doctor_name, dt: a.date, t: a.time })),
        tr: treatmentRecords.slice(0, 5).map(r => ({ p: r.patient_name, d: r.description, dt: r.date })),
        ls: medicines.filter(m => m.stock <= (m.min_stock || 0)).map(m => ({ n: m.name, q: m.stock })),
        inv: {
          total_items: medicines.length,
          total_stock: medicines.reduce((sum, med) => sum + (med.stock || 0), 0),
          low_stock_count: medicines.filter(m => m.stock <= (m.min_stock || 0)).length
        }
      };
    }

    // Extended context for Agent Mode or Action queries
    return {
      ...baseData,
      patients: patients.slice(0, 15).map(p => ({ i: p.id, n: p.name, ph: p.phone, b: p.balance })),
      doctors: doctors.map(d => ({ i: d.id, n: d.name, s: d.specialization, sch: d.schedules })),
      appointments: appointments.filter(a => a.date >= today).slice(0, 15).map(a => ({ i: a.id, p: a.patient_name, pi: a.patient_id, d: a.doctor_name, di: a.doctor_id, dt: a.date, t: a.time, s: a.status })),
      medicines: medicines.slice(0, 15).map(m => ({ i: m.id, n: m.name, s: m.stock, ms: m.min_stock, p: m.price })),
      loc: users[0]?.location_id || 'main' // Use first user's location as default
    };
  };

  // Helper function to validate JSON
  const isValidJson = (str: string): boolean => {
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  };

  const API_DOCS = `
ACTIONS (Available in all modes):
- apt_c(p_id, dr_id, dt, t, ty, n): Create appointment. p_id=patient id, dr_id=doctor id, dt=date(YYYY-MM-DD), t=time(HH:mm), ty=type, n=notes.
- apt_u(id, data): Update appointment. data can include {date, time, status, doctor_id, etc}.
- apt_d(id): Delete appointment.
- p_c(n, e, ph, m): Create patient. n=name, e=email, ph=phone, m=medicalHistory.
- p_u(id, data): Update patient. data: {name, email, phone, medicalHistory, etc}.
- dr_c(n, e, ph, s, sch): Create doctor. n=name, e=email, ph=phone, s=specialization, sch=schedules.
- dr_u(id, data): Update doctor.
- dr_d(id): Delete doctor.
- m_c(n, d, u, p, s, ms, c): Create medicine. n=name, d=description, u=unit, p=price, s=stock, ms=min_stock, c=category.
- m_u(id, data): Update medicine.

To perform an action, include a JSON block at the END of your message:
{ "action": "ACTION_NAME", "params": { ... } }

Examples:
{ "action": "p_c", "params": { "n": "John Doe", "e": "john@example.com", "ph": "1234567890", "m": "No known allergies" } }
{ "action": "apt_c", "params": { "p_id": "patient123", "dr_id": "doctor456", "dt": "2024-01-15", "t": "10:00", "ty": "Checkup", "n": "Routine checkup" } }

Only perform actions if explicitly requested or clearly intended. Ensure JSON is properly formatted with correct syntax.
`

  const callAICompletionAPI = async (userMessage: string): Promise<string> => {
    const apiKey = process.env.AI_API_KEY || MOCK_API_KEY;
    
    // Check if message implies an action
    const actionKeywords = ['create', 'book', 'schedule', 'add', 'delete', 'remove', 'update', 'modify', 'change', 'edit', 'new', 'make'];
    const isActionIntent = actionKeywords.some(kw => userMessage.toLowerCase().includes(kw));
    const isAgentMode = mode === 'agent';
    
    // Check for identity questions first (works in both mock and real mode)
    const lowerMessage = userMessage.toLowerCase();
    if (lowerMessage.includes('who are you') || lowerMessage.includes('who is she') || 
        lowerMessage.includes('who r u') || lowerMessage.includes('what is your name') ||
        lowerMessage.includes('whats your name') || lowerMessage.includes("what's your name")) {
      return `🤖 **About Me - Loli**

I'm **Loli**, an AI model trained by **WinterArc Myanmar**, specially designed by **Min Thuta Saw Naing** (AI Engineer & DevOps) for Dental Clinic Usages.

**My Purpose:**
• Assist dental professionals with clinical decisions
• Provide evidence-based treatment recommendations
• Support patient care with dental knowledge
• Help with documentation and clinical protocols
${isAgentMode ? '• **Manage clinic data through direct API actions**' : ''}

**Created by:**
👨‍💻 Min Thuta Saw Naing
🏢 WinterArc Myanmar
🎯 Specialized for Dental Healthcare

*I'm here to support your dental practice with AI-powered assistance!* 🦷✨`;
    }
    
    // If using mock API key, return simulated response
    if (apiKey === MOCK_API_KEY || apiKey === 'REPLACE_WITH_YOUR_AI_API_KEY') {
      return simulateMockResponse(userMessage);
    }

    // Real API call to apifree.ai
    try {
      const contextData = getContextualData(isActionIntent || isAgentMode);
      const systemPrompt = `You are Loli, a dental AI assistant by WinterArc Myanmar, designed by Min Thuta Saw Naing.
Today: ${contextData.td}
Current Mode: ${isAgentMode ? 'AGENT (Actions enabled)' : 'ASK (Read-only)'}
Practice Data: ${JSON.stringify(contextData)}
${isAgentMode ? API_DOCS : 'You are in ASK mode. CRUD operations (creating, updating, deleting data) are only allowed in Agent Mode. If the user wants to perform such actions, ask them to switch to Agent Mode first.'}
Verification by pros required. Identity: Loli by WinterArc Myanmar.`;

      const response = await fetch(
        `https://api.apifree.ai/v1/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user",
                content: userMessage
              }
            ],
            temperature: 0.7,
            max_tokens: 2048,
            top_p: 1,
            stream: false
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content;
      
      if (!aiResponse) {
        throw new Error('No response from AI service');
      }

      return aiResponse;
    } catch (error: any) {
      console.error('AI API Error:', error);
      setApiStatus('error');
      return `❌ Error connecting to AI service: ${error.message || 'Unknown error'}. Please check your API key configuration and try again.`;
    }
  };

  const simulateMockResponse = (userMessage: string): Promise<string> => {
    // Simulate API delay
    return new Promise((resolve) => {
      setTimeout(() => {
        const lowerMessage = userMessage.toLowerCase();
        
        // Smart contextual responses based on keywords
        if (lowerMessage.includes('root canal') || lowerMessage.includes('endodontic')) {
          resolve(`📋 **Root Canal Treatment Guidelines:**

**Pre-treatment Assessment:**
- Take periapical radiograph to assess root anatomy
- Check pulp vitality tests (cold, heat, EPT)
- Evaluate periodontal status

**Treatment Protocol:**
1. Local anesthesia with 2% lidocaine + 1:100,000 epinephrine
2. Rubber dam isolation (essential for asepsis)
3. Access cavity preparation
4. Working length determination (apex locator + radiograph)
5. Cleaning & shaping with rotary NiTi files
6. Irrigation: NaOCl 2.5% + EDTA 17%
7. Obturation with gutta-percha (warm vertical condensation)

**Post-op Care:**
- Prescribe: Amoxicillin 500mg (if indicated) + Ibuprofen 400mg
- Schedule follow-up in 3-6 months
- Crown restoration recommended within 30 days

💡 *Note: This is general guidance. Actual treatment may vary based on individual case complexity.*`);
        } else if (lowerMessage.includes('cavity') || lowerMessage.includes('caries') || lowerMessage.includes('filling')) {
          resolve(`🦷 **Dental Caries Management:**

**Classification:**
- Class I: Occlusal surfaces
- Class II: Proximal surfaces of posterior teeth
- Class III: Proximal surfaces of anterior teeth (no incisal edge)
- Class IV: Proximal surfaces of anterior teeth (including incisal edge)
- Class V: Cervical third of facial/lingual surfaces

**Treatment Approach:**
1. **Small cavities (<3mm):** Composite resin restoration
2. **Medium cavities (3-5mm):** Composite with proper layering
3. **Large cavities (>5mm):** Consider indirect restoration (inlay/onlay)

**Material Selection:**
- **Anterior:** Nano-hybrid composite (better aesthetics)
- **Posterior:** Packable composite or amalgam (stress-bearing areas)

**Clinical Steps:**
1. Caries removal (chemomechanical if conservative)
2. Cavity preparation & beveling (anterior)
3. Acid etching (15-30 seconds)
4. Bonding agent application
5. Composite layering (2mm increments)
6. Light curing (20 seconds per layer)
7. Finishing & polishing

⚠️ *Remember: This information should supplement, not replace, your clinical judgment.*`);
        } else if (lowerMessage.includes('extraction') || lowerMessage.includes('remove') || lowerMessage.includes('pull')) {
          resolve(`🔧 **Tooth Extraction Protocol:**

**Pre-operative Assessment:**
- Medical history review (bleeding disorders, medications)
- Radiographic evaluation (root morphology, bone density)
- Informed consent

**Indications:**
- Severe decay beyond repair
- Advanced periodontal disease
- Orthodontic reasons
- Impacted/problematic wisdom teeth
- Fractured tooth (unfavorable)

**Anesthesia:**
- Infiltration or nerve block
- Wait 5-10 minutes for onset
- Confirm adequate anesthesia

**Extraction Steps:**
1. Tissue detachment (periosteal elevator)
2. Luxation (straight elevator)
3. Extraction (forceps with controlled pressure)
4. Socket inspection & debridement
5. Socket compression
6. Gauze bite for hemostasis (30 min)

**Post-op Instructions:**
- No rinsing for 24 hours
- Soft diet for 2-3 days
- Pain management: Ibuprofen 400mg + Paracetamol 500mg
- Antibiotics if indicated (infection present)
- Follow-up in 1 week

🩺 *Always assess patient-specific risk factors before proceeding.*`);
        } else if (lowerMessage.includes('pain') || lowerMessage.includes('hurt') || lowerMessage.includes('ache')) {
          resolve(`💊 **Dental Pain Management:**

**Differential Diagnosis:**
1. **Reversible Pulpitis:** Sharp, transient pain to stimuli
2. **Irreversible Pulpitis:** Lingering pain, spontaneous
3. **Periapical Abscess:** Constant, throbbing pain, swelling
4. **Periodontal Pain:** Pain on biting, lateral pressure
5. **TMJ Disorder:** Jaw pain, clicking, limited opening

**Immediate Relief:**
- Cold compress (15 min on/off) for acute inflammation
- Warm compress for chronic/abscess
- Elevation of head during sleep

**Pharmacological Management:**
- **Mild-Moderate Pain:**
  - Ibuprofen 400mg q6h (with food)
  - Or Paracetamol 1000mg q6h
  
- **Severe Pain:**
  - Ibuprofen 400mg + Paracetamol 500mg q6h (alternating)
  - If inadequate: Consider tramadol 50mg (short-term)

- **Infection Present:**
  - Amoxicillin 500mg TDS for 5-7 days
  - Or Metronidazole 400mg TDS (anaerobic coverage)

**When to Refer:**
- Facial space infection (swelling beyond dentoalveolar)
- Trismus (limited opening <20mm)
- Systemic signs (fever >38.5°C, malaise)

🚨 *Pain management should be combined with addressing the underlying cause.*`);
        } else if (lowerMessage.includes('crown') || lowerMessage.includes('cap')) {
          resolve(`👑 **Crown Preparation Guidelines:**

**Indications:**
- Post-endodontic treatment
- Large restorations (>50% tooth structure)
- Fractured cusps
- Aesthetic enhancement
- Bridge abutment

**Crown Types:**
1. **All-Ceramic (Zirconia/E.max):** Best aesthetics, anterior/posterior
2. **Porcelain-Fused-to-Metal (PFM):** Good strength, moderate aesthetics
3. **Metal (Gold alloy):** Maximum strength, posterior only
4. **Temporary:** Acrylic/bis-acryl (immediate protection)

**Preparation Protocol:**
1. **Reduction Requirements:**
   - Occlusal: 1.5-2mm
   - Axial: 1-1.5mm
   - Finish line: 1mm chamfer/shoulder
   
2. **Key Features:**
   - 6-degree taper (convergence angle)
   - Rounded line angles
   - Smooth preparation surface
   
3. **Impression:**
   - Single-phase or dual-phase technique
   - Digital scan (if available)
   - Opposing arch & bite registration

4. **Temporization:**
   - Bis-acryl temporary crown
   - Temporary cement (zinc oxide eugenol)
   - Occlusion adjustment

**Lab Communication:**
- Shade selection (natural lighting)
- Material specification
- Special instructions

⏱️ *Typical turnaround: 7-14 days for permanent crown.*`);
        } else if (lowerMessage.includes('child') || lowerMessage.includes('pediatric') || lowerMessage.includes('kid')) {
          resolve(`👶 **Pediatric Dental Care:**

**Age-Specific Considerations:**

**0-2 Years:**
- First dental visit by age 1
- Diet counseling (avoid bottle at night)
- Fluoride varnish application (2-4x/year)

**3-6 Years (Primary Dentition):**
- Preventive care focus
- Pit & fissure sealants
- Habit counseling (thumb sucking)
- Behavior management techniques

**6-12 Years (Mixed Dentition):**
- Monitor eruption sequence
- Space maintainers if early loss
- Orthodontic screening
- Sports mouthguard if active

**Behavior Management:**
1. **Tell-Show-Do:** Explain, demonstrate, perform
2. **Positive Reinforcement:** Praise good behavior
3. **Distraction:** Toys, videos, music
4. **Nitrous Oxide:** For anxious children (if needed)

**Common Treatments:**
- **Pulpotomy:** Vital pulp therapy for carious exposure
- **Stainless Steel Crowns:** Extensive decay in primary molars
- **Fluoride Treatments:** Strengthen enamel
- **Topical Anesthesia:** Gel before injection (reduce fear)

**Parental Guidance:**
- Brush 2x daily with fluoride toothpaste (pea-sized)
- Limit sugary snacks/drinks
- Regular dental check-ups (6 months)

🧸 *Creating positive early experiences prevents dental anxiety in adulthood.*`);
        } else if (lowerMessage.includes('implant')) {
          resolve(`🔩 **Dental Implant Overview:**

**Treatment Planning:**
- CBCT scan for bone assessment
- Adequate bone height (≥10mm) & width (≥6mm)
- Good oral hygiene & no active periodontal disease
- Medical clearance (diabetes control, no bisphosphonates)

**Surgical Protocol:**
1. **Stage 1: Implant Placement**
   - Flap elevation
   - Sequential drilling (pilot → final diameter)
   - Implant insertion (30-35 Ncm torque)
   - Cover screw placement (submerged)
   - Primary closure

2. **Osseointegration Period:**
   - Mandible: 3 months
   - Maxilla: 4-6 months

3. **Stage 2: Abutment Connection**
   - Healing abutment placement
   - Soft tissue maturation (2-4 weeks)
   - Final abutment & crown fabrication

**Post-op Care:**
- Amoxicillin 500mg TDS (5-7 days)
- Ibuprofen 400mg q6h
- Chlorhexidine rinse 0.12%
- Soft diet for 1 week

**Success Factors:**
- Primary stability (immediate)
- Infection control
- Patient compliance
- Adequate bone-implant contact

📊 *Success rate: >95% for properly selected cases.*`);
        } else if (lowerMessage.includes('patient') && lowerMessage.includes('records')) {
          const contextData: any = getContextualData();
          resolve(`📊 **Practice Overview:**

**Current Statistics:**
- Total Active Patients: ${contextData.s.p}
- Recent Treatments: ${contextData.s.a}

**Recent Activity:**
${contextData.tr ? contextData.tr.map((r: any) => 
  `• ${r.p}: ${r.d} (${new Date(r.dt).toLocaleDateString()})`
).join('\n') : 'No recent activity data available.'}

💡 *This is real data from your practice. What specific aspect would you like to discuss?*`);
        } else if (lowerMessage.includes('inventory') || lowerMessage.includes('stock') || lowerMessage.includes('item') || lowerMessage.includes('medicine') || lowerMessage.includes('medication')) {
          const contextData: any = getContextualData();
          resolve(`📦 **Inventory Overview:**

**Current Stock Summary:**
- Total Items: ${contextData.inv?.total_items || 0}
- Total Stock Count: ${contextData.inv?.total_stock || 0}
- Low Stock Items: ${contextData.inv?.low_stock_count || 0}

**Top 5 Items by Quantity:**
${contextData.inv?.top_items ? contextData.inv.top_items.map((item: any) => 
  `• ${item.n}: ${item.q} units${item.c ? ` (${item.c})` : ''}`
).join('\n') : 'No inventory breakdown available.'}

💡 *This is real-time inventory data from your clinic. What specific inventory information do you need?*`);
        } else {
          resolve(`🤖 **I'm here to help with clinical dental assistance!**

I can provide guidance on:

🦷 **Treatment Protocols:**
- Root canals
- Fillings & restorations
- Extractions
- Crown preparations

💊 **Pain Management:**
- Medication recommendations
- Emergency care
- Post-operative protocols

👶 **Pediatric Dentistry:**
- Age-specific treatments
- Behavior management

🔧 **Advanced Procedures:**
- Implants
- Orthodontics
- Periodontal therapy

📊 **Practice Management:**
- Patient records analysis
- Treatment planning

**Example questions you can ask:**
- "What's the protocol for a root canal treatment?"
- "How should I manage acute dental pain?"
- "Guidelines for pediatric cavity treatment?"
- "Crown preparation steps?"

*Note: Currently using simulated responses. Connect your Gemini API key for AI-powered answers!*`);
        }
      }, 1500); // Simulate network delay
    });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    // Check daily usage limit
    if (dailyUsageCount >= DAILY_LIMIT) {
      const limitMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `⚠️ **Daily Limit Reached**

You've used all ${DAILY_LIMIT} free requests for today. Your limit will reset tomorrow at midnight.

**Current Usage:** ${dailyUsageCount}/${DAILY_LIMIT}

Thank you for using Loli! 🦷✨`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, limitMessage]);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      const aiResponse = await callAICompletionAPI(userMessage.content);
          
      // Parse for action JSON block with improved validation
      let actionResult = '';
      // More precise regex to capture complete JSON objects with "action" property
      let actionMatch = aiResponse.match(/\{[^{}]*"action"\s*:\s*"[^"]*"[^{}]*\}/);
          
      if (!actionMatch) {
        // Fallback: manual parsing to find JSON objects containing "action"
        let manualMatch = null;
        const openBraces = [];
        for (let i = 0; i < aiResponse.length; i++) {
          if (aiResponse[i] === '{') {
            openBraces.push(i);
          } else if (aiResponse[i] === '}' && openBraces.length > 0) {
            const start = openBraces.pop();
            const potentialJson = aiResponse.substring(start, i + 1);
            if (potentialJson.includes('"action"')) {
              manualMatch = [potentialJson];
              break;
            }
          }
        }
            
        if (manualMatch) {
          actionMatch = manualMatch;
        }
      }
          
      if (actionMatch) {
        try {
          // Validate JSON structure before parsing
          const jsonString = actionMatch[0].trim();
          // Ensure proper JSON formatting
          const sanitizedJson = jsonString
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/\s*([{}:,])\s*/g, '$1') // Remove extra spaces around JSON syntax
            .replace(/,\s*\}/g, '}') // Remove trailing commas
            .replace(/,\s*\]/g, ']'); // Remove trailing commas in arrays
              
          // Validate the sanitized JSON
          if (!isValidJson(sanitizedJson)) {
            throw new SyntaxError(`Invalid JSON format after sanitization: ${sanitizedJson}`);
          }
              
          const actionObj = JSON.parse(sanitizedJson);
          const { action, params } = actionObj;
              
          // Check if action is a CRUD operation that requires Agent Mode
          const crudActions = ['apt_c', 'apt_u', 'apt_d', 'p_c', 'p_u', 'dr_c', 'dr_u', 'dr_d', 'm_c', 'm_u'];
          if (crudActions.includes(action) && mode !== 'agent') {
            actionResult = `⚠️ Agent Mode Required

This action requires Agent Mode to be enabled. Please switch to Agent Mode using the toggle button and try again.

Agent Mode is needed for:
• Creating/Updating/Deleting patients
• Booking/Updating/Deleting appointments
• Creating/Updating/Deleting doctors
• Creating/Updating medicines

Ask Mode is for: Information queries, treatment suggestions, and general assistance.`;
          } else {
            let result: any;
            const locationId = users[0]?.location_id || 'main';
                
            switch (action) {
            case 'apt_c':
              try {
                result = await api.appointments.create({ 
                  location_id: locationId,
                  patient_id: params.p_id,
                  doctor_id: params.dr_id,
                  date: params.dt,
                  time: params.t,
                  type: params.ty,
                  notes: params.n,
                  status: 'Scheduled'
                });
                actionResult = `✅ Appointment created successfully for ${result.patient_name} with Dr. ${result.doctor_name} at ${result.time}.`;
              } catch (err: any) {
                console.error('Appointment creation error:', err);
                throw new Error(`Failed to create appointment: ${err.message}`);
              }
              break;
            case 'apt_u':
              try {
                result = await api.appointments.update(params.id, params.data);
                actionResult = `✅ Appointment updated successfully.`;
              } catch (err: any) {
                console.error('Appointment update error:', err);
                throw new Error(`Failed to update appointment: ${err.message}`);
              }
              break;
            case 'apt_d':
              try {
                await api.appointments.delete(params.id);
                actionResult = `✅ Appointment deleted successfully.`;
              } catch (err: any) {
                console.error('Appointment deletion error:', err);
                throw new Error(`Failed to delete appointment: ${err.message}`);
              }
              break;
            case 'p_c':
              try {
                result = await api.patients.create({ 
                  location_id: locationId,
                  name: params.n,
                  email: params.e,
                  phone: params.ph,
                  medicalHistory: params.m
                });
                actionResult = `✅ Patient ${result.name} added successfully.`;
              } catch (err: any) {
                console.error('Patient creation error:', err);
                throw new Error(`Failed to create patient: ${err.message}`);
              }
              break;
            case 'p_u':
              try {
                result = await api.patients.update(params.id, params.data);
                actionResult = `✅ Patient information updated.`;
              } catch (err: any) {
                console.error('Patient update error:', err);
                throw new Error(`Failed to update patient: ${err.message}`);
              }
              break;
            case 'dr_c':
              try {
                result = await api.doctors.create({ 
                  location_id: locationId,
                  name: params.n,
                  email: params.e,
                  phone: params.ph,
                  specialization: params.s,
                  schedules: params.sch
                });
                actionResult = `✅ Dr. ${result.name} added to the system.`;
              } catch (err: any) {
                console.error('Doctor creation error:', err);
                throw new Error(`Failed to create doctor: ${err.message}`);
              }
              break;
            case 'dr_u':
              try {
                result = await api.doctors.update(params.id, params.data);
                actionResult = `✅ Doctor information updated.`;
              } catch (err: any) {
                console.error('Doctor update error:', err);
                throw new Error(`Failed to update doctor: ${err.message}`);
              }
              break;
            case 'dr_d':
              try {
                await api.doctors.delete(params.id);
                actionResult = `✅ Doctor removed from system.`;
              } catch (err: any) {
                console.error('Doctor deletion error:', err);
                throw new Error(`Failed to delete doctor: ${err.message}`);
              }
              break;
            case 'm_c':
              try {
                result = await api.medicines.create({ 
                  location_id: locationId,
                  name: params.n,
                  description: params.d,
                  unit: params.u,
                  price: params.p,
                  stock: params.s,
                  min_stock: params.ms,
                  category: params.c
                });
                actionResult = `✅ Medicine ${result.name} added to inventory.`;
              } catch (err: any) {
                console.error('Medicine creation error:', err);
                throw new Error(`Failed to create medicine: ${err.message}`);
              }
              break;
            case 'm_u':
              try {
                result = await api.medicines.update(params.id, params.data);
                actionResult = `✅ Inventory updated for ${result.name}.`;
              } catch (err: any) {
                console.error('Medicine update error:', err);
                throw new Error(`Failed to update medicine: ${err.message}`);
              }
              break;
            default:
              actionResult = `⚠️ Unknown action: ${action}`;
            }
          }
        } catch (err: any) {
          console.error('Action Execution Error:', err);
          // Log the problematic JSON for debugging
          if (actionMatch && actionMatch[0]) {
            console.error('Problematic JSON:', actionMatch[0]);
            console.error('Sanitized JSON:', actionMatch[0]
              .replace(/\s+/g, ' ')
              .replace(/\s*([{}:,])\s*/g, '$1')
              .replace(/,\s*\}/g, '}')
              .replace(/,\s*\]/g, ']'));
          }
          // Provide more specific error messages
          if (err instanceof SyntaxError) {
            actionResult = `❌ Failed to parse action JSON. Please check the format: ${err.message}`;
          } else {
            actionResult = `❌ Failed to perform action: ${err.message}`;
          }
        }
      } else {
        // Debug logging when no action match is found
        console.log('No action match found in AI response');
      }
            
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: actionResult ? `${aiResponse.replace(actionMatch ? actionMatch[0] : '', '').trim()}\n\n${actionResult}` : aiResponse,
        timestamp: new Date()
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      saveSession(finalMessages);
      
      // Increment usage count and save to localStorage
      const newCount = dailyUsageCount + 1;
      setDailyUsageCount(newCount);
      const today = new Date().toDateString();
      localStorage.setItem('loli_usage', JSON.stringify({ date: today, count: newCount }));
      
    } catch (error) {
      console.error('Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '❌ Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickPrompts = [
    "Who are you, Loli?",
    "What's the protocol for root canal treatment?",
    "How to manage acute dental pain?",
    "Crown preparation steps explained",
  ];

  // Floating particles effect state
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, size: number}>>([]);
  
  // Generate floating particles for background effect
  useEffect(() => {
    const generateParticles = () => {
      const newParticles = Array.from({ length: 15 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 2
      }));
      setParticles(newParticles);
    };
    
    generateParticles();
    const interval = setInterval(generateParticles, 8000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="relative bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-xl shadow-xl border border-indigo-100 overflow-hidden animate-fade-in">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map(particle => (
          <div
            key={particle.id}
            className="absolute rounded-full bg-gradient-to-r from-indigo-400/20 to-purple-400/20 animate-pulse"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              animationDuration: `${Math.random() * 3 + 2}s`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>
      
      <div className="relative p-6 border-b border-indigo-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="relative p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex-shrink-0 shadow-lg transform hover:scale-105 transition-transform duration-300">
              <img 
                src="./assets/loli-logo.png" 
                alt="Loli AI Assistant Logo" 
                className="w-5 h-5 object-contain"
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-500 opacity-0 hover:opacity-20 transition-opacity duration-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 bg-gradient-to-r from-indigo-700 to-purple-700 bg-clip-text text-transparent">Loli AI Assistant</h2>
              <p className="text-sm text-indigo-600 font-medium">Clinical decision support & dental guidance</p>
            </div>
          </div>
          <p className="text-xs text-indigo-500 mt-1 font-medium">by WinterArc Myanmar | Daily usage: {dailyUsageCount}/{DAILY_LIMIT} requests</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Mode Toggle */}
          <div className="flex bg-indigo-50/50 p-1 rounded-xl border border-indigo-100 shadow-inner backdrop-blur-sm">
            <button
              onClick={() => setMode('ask')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
                mode === 'ask' 
                ? 'bg-white text-indigo-600 shadow-md transform scale-105' 
                : 'text-indigo-400 hover:text-indigo-600 hover:bg-white/50'
              }`}
            >
              <ShieldQuestion className="w-3.5 h-3.5" />
              <span>Ask Mode</span>
            </button>
            <button
              onClick={() => setMode('agent')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${
                mode === 'agent' 
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg transform scale-105' 
                : 'text-indigo-400 hover:text-indigo-600 hover:bg-white/50'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Agent Mode</span>
            </button>
          </div>

          <button
            onClick={createNewSession}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all duration-300 text-sm shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
            title="Start new conversation"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row h-[calc(100vh-200px)] relative">
        {/* Chat History Sidebar - Hidden on mobile, visible on desktop */}
        <aside className="hidden md:flex md:w-64 bg-gradient-to-b from-indigo-50/50 to-purple-50/50 border-r border-indigo-200 flex-col backdrop-blur-sm">
          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto p-3">
            {chatSessions.length === 0 ? (
              <div className="p-4 text-center text-indigo-400 text-sm animate-pulse">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-60" />
                <p>No conversations yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {chatSessions.map(session => (
                  <div
                    key={session.id}
                    className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-300 hover:bg-white/70 shadow-sm hover:shadow-md ${
                      currentSessionId === session.id
                        ? 'bg-gradient-to-r from-indigo-100/80 to-purple-100/80 border-l-4 border-indigo-500 shadow-md'
                        : 'border-l-4 border-transparent hover:border-indigo-300'
                    }`}
                  >
                    <button
                      onClick={() => switchSession(session.id)}
                      className="flex-1 text-left truncate focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-1"
                      title={session.title}
                    >
                      <div className="text-sm font-medium truncate text-indigo-900 group-hover:text-indigo-700">{session.title}</div>
                      <div className="text-xs text-indigo-500">{session.messages.length} messages</div>
                    </button>
                    <button
                      onClick={() => deleteSession(session.id)}
                      className="opacity-0 group-hover:opacity-100 ml-2 p-2 hover:bg-red-100 rounded-lg text-red-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 transform hover:scale-110"
                      title="Delete conversation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col border-l border-indigo-200 md:border-l-0 relative">
          {/* Messages Container */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0 relative">
            <div className="flex-1 overflow-y-auto p-4 md:p-6 relative z-10">
              <div className="max-w-4xl mx-auto space-y-4">
                {/* API Status Banner */}
                {apiStatus === 'mock' && (
                  <div className="p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl shadow-sm animate-pulse">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5 animate-bounce" />
                      <div className="flex-1 text-sm">
                        <h3 className="font-semibold text-yellow-800 mb-1">Mock Mode Active</h3>
                        <p className="text-yellow-700">Connect to <code className="bg-yellow-100 px-1 rounded">apifree.ai</code> for real AI responses</p>
                      </div>
                    </div>
                  </div>
                )}

                {apiStatus === 'error' && (
                  <div className="p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl shadow-sm animate-shake">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 animate-pulse" />
                      <p className="text-sm text-red-700">API connection error. Check your configuration.</p>
                    </div>
                  </div>
                )}

                {/* Chat Messages */}
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div 
                      key={message.id} 
                      className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {message.role === 'assistant' && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform duration-300">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                      )}
                      
                      <div
                        className={`max-w-xs md:max-w-2xl group relative transform transition-all duration-300 hover:scale-[1.02] ${
                          message.role === 'user'
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-lg'
                            : 'bg-white/80 backdrop-blur-sm text-gray-900 rounded-2xl rounded-tl-sm px-4 py-3 shadow-md border border-indigo-100'
                        }`}
                      >
                        <div className="text-sm md:text-base whitespace-pre-wrap leading-relaxed break-words">{message.content}</div>
                        <div className={`flex items-center gap-2 mt-2 pt-2 border-t ${
                          message.role === 'user' ? 'border-indigo-400/50' : 'border-gray-200'
                        }`}>
                          <span className={`text-xs ${
                            message.role === 'user' ? 'text-indigo-200' : 'text-indigo-500'
                          }`}>
                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            onClick={() => copyToClipboard(message.content, message.id)}
                            className={`ml-auto p-1.5 rounded-lg hover:bg-opacity-20 transition-all duration-300 focus:outline-none focus:ring-2 transform hover:scale-110 ${
                              message.role === 'user' ? 'text-indigo-200 hover:bg-indigo-900 focus:ring-indigo-500' : 'text-indigo-500 hover:bg-indigo-100 focus:ring-indigo-400'
                            }`}
                            title="Copy message"
                          >
                            {copiedId === message.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {message.role === 'user' && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform duration-300">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex gap-3 justify-start animate-pulse">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg animate-bounce">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-white/80 backdrop-blur-sm rounded-2xl rounded-tl-sm px-4 py-3 shadow-md border border-indigo-100">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                          <span className="text-sm text-indigo-700 font-medium">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </div>
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-indigo-200 p-4 md:p-6 bg-white/80 backdrop-blur-sm relative z-10">
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-3 flex-col md:flex-row">
                <textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask Loli anything about patient care, treatments, or dental procedures..."
                  className="flex-1 border border-indigo-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white/70 backdrop-blur-sm transition-all duration-300 hover:bg-white/90 focus:bg-white shadow-sm"
                  rows={2}
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  title="Send message"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span className="md:hidden">Send</span>
                </button>
              </div>
              <p className="text-xs text-indigo-500 mt-2 text-center font-medium">AI guidance is for reference. Always verify with clinical judgment.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantView;
