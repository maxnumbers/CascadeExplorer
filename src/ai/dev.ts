
import { config } from 'dotenv';
config();

import '@/ai/flows/assertion-reflection.ts';
import '@/ai/flows/generate-impacts-by-order.ts';
import '@/ai/flows/suggest-impact-consolidation.ts';
import '@/ai/flows/generate-cascade-summary.ts';
import '@/ai/flows/revise-system-model-with-feedback.ts';
import '@/ai/flows/tension-identification.ts'; // Added new tension identification flow

    