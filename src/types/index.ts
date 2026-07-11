export interface NewsOrOffer {
  id: string;
  type: 'banner' | 'news' | 'event';
  title: string;
  subtitle: string;
  imageUrl: string;
  callToActionUrl: string;
  isActive: boolean;
  priority: number;
  createdAt: Date | string;
}
