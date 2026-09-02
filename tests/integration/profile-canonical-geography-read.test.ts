import assert from 'node:assert/strict';
import test from 'node:test';

import { getProfileGeography, type ProfileGeographySnapshot } from '../../lib/geo/profileGeography';

test('profile geography read orchestration is repository-based and canonical-first without writes', async () => {
  let loads = 0;
  const data: ProfileGeographySnapshot = {
    residenceCountryId: 'country-fr', residenceCountryIso2: 'FR', residenceGeoAreaId: 'paris',
    residenceArea: { id: 'paris', countryId: 'country-fr', countryIso2: 'FR', parentId: 'department-75', officialName: 'Paris', areaType: 'COMMUNE', level: 3 },
    residenceAncestors: [{ id: 'department-75', countryId: 'country-fr', countryIso2: 'FR', parentId: null, officialName: 'Paris', areaType: 'DEPARTMENT', level: 2 }],
    openToRelocation: true, countryInterests: [], geoAreaInterests: [], legacy: { country: 'Legacy France', city: 'Legacy Paris' }, italyLegacyMappings: [],
  };
  const result = await getProfileGeography({ load: async () => { loads += 1; return data; } }, 'profile-1');
  assert.equal(loads, 1); assert.equal(result.residence.source, 'canonical'); assert.equal(result.residence.areaId, 'paris');
  assert.deepEqual(result.residence.ancestors.map((area) => area.id), ['department-75']);
  assert.equal(result.residence.legacyText.city, 'Legacy Paris');
});
