export type ScanCandidate = {
  fieldName: string;
  oldValue: string;
  newValue: string;
  sourceUrl: string;
  confidenceScore: number;
};

export type ScanResult = {
  churchSlug: string;
  scannedAt: string;
  candidates: ScanCandidate[];
};
