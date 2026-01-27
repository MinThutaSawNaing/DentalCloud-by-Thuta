import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2, Sparkles, AlertCircle, User, Copy, Check } from 'lucide-react';
import { Patient, ClinicalRecord, Appointment, Doctor, TreatmentType, User as UserType, Medicine } from '../types';

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
  // Daily usage limit tracking
  const DAILY_LIMIT = 4;
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
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `👋 Hello! I'm Loli, your AI Clinical Assistant. I can help you with:

• Patient case analysis
• Treatment recommendations
• Dental diagnosis suggestions
• Clinical documentation
• Medical history interpretation

How can I assist you today?

💡 *Note: You have ${DAILY_LIMIT} free requests per day. Today's usage: ${dailyUsageCount}/${DAILY_LIMIT}*`,
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<'ready' | 'mock' | 'error'>('mock');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

  const getContextualData = () => {
    // Highly optimized/compressed data for minimal token usage
    return {
      s: { // stats
        p: patients.length,
        a: appointments.length,
        d: doctors.length,
        t: treatmentTypes.length,
        m: medicines.length
      },
      // Essential info only
      dr: doctors.map(d => ({ n: d.name, s: d.specialization })), 
      ua: appointments.filter(a => a.status === 'Scheduled').slice(0, 5).map(a => ({ p: a.patient_name, d: a.doctor_name, t: `${a.date} ${a.time}` })),
      tr: treatmentRecords.slice(0, 5).map(r => ({ p: r.patient_name, d: r.description, dt: r.date })),
      ls: medicines.filter(m => m.stock <= (m.min_stock || 0)).map(m => ({ n: m.name, q: m.stock }))
    };
  };

  const callAICompletionAPI = async (userMessage: string): Promise<string> => {
    const apiKey = process.env.AI_API_KEY || MOCK_API_KEY;
    
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
      const contextData = getContextualData();
      const systemPrompt = `You are Loli, a dental AI assistant by WinterArc Myanmar, designed by Min Thuta Saw Naing.
Practice Data (Compressed): ${JSON.stringify(contextData)}
Keys: s=stats(p:patients,a:apps,d:docs,t:treatments,m:meds), dr=doctors, ua=upcoming apps, tr=recent treatments, ls=low stock meds.
Provide clinical/practice advice. Verification by pros required. Identity: Loli by WinterArc Myanmar.`;

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
          const contextData = getContextualData();
          resolve(`📊 **Practice Overview:**

**Current Statistics:**
- Total Active Patients: ${contextData.s.p}
- Recent Treatments: ${contextData.s.a}

**Recent Activity:**
${contextData.tr.map(r => 
  `• ${r.p}: ${r.d} (${new Date(r.dt).toLocaleDateString()})`
).join('\n')}

💡 *This is real data from your practice. What specific aspect would you like to discuss?*`);
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

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const aiResponse = await callAICompletionAPI(userMessage.content);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-900">Loli - AI Clinical Assistant</h1>
            <p className="text-sm text-gray-500 font-medium">by WinterArc Myanmar | Daily Limit: {dailyUsageCount}/{DAILY_LIMIT}</p>
          </div>
        </div>

        {/* API Status Banner */}
        {apiStatus === 'mock' && (
          <div className="mt-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-bold text-yellow-800 mb-1">Mock Mode Active</h3>
                <p className="text-xs text-yellow-700 leading-relaxed mb-2">
                  Using simulated responses. To enable real AI:
                </p>
                <ol className="text-xs text-yellow-700 space-y-1 ml-4 list-decimal">
                  <li>Get your API key from: <a href="https://apifree.ai" target="_blank" rel="noopener noreferrer" className="underline font-semibold">apifree.ai</a></li>
                  <li>Create a <code className="bg-yellow-100 px-1 py-0.5 rounded">.env</code> file in project root</li>
                  <li>Add: <code className="bg-yellow-100 px-1 py-0.5 rounded">AI_API_KEY=your_actual_key</code></li>
                  <li>Restart the dev server</li>
                </ol>
                <p className="text-xs text-yellow-700 mt-2">
                  📄 The file location to edit: <code className="bg-yellow-100 px-1 py-0.5 rounded">d:\Dental Cloud Qoder\DentalCloud-by-Thuta\.env</code>
                </p>
              </div>
            </div>
          </div>
        )}

        {apiStatus === 'error' && (
          <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-400 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-red-800 mb-1">API Connection Error</h3>
                <p className="text-xs text-red-700">Please check your API key configuration and internet connection.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Container */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col" style={{ height: 'calc(100vh - 300px)', minHeight: '500px', maxHeight: '700px' }}>
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              
              <div
                className={`max-w-[80%] group relative ${
                  message.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm'
                    : 'bg-gray-50 text-gray-900 rounded-2xl rounded-tl-sm'
                } px-4 py-3`}
              >
                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </div>
                <div className={`flex items-center gap-2 mt-2 pt-2 border-t ${
                  message.role === 'user' ? 'border-indigo-500' : 'border-gray-200'
                }`}>
                  <span className={`text-[10px] font-medium ${
                    message.role === 'user' ? 'text-indigo-200' : 'text-gray-400'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <button
                    onClick={() => copyToClipboard(message.content, message.id)}
                    className={`ml-auto p-1 rounded hover:bg-opacity-10 hover:bg-black transition-colors ${
                      message.role === 'user' ? 'text-indigo-200' : 'text-gray-400'
                    }`}
                    title="Copy message"
                  >
                    {copiedId === message.id ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                  <span className="text-sm text-gray-500">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompts */}
        {messages.length === 1 && (
          <div className="px-6 pb-4 pt-2 border-t border-gray-100 flex-shrink-0">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Quick Questions</p>
            <div className="grid grid-cols-2 gap-2">
              {quickPrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => setInputMessage(prompt)}
                  className="text-left text-xs p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 hover:border-indigo-300"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-gray-100 flex-shrink-0">
          <div className="flex gap-3">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about dental procedures, treatments, or patient care..."
              className="flex-1 border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              rows={2}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="px-6 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span className="hidden sm:inline">Send</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 text-center">
            AI responses are for reference only. Always verify with professional clinical judgment.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantView;
