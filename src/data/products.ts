export interface Product {
  productCode: string;
  description: string;
  inStock: number;
  category: string;
  releCount: number;
  minStock?: number;
  lastUpdated?: string;
}

export const initialProducts: Product[] = [
  { productCode: "LK-BS-CU2", description: "LABKEY BASIC WITH 2 RELE'", inStock: 8, category: "BASIC", releCount: 2, minStock: 5 },
  { productCode: "LK-BS-CU4", description: "LABKEY BASIC WITH 4 RELE'", inStock: 5, category: "BASIC", releCount: 4, minStock: 5 },
  { productCode: "LK-BS-CU2-R", description: "LABKEY BASIC WITH 2 RELE' and Radio module", inStock: 4, category: "BASIC RADIO", releCount: 2, minStock: 3 },
  { productCode: "LK-BS-CU4-R", description: "LABKEY BASIC WITH 4 RELE' and Radio module", inStock: 0, category: "BASIC RADIO", releCount: 4, minStock: 3 },
  { productCode: "LK-BS/REM-CU2", description: "LABKEY BASIC REMOTE WITH 2 RELE'", inStock: 1, category: "BASIC REMOTE", releCount: 2, minStock: 2 },
  { productCode: "LK-BS/REM-CU4", description: "LABKEY BASIC REMOTE WITH 4 RELE'", inStock: 0, category: "BASIC REMOTE", releCount: 4, minStock: 2 },
  { productCode: "LK-PR-CU2", description: "LABKEY PRO WITH 2 RELE'", inStock: 0, category: "PRO", releCount: 2, minStock: 3 },
  { productCode: "LK-PR-CU4", description: "LABKEY PRO WITH 4 RELE'", inStock: 2, category: "PRO", releCount: 4, minStock: 3 },
  { productCode: "LK-PR-CU2-R", description: "LABKEY PRO WITH 2 RELE' and Radio module", inStock: 2, category: "PRO RADIO", releCount: 2, minStock: 2 },
  { productCode: "LK-PR-CU4-R", description: "LABKEY PRO WITH 4 RELE' and Radio module", inStock: 0, category: "PRO RADIO", releCount: 4, minStock: 2 },
  { productCode: "LK-PR/REM-CU2", description: "LABKEY PRO REMOTE WITH 2 RELE'", inStock: 0, category: "PRO REMOTE", releCount: 2, minStock: 2 },
  { productCode: "LK-PR/REM-CU4", description: "LABKEY PRO REMOTE WITH 4 RELE'", inStock: 0, category: "PRO REMOTE", releCount: 4, minStock: 2 },
  { productCode: "LK-LT-CU2", description: "LABKEY LTE WITH 2 RELE'", inStock: 4, category: "LTE", releCount: 2, minStock: 3 },
  { productCode: "LK-LT-CU4", description: "LABKEY LTE WITH 4 RELE'", inStock: 1, category: "LTE", releCount: 4, minStock: 3 },
  { productCode: "LK-LT-CU2-R", description: "LABKEY LTE WITH 2 RELE' and Radio module", inStock: 0, category: "LTE RADIO", releCount: 2, minStock: 2 },
  { productCode: "LK-LT-CU4-R", description: "LABKEY LTE WITH 4 RELE' and Radio module", inStock: 0, category: "LTE RADIO", releCount: 4, minStock: 2 },
  { productCode: "LK-LT/RM-CU2", description: "LABKEY LTE REMOTE WITH 2 RELE'", inStock: 0, category: "LTE REMOTE", releCount: 2, minStock: 2 },
  { productCode: "LK-LT/RM-CU4", description: "LABKEY LTE REMOTE WITH 4 RELE'", inStock: 0, category: "LTE REMOTE", releCount: 4, minStock: 2 },
  { productCode: "LK-ST-CU2", description: "LABKEY STAND ALONE WITH 2 RELE'", inStock: 2, category: "STAND ALONE", releCount: 2, minStock: 2 },
  { productCode: "LK-ST-CU4", description: "LABKEY STAND ALONE WITH 4 RELE'", inStock: 0, category: "STAND ALONE", releCount: 4, minStock: 2 },
  { productCode: "LK-ST/ETH-CU4", description: "LABKEY STAND ALONE WITH 4 RELE' ETHERNET", inStock: 0, category: "STAND ALONE", releCount: 4, minStock: 2 },
  { productCode: "LK-ST-CU2-R", description: "LABKEY STAND ALONE WITH 2 RELE' and Radio module", inStock: 0, category: "STAND ALONE RADIO", releCount: 2, minStock: 2 },
  { productCode: "LK-ST-CU4-R", description: "LABKEY STAND ALONE WITH 4 RELE' and Radio module", inStock: 0, category: "STAND ALONE RADIO", releCount: 4, minStock: 2 },
  { productCode: "LK-NX-T", description: "LABKEY NEXT KEYPAD", inStock: 4, category: "NEXT", releCount: 0, minStock: 5 },
  { productCode: "LK-NX-N", description: "LABKEY NEXT NFC", inStock: 8, category: "NEXT", releCount: 0, minStock: 5 },
  { productCode: "LK-NX-TN", description: "LABKEY NEXT KEYPAD + NFC", inStock: 3, category: "NEXT", releCount: 0, minStock: 5 },
  { productCode: "LK-NX-Q", description: "LABKEY NEXT QR CODE", inStock: 9, category: "NEXT", releCount: 0, minStock: 5 },
  { productCode: "LK-NX-TS", description: "LABKEY NEXT POCKET", inStock: 0, category: "NEXT", releCount: 0, minStock: 3 },
  { productCode: "LK-MI-T", description: "LABKEY MINI KEYPAD", inStock: 2, category: "MINI", releCount: 0, minStock: 3 },
  { productCode: "LK-MI-TN", description: "LABKEY MINI KEYPAD + NFC", inStock: 3, category: "MINI", releCount: 0, minStock: 3 },
  { productCode: "LK-MI-TQ", description: "LABKEY MINI KEYPAD + QR CODE", inStock: 5, category: "MINI", releCount: 0, minStock: 3 },
  { productCode: "LK-MI-TQN", description: "LABKEY MINI KEYPAD + QR CODE + NFC", inStock: 9, category: "MINI", releCount: 0, minStock: 3 },
  { productCode: "LK-MI-R", description: "LABKEY MINI RADIO KEYPAD", inStock: 3, category: "MINI", releCount: 0, minStock: 3 },
  { productCode: "LK-GL-T", description: "LABKEY GLASS TASTIERINO", inStock: 0, category: "GLASS", releCount: 0, minStock: 3 },
  { productCode: "LK-GL-N", description: "LABKEY GLASS NFC", inStock: 5, category: "GLASS", releCount: 0, minStock: 3 },
  { productCode: "LK-GL-TN", description: "LABKEY GLASS TASTIERINO + NFC", inStock: 5, category: "GLASS", releCount: 0, minStock: 3 },
  { productCode: "LK-GL-TQ", description: "LABKEY GLASS TASTIERINO + QR CODE", inStock: 1, category: "GLASS", releCount: 0, minStock: 3 },
  { productCode: "LK-GL-NQ", description: "LABKEY GLASS NFC + QR CODE", inStock: 5, category: "GLASS", releCount: 0, minStock: 3 },
  { productCode: "LK-GL-TQN", description: "LABKEY GLASS KEYPAD + QR CODE + NFC", inStock: 8, category: "GLASS", releCount: 0, minStock: 3 },
  { productCode: "LK-GL-TQN-503", description: "LABKEY GLASS 503", inStock: 1, category: "GLASS", releCount: 0, minStock: 2 },
  { productCode: "LK-EX-TA", description: "LABKEY EXTREME VANDALPROOF KEYPAD", inStock: 0, category: "EXTREME", releCount: 0, minStock: 2 },
  { productCode: "LK-EX-QI", description: "LABKEY EXTREME RECESSED QR CODE", inStock: 0, category: "EXTREME", releCount: 0, minStock: 2 },
  { productCode: "LK-EX-TAC", description: "LABKEY EXTREME RECESSED VANDALPROOF KEYPAD WITH CARBON BOX", inStock: 0, category: "EXTREME", releCount: 0, minStock: 2 },
  { productCode: "LK-CC-CU2", description: "LABKEY CREDIT CARD CONTROL UNIT", inStock: 0, category: "CREDIT CARD", releCount: 2, minStock: 2 },
  { productCode: "LK-CC-TN", description: "LABKEY CREDIT CARD COMMAND DEVICE", inStock: 0, category: "CREDIT CARD", releCount: 0, minStock: 2 },
  { productCode: "LK-ACC-PS/NX", description: "NEXT protective shield", inStock: 10, category: "ACCESSORY", releCount: 0, minStock: 5 },
  { productCode: "LK-ACC-PS/MIGL-", description: "MINI / GLASS Protective Shield", inStock: 4, category: "ACCESSORY", releCount: 0, minStock: 5 },
  { productCode: "LK-PR-CU4-ACC/CU4", description: "Additional 4-relay plugin with LK-PR-CU4", inStock: 2, category: "PRO", releCount: 8, minStock: 3 },
  { productCode: "LK-ACC/INPUT", description: "4 GPIO Input Management Plugin", inStock: 0, category: "ACCESSORY", releCount: 0, minStock: 3 },
  { productCode: "LK-ALIM/DIN", description: "DIN Power Supply", inStock: 0, category: "ACCESSORY", releCount: 0, minStock: 3 },
  { productCode: "LK-ACC-AS/MI-GL", description: "MINI / GLASS Control Protective Enclosure", inStock: 0, category: "ACCESSORY", releCount: 0, minStock: 3 },
  { productCode: "LK-ACC/LETT-NFC", description: "Desktop NFC Reader", inStock: 7, category: "ACCESSORY", releCount: 0, minStock: 5 },
  { productCode: "LK-GN-TS", description: "STANDARD NEUTRAL CARD", inStock: 0, category: "MEDIA", releCount: 0, minStock: 50 },
  { productCode: "LK-GN-TSO", description: "STANDARD CARD LABKEY LOGO", inStock: 201, category: "MEDIA", releCount: 0, minStock: 100 },
  { productCode: "LK-GN-TS1", description: "PERSONALIZED SINGLE-SIDED CARD", inStock: 0, category: "MEDIA", releCount: 0, minStock: 20 },
  { productCode: "LK-GN-TS2", description: "PERSONALIZED DOUBLE-SIDED CARD", inStock: 0, category: "MEDIA", releCount: 0, minStock: 20 },
  { productCode: "LK-GNGP-", description: "NEUTRAL KEYCHAIN TOKEN (without logo)", inStock: 0, category: "MEDIA", releCount: 0, minStock: 50 },
  { productCode: "LK-GN-GP2", description: "KEYCHAIN TOKENS", inStock: 269, category: "MEDIA", releCount: 0, minStock: 100 },
  { productCode: "LK-GN-SK", description: "NFC STICKERS WITH CUSTOM PRINT", inStock: 0, category: "MEDIA", releCount: 0, minStock: 30 },
  { productCode: "LK-GN-BF/LK", description: "SILICONE FITNESS BRACELET WITH LABKEY LOGO", inStock: 0, category: "MEDIA", releCount: 0, minStock: 20 },
  { productCode: "LK-GN-BF1", description: "SILICONE FITNESS BRACELET", inStock: 0, category: "MEDIA", releCount: 0, minStock: 20 }
];

export const categories = [...new Set(initialProducts.map(p => p.category))];
