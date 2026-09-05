import countries from 'world-countries';
import type { Location } from './ranking';

const slug = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const continentFor = (region: string, subregion: string) => {
  if (region === 'Antarctic') return 'antarctica';
  if (region !== 'Americas') return slug(region || 'Antarctica');
  return subregion === 'South America' ? 'south-america' : 'north-america';
};

const regionName = (subregion: string, continent: string) => {
  if (subregion === 'Western Asia') return 'Middle East';
  if (subregion === 'Eastern Asia') return 'Far East';
  if (subregion === 'Northern America') return 'North America';
  if (!subregion) return continent === 'antarctica' ? 'Antarctica' : 'Other';
  return subregion;
};

const countryId = (cca3: string) =>
  ({
    ARE: 'uae',
    GBR: 'uk',
    USA: 'usa',
    SAU: 'saudi-arabia',
    QAT: 'qatar',
    KWT: 'kuwait',
    IND: 'india',
  })[cca3] || cca3.toLowerCase();

const extras: Array<[string, string, string]> = [
  ['dubai', 'Dubai', 'uae'],
  ['abu-dhabi', 'Abu Dhabi', 'uae'],
  ['sharjah', 'Sharjah', 'uae'],
  ['riyadh', 'Riyadh', 'saudi-arabia'],
  ['jeddah', 'Jeddah', 'saudi-arabia'],
  ['doha', 'Doha', 'qatar'],
  ['kuwait-city', 'Kuwait City', 'kuwait'],
  ['mumbai', 'Mumbai', 'india'],
  ['los-angeles', 'Los Angeles', 'usa'],
  ['new-york-city', 'New York City', 'usa'],
  ['san-francisco', 'San Francisco', 'usa'],
  ['toronto', 'Toronto', 'can'],
  ['vancouver', 'Vancouver', 'can'],
  ['sao-paulo', 'São Paulo', 'bra'],
  ['rio-de-janeiro', 'Rio de Janeiro', 'bra'],
  ['sydney', 'Sydney', 'aus'],
  ['melbourne', 'Melbourne', 'aus'],
  ['auckland', 'Auckland', 'nzl'],
  ['shanghai', 'Shanghai', 'chn'],
  ['hong-kong', 'Hong Kong', 'hkg'],
  ['osaka', 'Osaka', 'jpn'],
  ['singapore', 'Singapore', 'sgp'],
  ['istanbul', 'Istanbul', 'tur'],
  ['paris', 'Paris', 'fra'],
  ['berlin', 'Berlin', 'deu'],
  ['madrid', 'Madrid', 'esp'],
  ['barcelona', 'Barcelona', 'esp'],
  ['milan', 'Milan', 'ita'],
  ['amsterdam', 'Amsterdam', 'nld'],
  ['london', 'London', 'uk'],
  ['manchester', 'Manchester', 'uk'],
  ['cairo', 'Cairo', 'egy'],
  ['lagos', 'Lagos', 'nga'],
  ['cape-town', 'Cape Town', 'zaf'],
  ['johannesburg', 'Johannesburg', 'zaf'],
];

export function geographyCatalog(): Location[] {
  const result = new Map<string, Location>();
  const add = (id: string, name: string, type: string, parent_id: string | null) =>
    result.set(id, { id, name, slug: id, type, parent_id });

  add('world', 'World', 'world', null);
  for (const [id, name] of [
    ['africa', 'Africa'],
    ['antarctica', 'Antarctica'],
    ['asia', 'Asia'],
    ['europe', 'Europe'],
    ['north-america', 'North America'],
    ['oceania', 'Oceania'],
    ['south-america', 'South America'],
  ]) add(id, name, 'continent', 'world');

  for (const country of countries) {
    const continent = continentFor(country.region, country.subregion);
    const region = regionName(country.subregion, continent);
    const regionId = region === 'Middle East' ? 'middle-east' : `region-${slug(region)}`;
    add(regionId, region, 'region', continent);
    const id = countryId(country.cca3);
    add(id, country.name.common, 'country', regionId);
    for (const capital of country.capital || []) {
      const cityId = `city-${id}-${slug(capital)}`;
      add(cityId, capital, 'city', id);
    }
  }

  for (const [id, name, parent] of extras) {
    for (const [existingId, location] of result) {
      if (
        location.type === 'city' &&
        location.parent_id === parent &&
        location.name.localeCompare(name, undefined, { sensitivity: 'base' }) === 0
      ) {
        result.delete(existingId);
      }
    }
    add(id, name, 'city', parent);
  }
  return [...result.values()];
}
