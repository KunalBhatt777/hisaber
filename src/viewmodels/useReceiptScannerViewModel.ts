import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { validateReceipt, extractReceipt } from '../services/receiptApi';

export class InvalidReceiptError extends Error {
  constructor() {
    super('Not a valid receipt');
  }
}

export class ParseFailureError extends Error {
  constructor() {
    super('Failed to parse receipt');
  }
}

export interface ScanResult {
  storeName: string;
  items: Array<{ name: string; price: number }>;
}

export function useReceiptScannerViewModel() {
  const [loading, setLoading] = useState(false);

  const pickAndScan = async (source: 'camera' | 'gallery'): Promise<ScanResult | null> => {
    if (source === 'camera') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return null;
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return null;
    }

    const pickerResult =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images' as ImagePicker.MediaType],
            quality: 0.8,
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images' as ImagePicker.MediaType],
            quality: 0.8,
            base64: true,
          });

    if (pickerResult.canceled || !pickerResult.assets?.[0]?.base64) return null;

    const base64 = pickerResult.assets[0].base64!;
    setLoading(true);
    try {
      const validation = await validateReceipt(base64);
      if (!validation.is_receipt) throw new InvalidReceiptError();
      try {
        const extraction = await extractReceipt(base64);
        return { storeName: extraction.store_name, items: extraction.items };
      } catch {
        throw new ParseFailureError();
      }
    } finally {
      setLoading(false);
    }
  };

  return { loading, pickAndScan };
}
