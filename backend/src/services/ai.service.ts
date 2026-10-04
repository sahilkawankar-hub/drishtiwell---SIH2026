/**
 * AI Service Abstraction Layer
 * 
 * This interface defines the contract for all AI providers.
 * To connect a real LLM: implement IAIProvider and register it below.
 * 
 * Supported providers:
 *   - DemoAIProvider (deterministic, no API key required) — default
 *   - OpenAIProvider (connect when OPENAI_API_KEY is set)
 *   - GeminiProvider (connect when GOOGLE_AI_API_KEY is set)
 */

export interface DrillingContext {
  activeWellId: string;
  currentDepth: number;
  currentFormation: string;
  recentEvents: Array<{
    eventType: string;
    depth: number;
    severity: string;
    description: string;
  }>;
  currentParameters?: {
    wob?: number;
    rpm?: number;
    torque?: number;
    rop?: number;
    mudWeight?: number;
    standpipePressure?: number;
  };
}

export interface AIRecommendation {
  title: string;
  content: string;
  category: string;
  priority: string;
  rationale: string;
  confidence: number;
  provider: string;
}

export interface RiskAssessment {
  riskType: string;
  severity: string;
  probability: number;
  evidence: string[];
  mitigation: string;
  confidence: number;
  provider: string;
}

export interface IAIProvider {
  readonly name: string;
  generateRecommendation(context: DrillingContext): Promise<AIRecommendation>;
  assessRisk(context: DrillingContext): Promise<RiskAssessment[]>;
  answerQuestion(question: string, context: DrillingContext): Promise<string>;
}

// ─── Demo Provider (deterministic, no API required) ──────────────────────────
class DemoAIProvider implements IAIProvider {
  readonly name = 'DEMO';

  async generateRecommendation(context: DrillingContext): Promise<AIRecommendation> {
    const highSeverityEvent = context.recentEvents.find(
      (e) => e.severity === 'HIGH' || e.severity === 'CRITICAL'
    );

    if (highSeverityEvent?.eventType === 'MUD_LOSS') {
      return {
        title: 'Increase Mud Weight — Mud Loss Mitigation',
        content: `Based on historical data from ${context.currentFormation} at ${context.currentDepth}m, consider: (1) Reduce flow rate by 10-15%, (2) Increase mud weight to ECD of 1.42 g/cc, (3) Spot LCM pill (100 mesh nut shells + fine fibers), (4) Monitor returns continuously.`,
        category: 'MUD_PROGRAM',
        priority: 'HIGH',
        rationale: `Offset wells show 3 mud loss incidents at similar depth (${context.currentDepth - 100}m–${context.currentDepth + 100}m) in ${context.currentFormation}.`,
        confidence: 0.78,
        provider: this.name,
      };
    }

    if (highSeverityEvent?.eventType === 'STUCK_PIPE') {
      return {
        title: 'Overpull Protocol — Stuck Pipe Response',
        content: `Immediate actions: (1) Apply 10-15t overpull, (2) Rotate string at 40 RPM, (3) Increase flow rate, (4) Spot spotting fluid if mechanical stuck. Historical data shows jar-down effective in 72% of similar cases in this formation.`,
        category: 'GENERAL',
        priority: 'CRITICAL',
        rationale: `Formation ${context.currentFormation} has 65% historical stuck-pipe incidence at ${context.currentDepth}m. Clay swelling is primary cause.`,
        confidence: 0.82,
        provider: this.name,
      };
    }

    return {
      title: 'Continue with Current Parameters — Within Normal Range',
      content: `Current drilling parameters are within acceptable range for ${context.currentFormation}. Maintain WOB at ${context.currentParameters?.wob ?? 'N/A'}t. Monitor MSE for any formation change indication.`,
      category: 'GENERAL',
      priority: 'LOW',
      rationale: 'No anomalous events detected in the last 100m interval.',
      confidence: 0.91,
      provider: this.name,
    };
  }

  async assessRisk(context: DrillingContext): Promise<RiskAssessment[]> {
    const risks: RiskAssessment[] = [];

    // Mud loss risk based on formation
    if (['FRM_BARAIL', 'FRM_KOPILI', 'FRM_SYLHET'].includes(context.currentFormation)) {
      risks.push({
        riskType: 'MUD_LOSS',
        severity: 'HIGH',
        probability: 0.72,
        evidence: [
          `Formation ${context.currentFormation} has fractured limestone intervals`,
          `3 offset wells reported mud losses at this depth range`,
          `Current mud weight above fracture gradient threshold`,
        ],
        mitigation: 'Reduce mud weight, prepare LCM pill, have blind drilling procedure ready',
        confidence: 0.76,
        provider: this.name,
      });
    }

    // Overpressure risk
    if (context.currentDepth > 2500 && context.currentParameters?.standpipePressure) {
      const pressure = context.currentParameters.standpipePressure;
      if (pressure > 280) {
        risks.push({
          riskType: 'OVERPRESSURE',
          severity: 'HIGH',
          probability: 0.61,
          evidence: [
            `Standpipe pressure at ${pressure} bar — 18% above normal trend`,
            `D-exponent declining trend observed in last 50m`,
            `Offset well OIL-HW-004 had kick at similar depth/formation`,
          ],
          mitigation: 'Increase mud weight by 0.03 g/cc, monitor flow-back rate, activate BOP inspection',
          confidence: 0.69,
          provider: this.name,
        });
      }
    }

    return risks;
  }

  async answerQuestion(question: string, context: DrillingContext): Promise<string> {
    // Demo: keyword-based response
    const q = question.toLowerCase();

    if (q.includes('stuck pipe') || q.includes('stuck')) {
      return `Based on offset well data in ${context.currentFormation}, stuck pipe risk is ELEVATED. The Barail Shale member at ${context.currentDepth}m has high clay content (montmorillonite ~35%) causing wellbore instability. Recommended: Maintain minimum flowrate, reduce WOB if torque exceeds 18 kN.m, have jar activation sequence ready. Reference: OIL-HW-003 Well Report (2023) — similar stuck pipe event resolved with 200L oil spotting fluid.`;
    }

    if (q.includes('mud') || q.includes('loss')) {
      return `Historical analysis of nearby wells shows mud loss probability of 72% in the current zone. The fractured limestone in ${context.currentFormation} has a natural fracture aperture of 1.2–3.4mm. Recommended LCM blend: 40% medium nut shells + 30% fine fibers + 20% graphite flakes + 10% cellophane.`;
    }

    if (q.includes('formation') || q.includes('geology')) {
      return `Current formation: ${context.currentFormation} at ${context.currentDepth}m. Expected next formation boundary: ~${context.currentDepth + 150}m (DEMO estimate). Lithology: interbedded shale and sandstone with 15-20% carbonate content.`;
    }

    return `[DEMO AI] I analyzed the drilling context for depth ${context.currentDepth}m in formation ${context.currentFormation}. Based on ${context.recentEvents.length} recent events and 8 offset well comparisons, no immediate action is required. Continue monitoring drilling parameters per current program. — Note: Connect a real LLM provider for production-quality responses.`;
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────
function createAIProvider(): IAIProvider {
  const provider = process.env.AI_PROVIDER || 'demo';

  switch (provider.toLowerCase()) {
    case 'demo':
    default:
      return new DemoAIProvider();
    // Future:
    // case 'openai': return new OpenAIProvider();
    // case 'gemini': return new GeminiProvider();
  }
}

export const aiService: IAIProvider = createAIProvider();
export default aiService;
