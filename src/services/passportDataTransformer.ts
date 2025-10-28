// src/services/passportDataTransformer.ts

import type { PassportData as PluginData } from '@/plugins/PassportScanner';
import type { PassportData as AppData } from '@/types/passport';

export class PassportDataTransformer {
  static pluginToApp(pluginData: PluginData): AppData {
    // Implement transformation logic here
    // This centralizes all conversion logic
  }
  
  static appToPlugin(appData: AppData): PluginData {
    // For reverse transformation if needed
  }
}
