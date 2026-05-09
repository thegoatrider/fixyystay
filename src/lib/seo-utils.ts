export function generateSEOContent(city: string, propertyType?: string, amenities?: string[]) {
  const typeStr = propertyType ? propertyType.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Stays';
  const cityStr = city.charAt(0).toUpperCase() + city.slice(1);
  
  let h1 = `Best ${typeStr} in ${cityStr}`;
  let title = `${h1} | FixyStays`;
  
  let amenityStr = amenities && amenities.length > 0 ? ` with ${amenities.join(', ')}` : '';
  let metaDescription = `Looking for the perfect getaway? Book the best ${typeStr.toLowerCase()} in ${cityStr}${amenityStr}. Find top-rated luxury and budget options on FixyStays.`;

  return { h1, title, metaDescription };
}
