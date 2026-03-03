// LabKey Product Organization by System Architecture

export const PRODUCT_LINES = {
  CONTROL_UNITS: {
    name: 'Control Units',
    description: 'Central controllers for access management',
    subcategories: {
      BASIC: {
        name: 'Basic',
        description: 'WiFi Connection',
        skus: ['LK-BS-CU2', 'LK-BS-CU4', 'LK-BS-CU2-R', 'LK-BS-CU4-R', 'LK-BS/REM-CU2', 'LK-BS/REM-CU4'],
        features: ['WiFi', 'Cloud Management', '2 or 4 Relays'],
        color: 'bg-blue-500'
      },
      PRO: {
        name: 'Pro',
        description: 'WiFi + LAN',
        skus: ['LK-PR-CU2', 'LK-PR-CU4', 'LK-PR-CU2-R', 'LK-PR-CU4-R', 'LK-PR/REM-CU2', 'LK-PR/REM-CU4'],
        features: ['WiFi', 'LAN', 'Cloud Management', '2 or 4 Relays'],
        color: 'bg-purple-500'
      },
      LTE: {
        name: 'LTE',
        description: '4G + WiFi (5 Year Data Included)',
        skus: ['LK-LT-CU2', 'LK-LT-CU4', 'LK-LT-CU2-R', 'LK-LT-CU4-R', 'LK-LT/RM-CU2', 'LK-LT/RM-CU4'],
        features: ['4G/LTE', 'WiFi', 'Cloud Management', '5 Year Data', '2 or 4 Relays'],
        color: 'bg-emerald-500'
      },
      STANDALONE: {
        name: 'Stand Alone',
        description: 'Local Network (Offline)',
        skus: ['LK-ST-CU2', 'LK-ST-CU4', 'LK-ST-ETH-CU4', 'LK-ST-CU2-R', 'LK-ST-CU4-R'],
        features: ['Local Network', 'App Management', 'No Cloud Required', '2 or 4 Relays'],
        color: 'bg-orange-500'
      }
    }
  },
  READERS: {
    name: 'Readers',
    description: 'Access control devices',
    subcategories: {
      NEXT: {
        name: 'Next',
        description: 'Keypad + NFC + QR Code',
        skus: ['LK-NX-T', 'LK-NX-N', 'LK-NX-TN', 'LK-NX-Q', 'LK-NX-TS'],
        features: ['Keypad', 'NFC', 'QR Code', 'IP65', '100x100x27mm'],
        color: 'bg-indigo-500'
      },
      MINI: {
        name: 'Mini',
        description: 'Compact Reader',
        skus: ['LK-MI-T', 'LK-MI-TN', 'LK-MI-TQ', 'LK-MI-TQN', 'LK-MI-R'],
        features: ['Compact', 'Keypad', 'NFC', 'QR Code', 'Radio Option'],
        color: 'bg-pink-500'
      },
      GLASS: {
        name: 'Glass',
        description: 'Touch Glass Panel',
        skus: ['LK-GL-T', 'LK-GL-N', 'LK-GL-TN', 'LK-GL-TQ', 'LK-GL-NQ', 'LK-GL-TQN', 'LK-GL-TQN-503'],
        features: ['Touch Glass', 'Keypad', 'NFC', 'QR Code', 'Elegant Design'],
        color: 'bg-cyan-500'
      },
      EXTREME: {
        name: 'Extreme',
        description: 'Vandal-proof & Recessed',
        skus: ['LK-EX-TA', 'LK-EX-QI', 'LK-EX-TAC'],
        features: ['Vandal-proof', 'Recessed', 'Stainless Steel', 'IP65', 'QR or Keypad'],
        color: 'bg-red-500'
      },
      CREDIT_CARD: {
        name: 'Credit Card',
        description: 'Payment System',
        skus: ['LK-CC-CU2', 'LK-CC-TN'],
        features: ['Payment', 'Credit Card', 'Coin', '2 Relays'],
        color: 'bg-amber-500'
      }
    }
  },
  MEDIA: {
    name: 'Media',
    description: 'NFC cards, keychains, stickers',
    subcategories: {
      CARDS: {
        name: 'Cards',
        description: 'NFC Access Cards',
        skus: ['LK-GN-TS', 'LK-GN-TSO', 'LK-GN-TS1', 'LK-GN-TS2'],
        features: ['Standard', 'Personalized', 'Single/Double-sided'],
        color: 'bg-teal-500'
      },
      KEYCHAINS: {
        name: 'Keychains',
        description: 'NFC Keychain Tokens',
        skus: ['LK-GNGP-', 'LK-GN-GP2'],
        features: ['Neutral', 'With Logo', 'Durable'],
        color: 'bg-violet-500'
      },
      STICKERS: {
        name: 'Stickers',
        description: 'NFC Stickers',
        skus: ['LK-GN-SK'],
        features: ['Custom Print', 'Adhesive'],
        color: 'bg-lime-500'
      },
      BRACELETS: {
        name: 'Bracelets',
        description: 'Silicone Fitness Bracelets',
        skus: ['LK-GN-BF/LK', 'LK-GN-BF1'],
        features: ['With Logo', 'Neutral', 'Silicone'],
        color: 'bg-rose-500'
      }
    }
  },
  ACCESSORIES: {
    name: 'Accessories',
    description: 'Additional components',
    subcategories: {
      GENERAL: {
        name: 'General',
        description: 'Accessories & Add-ons',
        skus: ['LK-ACC-PS/NX', 'LK-ACC-PS/MIGL-', 'LK-PR-CU4-ACC/CU4', 'LK-ACC/INPUT', 'LK-ALIM/DIN', 'LK-ACC-AS/MI-GL', 'LK-ACC/LETT-NFC'],
        features: ['Protective Shields', 'Additional Relays', 'GPIO Inputs', 'Power Supply', 'Desktop Reader'],
        color: 'bg-slate-500'
      }
    }
  }
};

export function getProductLine(sku: string): { line: string; subcategory: string } | null {
  if (sku.startsWith('LK-BS')) return { line: 'CONTROL_UNITS', subcategory: 'BASIC' };
  if (sku.startsWith('LK-PR')) return { line: 'CONTROL_UNITS', subcategory: 'PRO' };
  if (sku.startsWith('LK-LT')) return { line: 'CONTROL_UNITS', subcategory: 'LTE' };
  if (sku.startsWith('LK-ST')) return { line: 'CONTROL_UNITS', subcategory: 'STANDALONE' };
  if (sku.startsWith('LK-NX')) return { line: 'READERS', subcategory: 'NEXT' };
  if (sku.startsWith('LK-MI')) return { line: 'READERS', subcategory: 'MINI' };
  if (sku.startsWith('LK-GL')) return { line: 'READERS', subcategory: 'GLASS' };
  if (sku.startsWith('LK-EX')) return { line: 'READERS', subcategory: 'EXTREME' };
  if (sku.startsWith('LK-CC')) return { line: 'READERS', subcategory: 'CREDIT_CARD' };
  if (sku.startsWith('LK-GN')) return { line: 'MEDIA', subcategory: 'GENERAL' };
  if (sku.startsWith('LK-ACC') || sku.startsWith('LK-ALIM')) return { line: 'ACCESSORIES', subcategory: 'GENERAL' };
  return null;
}

export function isControlUnit(sku: string): boolean {
  return sku.startsWith('LK-BS') || sku.startsWith('LK-PR') || sku.startsWith('LK-LT') || sku.startsWith('LK-ST') || sku.startsWith('LK-CC-CU');
}

export function isReader(sku: string): boolean {
  return sku.startsWith('LK-NX') || sku.startsWith('LK-MI') || sku.startsWith('LK-GL') || sku.startsWith('LK-EX') || sku.startsWith('LK-CC-TN');
}

export function isMedia(sku: string): boolean {
  return sku.startsWith('LK-GN');
}

export function getRelayCount(sku: string): number {
  if (sku.includes('CU2') || sku.includes('CU2-')) return 2;
  if (sku.includes('CU4') || sku.includes('CU4-')) return 4;
  return 0;
}
