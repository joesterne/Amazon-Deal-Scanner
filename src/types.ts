export interface UserProfile {
  uid: string;
  email: string;
  affiliateId?: string;
  createdAt: any;
}

export interface TrackedItem {
  id?: string;
  userId: string;
  amazonId: string;
  title: string;
  imageUrl: string;
  targetPrice: number;
  currentPrice: number;
  marketplace: string;
  url: string;
  createdAt: any;
  emailAlertEnabled?: boolean;
  alertEmail?: string;
  lastAlertSentAt?: any;
}

export interface PublicDeal {
  id?: string;
  finderUserId: string;
  title: string;
  originalPrice: number;
  discountedPrice: number;
  discountPercentage: number;
  marketplace: string;
  url: string;
  affiliateUrl: string;
  imageUrl: string;
  timestamp: any;
}

export interface AmazonItem {
  id: string; // ASIN
  title: string;
  imageUrl: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  url: string;
  marketplace: string;
}
