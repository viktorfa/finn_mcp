export function parseHolidayDetail(html) {
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!nextDataMatch) return null;

  const nextData = JSON.parse(nextDataMatch[1]);
  const swrFallback = nextData?.props?.pageProps?.swrFallback ?? {};
  const data = swrFallback.objectDataKey;
  if (!data) return null;

  return {
    finn_code: data.adId,
    heading: data.heading,
    description: data.description || null,
    residence_description: data.residenceDescription || null,
    area_description: data.areaDescription || null,
    property_type: data.propertyType || null,
    estate_size: data.estateSize || null,
    beds: data.noOfBeds || null,
    bedrooms: data.noOfBedrooms || null,
    bathrooms: data.noOfBathrooms || null,
    facilities: data.facilities || [],
    house_rules: data.houseRules || null,
    poi_nearby: data.poiNearBy || [],
    pricing: data.pricing || null,
    location: data.location || null,
    is_private: data.isPrivate ?? null,
    images: (data.images || []).slice(0, 8).map((img) => img.src || img.thumbSrc),
  };
}
