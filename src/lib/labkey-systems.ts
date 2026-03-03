// LabKey Product Categories and System Compatibility

export const CONTROL_UNITS = {
  BASIC: {
    name: 'Basic',
    description: 'WiFi Connection',
    skus: ['LK-BS-CU2', 'LK-BS-CU4', 'LK-BS-CU2-R', 'LK-BS-CU4-R'],
    maxDevices: { 2: 4, 4: 8 },
    features: ['WiFi', 'Cloud Management'],
    color: 'bg-blue-500'
  },
  PRO: {
    name: 'Pro',
    description: 'WiFi + LAN',
    skus: ['LK-PR-CU2', 'LK-PR-CU4', 'LK-PR-CU2-R', 'LK-PR-CU4-R'],
    maxDevices: { 2: 4, 4: 8 },
    features: ['WiFi', 'LAN', 'Cloud Management'],
    color: 'bg-purple-500'
  },
  LTE: {
    name: 'LTE',
    description: '4G + WiFi',
    skus: ['LK-LT-CU2', 'LK-LT-CU4', 'LK-LT-CU2-R', 'LK-LT-CU4-R'],
    maxDevices: { 2: 4, 4: 8 },
    features: ['4G/LTE', 'WiFi', 'Cloud Management', '5 Year Data Included'],
    color: 'bg-emerald-500'
  },
  STANDALONE: {
    name: 'Stand Alone',
    description: 'Local Network',
    skus: ['LK-ST-CU2', 'LK-ST-CU4', 'LK-ST-ETH-CU4', 'LK-ST-CU2-R', 'LK-ST-CU4-R'],
    maxDevices: { 2: 4, 4: 8 },
    features: ['Local Network', 'App Management', 'No Cloud'],
    color: 'bg-orange-500'
  }
};

export const READERS = {
  NEXT: {
    name: 'Next',
    description: 'Keypad + NFC + QR',
    skus: ['LK-NX-T', 'LK-NX-N', 'LK-NX-TN', 'LK-NX-Q', 'LK-NX-TS'],
    features: ['Keypad', 'NFC', 'QR Code', 'IP65'],
    compatibleWith: ['BASIC', 'PRO', 'LTE', 'STANDALONE'],
    color: 'bg-indigo-500'
  },
  MINI: {
    name: 'Mini',
    description: 'Compact Reader',
    skus: ['LK-MI-T', 'LK-MI-TN', 'LK-MI-TQ', 'LK-MI-TQN', 'LK-MI-R'],
    features: ['Compact', 'Keypad', 'NFC', 'QR Code'],
    compatibleWith: ['BASIC', 'PRO', 'LTE', 'STANDALONE'],
    color: 'bg-pink-500'
  },
  GLASS: {
    name: 'Glass',
    description: 'Touch Glass',
    skus: ['LK-GL-T', 'LK-GL-N', 'LK-GL-TN', 'LK-GL-TQ', 'LK-GL-NQ', 'LK-GL-TQN', 'LK-GL-TQN-503'],
    features: ['Touch Glass', 'Keypad', 'NFC', 'QR Code', 'Elegant Design'],
    compatibleWith: ['BASIC', 'PRO', 'LTE', 'STANDALONE'],
    color: 'bg-cyan-500'
  },
  EXTREME: {
    name: 'Extreme',
    description: 'Vandal-proof',
    skus: ['LK-EX-TA', 'LK-EX-QI', 'LK-EX-TAC'],
    features: ['Vandal-proof', 'Recessed', 'Stainless Steel', 'IP65'],
    compatibleWith: ['BASIC', 'PRO', 'LTE', 'STANDALONE'],
    color: 'bg-red-500'
  },
  CREDIT_CARD: {
    name: 'Credit Card',
    description: 'Payment System',
    skus: ['LK-CC-CU2', 'LK-CC-TN'],
    features: ['Payment', 'Credit Card', 'Coin'],
    compatibleWith: ['BASIC', 'PRO', 'LTE'],
    color: 'bg-amber-500'
  }
};

export const MEDIA = {
  CARDS: {
    name: 'Cards',
    skus: ['LK-GN-TS', 'LK-GN-TSO', 'LK-GN-TS1', 'LK-GN-TS2'],
    description: 'NFC Cards'
  },
  KEYCHAINS: {
    name: 'Keychains',
    skus: ['LK-GNGP-', 'LK-GN-GP2'],
    description: 'NFC Keychain Tokens'
  },
  STICKERS: {
    name: 'Stickers',
    skus: ['LK-GN-SK'],
    description: 'NFC Stickers'
  },
  BRACELETS: {
    name: 'Bracelets',
    skus: ['LK-GN-BF/LK', 'LK-GN-BF1'],
    description: 'Silicone Fitness Bracelets'
  }
};

export const ACCESSORIES = [
  'LK-ACC-PS/NX',
  'LK-ACC-PS/MIGL-',
  'LK-PR-CU4-ACC/CU4',
  'LK-ACC/INPUT',
  'LK-ALIM/DIN',
  'LK-ACC-AS/MI-GL',
  'LK-ACC/LETT-NFC'
];

// Helper function to get product category
export function getProductCategory(sku: string): string {
  if (sku.startsWith('LK-BS')) return 'BASIC';
  if (sku.startsWith('LK-PR')) return 'PRO';
  if (sku.startsWith('LK-LT')) return 'LTE';
  if (sku.startsWith('LK-ST')) return 'STAND ALONE';
  if (sku.startsWith('LK-NX')) return 'NEXT';
  if (sku.startsWith('LK-MI')) return 'MINI';
  if (sku.startsWith('LK-GL')) return 'GLASS';
  if (sku.startsWith('LK-EX')) return 'EXTREME';
  if (sku.startsWith('LK-CC')) return 'CREDIT CARD';
  if (sku.startsWith('LK-GN')) return 'MEDIA';
  if (sku.startsWith('LK-ACC') || sku.startsWith('LK-ALIM')) return 'ACCESSORY';
  return 'OTHER';
}

// Helper function to check if product is a Control Unit
export function isControlUnit(sku: string): boolean {
  return sku.includes('-CU') || sku.startsWith('LK-CC-CU');
}

// Helper function to check if product is a Reader
export function isReader(sku: string): boolean {
  return sku.startsWith('LK-NX') || sku.startsWith('LK-MI') || 
         sku.startsWith('LK-GL') || sku.startsWith('LK-EX') || 
         sku.startsWith('LK-CC-TN');
}

// Helper function to get relay count from SKU
export function getRelayCount(sku: string): number {
  if (sku.includes('CU2') || sku.includes('CU2-')) return 2;
  if (sku.includes('CU4') || sku.includes('CU4-')) return 4;
  return 0;
}
