// Company / Business Profile store for Kasi P.O.S
// This profile is used as branding on printed reports.

export interface CompanyProfile {
  businessName: string;
  tradingName: string;
  logo: string;                // base64 data-URL or empty string
  slogan: string;              // tagline / business slogan
  registrationNumber: string;
  vatNumber: string;
  physicalAddress: string;
  postalAddress: string;
  phone: string;
  email: string;
  website: string;
  contactPerson: string;
  footerNote: string;          // shown on A4 reports
  receiptNote: string;         // shown on thermal receipts (e.g. "Thank you!")
  branchName: string;
  branchCode: string;
  showPoweredBy: boolean;      // show "Powered by Kasi P.O.S" on prints
}

export const EMPTY_PROFILE: CompanyProfile = {
  businessName: '',
  tradingName: '',
  logo: '',
  slogan: '',
  registrationNumber: '',
  vatNumber: '',
  physicalAddress: '',
  postalAddress: '',
  phone: '',
  email: '',
  website: '',
  contactPerson: '',
  footerNote: '',
  receiptNote: '',
  branchName: '',
  branchCode: '',
  showPoweredBy: true,
};

const KEY = 'kasi_company_profile';

export const companyStore = {
  get(): CompanyProfile {
    try {
      return { ...EMPTY_PROFILE, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
    } catch {
      return { ...EMPTY_PROFILE };
    }
  },

  set(profile: CompanyProfile): void {
    localStorage.setItem(KEY, JSON.stringify(profile));
  },

  hasProfile(): boolean {
    return Boolean(companyStore.get().businessName.trim());
  },
};

/** Resize an image File to ≤ maxDim px on longest side and return base64 JPEG */
export function resizeImage(file: File, maxDim = 300): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = evt => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = evt.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}
