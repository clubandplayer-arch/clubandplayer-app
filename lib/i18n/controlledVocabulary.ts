import type { VocabularyMessageKey } from './messages/vocabulary/it';

export type VocabularyTranslator = (key: VocabularyMessageKey) => string;

const normalize = (value: string) => value.trim().toLocaleLowerCase('it').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

const accountKeys: Record<string, VocabularyMessageKey> = {
  athlete: 'vocabulary.account.player', player: 'vocabulary.account.player', giocatore: 'vocabulary.account.player',
  club: 'vocabulary.account.club', squadra: 'vocabulary.account.club', staff: 'vocabulary.account.staff',
  fan: 'vocabulary.account.fan', tifoso: 'vocabulary.account.fan', institution: 'vocabulary.account.institution', ente: 'vocabulary.account.institution',
};

const sportKeys: Record<string, VocabularyMessageKey> = {
  calcio: 'vocabulary.sport.football', football: 'vocabulary.sport.football', soccer: 'vocabulary.sport.football', futbol: 'vocabulary.sport.football',
  'calcio a 8': 'vocabulary.sport.eightAsideFootball', 'eight aside football': 'vocabulary.sport.eightAsideFootball',
  futsal: 'vocabulary.sport.futsal', volley: 'vocabulary.sport.volleyball', volleyball: 'vocabulary.sport.volleyball', pallavolo: 'vocabulary.sport.volleyball',
  basket: 'vocabulary.sport.basketball', basketball: 'vocabulary.sport.basketball', pallacanestro: 'vocabulary.sport.basketball',
  pallanuoto: 'vocabulary.sport.waterPolo', 'water polo': 'vocabulary.sport.waterPolo', pallamano: 'vocabulary.sport.handball', handball: 'vocabulary.sport.handball',
  rugby: 'vocabulary.sport.rugby', 'hockey su prato': 'vocabulary.sport.fieldHockey', 'field hockey': 'vocabulary.sport.fieldHockey',
  'hockey su ghiaccio': 'vocabulary.sport.iceHockey', 'ice hockey': 'vocabulary.sport.iceHockey', baseball: 'vocabulary.sport.baseball', softball: 'vocabulary.sport.softball',
  lacrosse: 'vocabulary.sport.lacrosse', 'football americano': 'vocabulary.sport.americanFootball', 'american football': 'vocabulary.sport.americanFootball',
};

const genderKeys: Record<string, VocabularyMessageKey> = {
  uomo: 'vocabulary.gender.male', uomini: 'vocabulary.gender.male', male: 'vocabulary.gender.male', maschile: 'vocabulary.gender.male',
  donna: 'vocabulary.gender.female', donne: 'vocabulary.gender.female', female: 'vocabulary.gender.female', femminile: 'vocabulary.gender.female',
  mixed: 'vocabulary.gender.mixed', misto: 'vocabulary.gender.mixed', coed: 'vocabulary.gender.mixed',
};

const categoryKeys: Record<string, VocabularyMessageKey> = {
  'prima categoria': 'vocabulary.category.first', 'seconda categoria': 'vocabulary.category.second', 'terza categoria': 'vocabulary.category.third',
  amatoriale: 'vocabulary.category.amateur', giovanili: 'vocabulary.category.youth', altro: 'vocabulary.category.other',
};

const roleKeys: Record<string, VocabularyMessageKey> = {
  goalkeeper:'vocabulary.role.goalkeeper', portiere:'vocabulary.role.goalkeeper', defender:'vocabulary.role.defender', difensore:'vocabulary.role.defender',
  'centre back':'vocabulary.role.centreBack','center back':'vocabulary.role.centreBack','difensore centrale':'vocabulary.role.centreBack',
  'terzino esterno difensivo':'vocabulary.role.fullBack', terzino:'vocabulary.role.fullBack', 'full back':'vocabulary.role.fullBack',
  mediano:'vocabulary.role.defensiveMidfielder','defensive midfielder':'vocabulary.role.defensiveMidfielder', midfielder:'vocabulary.role.midfielder', centrocampista:'vocabulary.role.midfielder',
  'central midfielder':'vocabulary.role.centralMidfielder','centrocampista centrale':'vocabulary.role.centralMidfielder', trequartista:'vocabulary.role.attackingMidfielder','attacking midfielder':'vocabulary.role.attackingMidfielder',
  winger:'vocabulary.role.winger', esterno:'vocabulary.role.winger', ala:'vocabulary.role.winger','esterno offensivo ala':'vocabulary.role.winger','esterno alto':'vocabulary.role.winger',
  forward:'vocabulary.role.forward', attaccante:'vocabulary.role.forward','seconda punta':'vocabulary.role.secondStriker','second striker':'vocabulary.role.secondStriker',
  'punta centrale':'vocabulary.role.centreForward','centre forward':'vocabulary.role.centreForward','center forward':'vocabulary.role.centreForward', regista:'vocabulary.role.playmaker', playmaker:'vocabulary.role.playmaker',
  fixo:'vocabulary.role.fixo', pivot:'vocabulary.role.pivot', universale:'vocabulary.role.universal', universal:'vocabulary.role.universal',
  palleggiatore:'vocabulary.role.setter', setter:'vocabulary.role.setter', opposto:'vocabulary.role.opposite','opposite hitter':'vocabulary.role.opposite', schiacciatore:'vocabulary.role.outsideHitter','outside hitter':'vocabulary.role.outsideHitter', centrale:'vocabulary.role.middleBlocker','middle blocker':'vocabulary.role.middleBlocker', libero:'vocabulary.role.libero',
  allenatore:'vocabulary.role.coach', coach:'vocabulary.role.coach', scout:'vocabulary.role.scout','direttore sportivo':'vocabulary.role.sportingDirector','sporting director':'vocabulary.role.sportingDirector',
};

const statusKeys: Record<string, VocabularyMessageKey> = {
  open:'vocabulary.status.open', aperto:'vocabulary.status.open', closed:'vocabulary.status.closed', chiuso:'vocabulary.status.closed', draft:'vocabulary.status.draft', bozza:'vocabulary.status.draft', archived:'vocabulary.status.archived', archiviato:'vocabulary.status.archived',
  pending:'vocabulary.status.pending','in valutazione':'vocabulary.status.inReview','in review':'vocabulary.status.inReview', reviewing:'vocabulary.status.inReview', submitted:'vocabulary.status.submitted', inviata:'vocabulary.status.submitted', candidato:'vocabulary.status.submitted', seen:'vocabulary.status.seen', visualizzata:'vocabulary.status.seen', accepted:'vocabulary.status.accepted', accettata:'vocabulary.status.accepted', rejected:'vocabulary.status.rejected', rifiutata:'vocabulary.status.rejected', withdrawn:'vocabulary.status.withdrawn', ritirata:'vocabulary.status.withdrawn', follow:'vocabulary.status.follow', segui:'vocabulary.status.follow', following:'vocabulary.status.following', seguo:'vocabulary.status.following', active:'vocabulary.status.active', attivo:'vocabulary.status.active', suspended:'vocabulary.status.suspended', sospeso:'vocabulary.status.suspended',
};

function display(value: string | null | undefined, keys: Record<string, VocabularyMessageKey>, t: VocabularyTranslator): string | null {
  if (value == null || !value.trim()) return value ?? null;
  const key = keys[normalize(value)];
  return key ? t(key) : value;
}

export const localizeAccountType = (value: string | null | undefined, t: VocabularyTranslator) => display(value, accountKeys, t);
export const localizeSport = (value: string | null | undefined, t: VocabularyTranslator) => display(value, sportKeys, t);
export const localizeSportRole = (value: string | null | undefined, t: VocabularyTranslator) => display(value, roleKeys, t);
export const localizeOpportunityGender = (value: string | null | undefined, t: VocabularyTranslator) => display(value, genderKeys, t);
export const localizeOpportunityCategory = (value: string | null | undefined, t: VocabularyTranslator) => display(value, categoryKeys, t);
export const localizeControlledStatus = (value: string | null | undefined, t: VocabularyTranslator) => display(value, statusKeys, t);
