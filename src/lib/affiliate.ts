/**
 * Robust Amazon Affiliate Link Generator
 */
export const generateAffiliateLink = (url: string, affiliateId?: string): string => {
  if (!affiliateId || !url) return url;
  
  try {
    // Basic validation & normalization
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    const urlObj = new URL(cleanUrl);
    
    // Target Amazon domains including international marketplaces
    const isAmazon = urlObj.hostname.split('.').some(part => part === 'amazon' || part === 'amzn');
    
    if (isAmazon) {
      // 1. Core Parameter: The Associate Tag
      urlObj.searchParams.set('tag', affiliateId);
      
      // 2. Remove common tracking/referral noise parameters to prevent attribution conflicts
      const paramsToRemove = [
        'ref', 'ref_', 'pf_rd_r', 'pf_rd_p', 'pd_rd_r', 'pd_rd_w', 'pd_rd_wg', 
        'psc', 'qid', 'sr', 'keywords', 'sprefix'
      ];
      paramsToRemove.forEach(p => urlObj.searchParams.delete(p));

      // 3. Handle amzn.to redirects (usually these don't take direct tags eaily, but we try)
      // Note: amzn.to is already an affiliate link usually, but if we have a raw one:
      if (urlObj.hostname === 'amzn.to') {
        // amzn.to doesn't usually take search params for tagging, it's a shortlink
        // but we can't easily "expand" it without a network request.
        // We'll leave it as is if it's already short, but try adding for long URLs.
      }

      return urlObj.toString();
    }
    
    return cleanUrl;
  } catch (e) {
    // Fallback for malformed URLs
    if (url.includes('amazon.') || url.includes('amzn.')) {
      const base = url.split('?')[0];
      const params = new URLSearchParams(url.split('?')[1] || '');
      params.set('tag', affiliateId);
      return `${base}?${params.toString()}`;
    }
    return url;
  }
};
