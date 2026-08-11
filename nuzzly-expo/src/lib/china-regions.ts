// Singapore regions and planning areas
// Replaces former China regions data for Singapore market

export const sgRegions: [string, [string, ...string[]][]][] = [
  ['Central Region', [
    ['Bukit Merah', 'Telok Blangah', 'Tiong Bahru', 'Queenstown', 'Alexandra', 'Henderson', 'Redhill', 'Jalan Bukit Merah'],
    ['Bukit Timah', ' Farrer Road', 'Holland Village', 'Watten Estate', 'Turk Club'],
    ['Downtown Core', 'Raffles Place', 'Marina Bay', 'Shenton Way', 'Collyer Quay'],
    ['Kallang', 'Kallang Bahru', 'Lavender', 'Bendemeer', 'Boon Keng', 'Sims Avenue'],
    ['Marina Parade', 'Marine Parade', 'Katong', 'Tanjong Rhu', 'Meyer Road'],
    ['Newton', 'Newton', 'Scotts Road', 'Balmoral'],
    ['Orchard', 'Orchard Road', 'Cairnhill', 'River Valley', 'Leonie Hill'],
    ['Outram', 'Outram', 'Chinatown', 'Pearl\'s Hill', 'Tanjong Pagar'],
    ['Queenstown', 'Queenstown', 'Commonwealth', 'Tanglin Halt', 'Margaret Drive'],
    ['River Valley', 'River Valley', 'Killiney', 'Oxley'],
    ['Rochor', 'Bugis', 'Rochor', 'Little India', 'Farrer Park', 'Kampong Glam'],
    ['Singapore River', 'Boat Quay', 'Clarke Quay', 'Robertson Quay'],
    ['Southern Islands', 'Sentosa', 'Brani Island', 'Pulau Bukom'],
    ['Tanglin', 'Tanglin', 'Nassim', 'Chatsworth'],
    ['Toa Payoh', 'Toa Payoh', 'Lorong', 'Pei Chun'],
  ]],
  ['East Region', [
    ['Bedok', 'Bedok', 'Chai Chee', 'Kaki Bukit', 'Kembangan', 'Siglap'],
    ['Changi', 'Changi Village', 'Changi Bay', 'Changi Airport'],
    ['Paya Lebar', 'Paya Lebar', 'Eunos', 'Ubi', 'MacPherson'],
    ['Pasir Ris', 'Pasir Ris', 'Pasir Ris Park', 'Loyang'],
    ['Tampines', 'Tampines', 'Tampines East', 'Tampines North', 'Tampines West', 'Simei'],
  ]],
  ['North Region', [
    ['Admiralty', 'Admiralty', 'Woodlands Drive'],
    ['Kranji', 'Kranji', 'Kranji Way'],
    ['Lim Chu Kang', 'Lim Chu Kang', 'Neo Tiew'],
    ['Mandai', 'Mandai', 'Mandai Lake Road'],
    ['Marsiling', 'Marsiling', 'Admiralty Road'],
    ['Sembawang', 'Sembawang', 'Sembawang Springs', 'Wellington Circle'],
    ['Simpang', 'Simpang', 'Simpang Place'],
    ['Sungei Kadut', 'Sungei Kadut', 'Kranji Way'],
    ['Woodlands', 'Woodlands', 'Admiralty', 'Marsiling', 'Woodgrove'],
    ['Yishun', 'Yishun', 'Yishun Ring Road', 'Chong Pang', 'Khatib'],
  ]],
  ['North-East Region', [
    ['Ang Mo Kio', 'Ang Mo Kio', 'Cheng San', 'Yio Chu Kang', 'Kebun Baru'],
    ['Hougang', 'Hougang', 'Kangkar', 'Buangkok', 'Defu'],
    ['Punggol', 'Punggol', 'Punggol Point', 'Matilda', 'Waterway'],
    ['Seletar', 'Seletar', 'Seletar Aerospace Park', 'Fernvale'],
    ['Sengkang', 'Sengkang', 'Rivervale', 'Compassvale', 'Anchorvale', 'Fernvale'],
    ['Serangoon', 'Serangoon', 'Serangoon Gardens', 'Serangoon North', 'Lorong Chuan'],
  ]],
  ['West Region', [
    ['Boon Lay', 'Boon Lay', 'Taman Jurong', 'Lakeside'],
    ['Bukit Batok', 'Bukit Batok', 'Bukit Gombak', 'Hillview'],
    ['Bukit Panjang', 'Bukit Panjang', 'Bangkit', 'Fajar', 'Senja'],
    ['Choa Chu Kang', 'Choa Chu Kang', 'Yew Tee', 'Teck Whye'],
    ['Clementi', 'Clementi', 'West Coast', 'Clementi Park', 'Sunset Way'],
    ['Jurong East', 'Jurong East', 'Jurong Gateway', 'Toh Guan', 'CleanTech Park'],
    ['Jurong West', 'Jurong West', 'Boon Lay', 'Taman Jurong', 'Pioneer'],
    ['Pioneer', 'Pioneer', 'Joo Koon', 'Benoi'],
    ['Tengah', 'Tengah', 'Plantation District', 'Garden District', 'Park District'],
    ['Tuas', 'Tuas', 'Tuas Bay', 'Tuas South'],
    ['Western Islands', 'Jurong Island', 'Pulau Bukom', 'Pulau Merlimau'],
    ['Western Water Catchment', 'Sarimbun', 'Lim Chu Kang', 'Tengah Reservoir'],
  ]],
];

// Backward-compatible alias
export const chinaRegions = sgRegions;

export function getProvinces(): string[] {
  return sgRegions.map((p) => p[0]);
}

export function getCities(provinceName: string): string[] {
  const province = sgRegions.find((p) => p[0] === provinceName);
  if (!province) return [];
  return province[1].map((city) => city[0]);
}

export function getDistricts(provinceName: string, cityName: string): string[] {
  const province = sgRegions.find((p) => p[0] === provinceName);
  if (!province) return [];
  const city = province[1].find((c) => c[0] === cityName);
  if (!city) return [];
  return city.slice(1) as string[];
}
