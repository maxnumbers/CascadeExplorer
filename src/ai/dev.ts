
import { config } from 'dotenv';
config();

import '@/ai/flows/assertion-reflection.ts';
import '@/ai/flows/generate-impacts-by-order.ts'; // Changed from impact-mapping.ts
import '@/ai/flows/suggest-impact-consolidation.ts';
