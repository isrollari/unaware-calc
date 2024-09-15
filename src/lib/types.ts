// src/lib/types.ts

export interface NorscaData {
  Input: string;
  Catalyst: string | null;
  Tool: string;
  'Output 1': string | null;
  'Output 2': string | null;
  'Output 3': string | null;
  'Output 4': string | null;
  'Output 5': string | null;
  'Image Path': string;
}

export interface RefiningData {
  Input: string;
  'Catalyst 1': string;
  'Catalyst 2': string;
  Output: string;
  'Image Path': string;
}
