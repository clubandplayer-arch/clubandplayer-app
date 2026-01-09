'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const SLOT_OPTIONS = ['left_top', 'left_bottom', 'sidebar_top', 'sidebar_bottom', 'feed_infeed'] as const;

type CampaignRow = {
  id: string;
  name: string;
  status: string;
  priority: number;
  start_at: string | null;
  end_at: string | null;
  created_at: string | null;
};

type TargetRow = {
  id: string;
  campaign_id: string;
  country: string | null;
  region: string | null;
  province: string | null;
  city: string | null;
  sport: string | null;
  audience: string | null;
  device: string | null;
  created_at: string | null;
};

type CreativeRow = {
  id: string;
  campaign_id: string;
  slot: string;
  title: string | null;
  body: string | null;
  image_url: string | null;
  target_url: string | null;
  is_active: boolean | null;
  created_at: string | null;
};

const toDateInput = (value?: string | null) => {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
};

const toIsoDate = (value: string) => (value ? `${value}T00:00:00Z` : '');

const dateMinusDays = (days: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
};

export default function AdminAdsPage() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [targets, setTargets] = useState<TargetRow[]>([]);
  const [creatives, setCreatives] = useState<CreativeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [newCampaignName, setNewCampaignName] = useState('');
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    status: 'paused',
    priority: 0,
    start_at: '',
    end_at: '',
  });

  const [targetForm, setTargetForm] = useState({
    country: 'IT',
    region: '',
    province: '',
    city: '',
    sport: '',
    audience: 'all',
    device: 'all',
  });

  const [creativeForm, setCreativeForm] = useState({
    slot: 'sidebar_top',
    title: '',
    body: '',
    image_url: '',
    target_url: '',
  });

  const [reportFrom, setReportFrom] = useState(dateMinusDays(30));
  const [reportTo, setReportTo] = useState(new Date().toISOString().slice(0, 10));

  const selectedCampaign = useMemo(
    () => campaigns.find((c) => c.id === selectedId) ?? null,
    [campaigns, selectedId],
  );

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch('/api/admin/ads/campaigns', { cache: 'no-store' });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error ?? 'Errore nel caricamento campagne');
      setCampaigns([]);
      setLoading(false);
      return;
    }
    const j = await res.json().catch(() => ({}));
    const data = (j?.data as CampaignRow[]) ?? [];
    setCampaigns(data);
    if (data.length && !selectedId) setSelectedId(data[0].id);
    setLoading(false);
  }, [selectedId]);

  const loadDetails = useCallback(async (campaignId: string) => {
    if (!campaignId) return;
    setDetailLoading(true);
    const [targetsRes, creativesRes] = await Promise.all([
      fetch(`/api/admin/ads/targets?campaign_id=${campaignId}`, { cache: 'no-store' }),
      fetch(`/api/admin/ads/creatives?campaign_id=${campaignId}`, { cache: 'no-store' }),
    ]);

    if (targetsRes.ok) {
      const j = await targetsRes.json().catch(() => ({}));
      setTargets((j?.data as TargetRow[]) ?? []);
    } else {
      setTargets([]);
    }

    if (creativesRes.ok) {
      const j = await creativesRes.json().catch(() => ({}));
      setCreatives((j?.data as CreativeRow[]) ?? []);
    } else {
      setCreatives([]);
    }

    setDetailLoading(false);
  }, []);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    if (!selectedCampaign) return;
    setCampaignForm({
      name: selectedCampaign.name,
      status: selectedCampaign.status ?? 'paused',
      priority: selectedCampaign.priority ?? 0,
      start_at: toDateInput(selectedCampaign.start_at),
      end_at: toDateInput(selectedCampaign.end_at),
    });
    void loadDetails(selectedCampaign.id);
  }, [loadDetails, selectedCampaign]);

  const createCampaign = async () => {
    setMessage(null);
    setError(null);
    const name = newCampaignName.trim();
    if (!name) {
      setError('Inserisci un nome campagna');
      return;
    }
    const res = await fetch('/api/admin/ads/campaigns', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error ?? 'Errore durante la creazione');
      return;
    }
    const j = await res.json().catch(() => ({}));
    const created = j?.data as CampaignRow | undefined;
    setNewCampaignName('');
    await loadCampaigns();
    if (created?.id) setSelectedId(created.id);
  };

  const updateCampaign = async () => {
    if (!selectedCampaign) return;
    setMessage(null);
    setError(null);
    const res = await fetch(`/api/admin/ads/campaigns/${selectedCampaign.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: campaignForm.name.trim(),
        status: campaignForm.status,
        priority: Number(campaignForm.priority),
        start_at: campaignForm.start_at ? toIsoDate(campaignForm.start_at) : null,
        end_at: campaignForm.end_at ? toIsoDate(campaignForm.end_at) : null,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error ?? 'Errore durante il salvataggio');
      return;
    }
    setMessage('Campagna aggiornata');
    await loadCampaigns();
  };

  const addTarget = async () => {
    if (!selectedCampaign) return;
    setMessage(null);
    setError(null);
    const res = await fetch('/api/admin/ads/targets', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        campaign_id: selectedCampaign.id,
        country: targetForm.country,
        region: targetForm.region,
        province: targetForm.province,
        city: targetForm.city,
        sport: targetForm.sport,
        audience: targetForm.audience,
        device: targetForm.device,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error ?? 'Errore durante aggiunta target');
      return;
    }
    setTargetForm({
      country: 'IT',
      region: '',
      province: '',
      city: '',
      sport: '',
      audience: 'all',
      device: 'all',
    });
    await loadDetails(selectedCampaign.id);
  };

  const removeTarget = async (id: string) => {
    if (!selectedCampaign) return;
    setMessage(null);
    setError(null);
    const res = await fetch(`/api/admin/ads/targets/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error ?? 'Errore durante eliminazione target');
      return;
    }
    await loadDetails(selectedCampaign.id);
  };

  const addCreative = async () => {
    if (!selectedCampaign) return;
    setMessage(null);
    setError(null);
    if (!creativeForm.target_url.trim()) {
      setError('Inserisci target URL');
      return;
    }
    const res = await fetch('/api/admin/ads/creatives', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        campaign_id: selectedCampaign.id,
        slot: creativeForm.slot,
        title: creativeForm.title,
        body: creativeForm.body,
        image_url: creativeForm.image_url,
        target_url: creativeForm.target_url,
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error ?? 'Errore durante aggiunta creative');
      return;
    }
    setCreativeForm({
      slot: 'sidebar_top',
      title: '',
      body: '',
      image_url: '',
      target_url: '',
    });
    await loadDetails(selectedCampaign.id);
  };

  const removeCreative = async (id: string) => {
    if (!selectedCampaign) return;
    setMessage(null);
    setError(null);
    const res = await fetch(`/api/admin/ads/creatives/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j?.error ?? 'Errore durante eliminazione creative');
      return;
    }
    await loadDetails(selectedCampaign.id);
  };

  const downloadCsv = () => {
    if (!selectedCampaign) return;
    const url = `/api/admin/ads/reports?campaign_id=${selectedCampaign.id}&from=${reportFrom}&to=${reportTo}&format=csv`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <main className="container mx-auto max-w-6xl px-4 py-8">
      <h1 className="heading-h2 mb-4 text-2xl font-bold">Inventory ads</h1>
      <p className="mb-6 text-sm text-neutral-600">
        Gestisci campagne, target e creatives. Solo admin autorizzati possono accedere a questa pagina.
      </p>

      {error && <div className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message && <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_2fr]">
        <section className="rounded-xl border bg-white p-4">
          <h2 className="mb-3 text-base font-semibold">Campagne</h2>
          <div className="mb-4 flex flex-col gap-2">
            <input
              className="rounded-md border px-3 py-2 text-sm"
              placeholder="Nome nuova campagna"
              value={newCampaignName}
              onChange={(e) => setNewCampaignName(e.target.value)}
            />
            <button
              onClick={() => void createCampaign()}
              className="rounded-md bg-black px-3 py-2 text-sm font-semibold text-white"
            >
              Crea campagna
            </button>
          </div>
          {loading ? (
            <div className="text-sm text-neutral-600">Caricamento…</div>
          ) : campaigns.length === 0 ? (
            <div className="text-sm text-neutral-600">Nessuna campagna trovata.</div>
          ) : (
            <ul className="space-y-2">
              {campaigns.map((campaign) => (
                <li key={campaign.id}>
                  <button
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm ${
                      selectedId === campaign.id ? 'border-black bg-neutral-50' : 'border-neutral-200'
                    }`}
                    onClick={() => setSelectedId(campaign.id)}
                  >
                    <span>
                      <span className="block font-semibold">{campaign.name}</span>
                      <span className="text-xs text-neutral-500">{campaign.status} · priority {campaign.priority}</span>
                    </span>
                    <span className="text-xs text-neutral-400">{campaign.created_at?.slice(0, 10) ?? '—'}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border bg-white p-4">
          {!selectedCampaign ? (
            <div className="text-sm text-neutral-600">Seleziona una campagna per vedere i dettagli.</div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="mb-3 text-base font-semibold">Dettaglio campagna</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm">
                    Nome
                    <input
                      className="mt-1 w-full rounded-md border px-3 py-2"
                      value={campaignForm.name}
                      onChange={(e) => setCampaignForm((prev) => ({ ...prev, name: e.target.value }))}
                    />
                  </label>
                  <label className="text-sm">
                    Status
                    <select
                      className="mt-1 w-full rounded-md border px-3 py-2"
                      value={campaignForm.status}
                      onChange={(e) => setCampaignForm((prev) => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="paused">Paused</option>
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                      <option value="archived">Archived</option>
                    </select>
                  </label>
                  <label className="text-sm">
                    Priority
                    <input
                      type="number"
                      className="mt-1 w-full rounded-md border px-3 py-2"
                      value={campaignForm.priority}
                      onChange={(e) => setCampaignForm((prev) => ({ ...prev, priority: Number(e.target.value) }))}
                    />
                  </label>
                  <label className="text-sm">
                    Start
                    <input
                      type="date"
                      className="mt-1 w-full rounded-md border px-3 py-2"
                      value={campaignForm.start_at}
                      onChange={(e) => setCampaignForm((prev) => ({ ...prev, start_at: e.target.value }))}
                    />
                  </label>
                  <label className="text-sm">
                    End
                    <input
                      type="date"
                      className="mt-1 w-full rounded-md border px-3 py-2"
                      value={campaignForm.end_at}
                      onChange={(e) => setCampaignForm((prev) => ({ ...prev, end_at: e.target.value }))}
                    />
                  </label>
                </div>
                <button
                  onClick={() => void updateCampaign()}
                  className="mt-3 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Salva
                </button>
              </div>

              <div>
                <h3 className="mb-3 text-base font-semibold">Targets</h3>
                {detailLoading ? (
                  <div className="text-sm text-neutral-600">Caricamento target…</div>
                ) : targets.length === 0 ? (
                  <div className="text-sm text-neutral-600">Nessun target per questa campagna.</div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="min-w-full text-xs">
                      <thead className="bg-neutral-50 text-left">
                        <tr>
                          <th className="px-3 py-2">Country</th>
                          <th className="px-3 py-2">Region</th>
                          <th className="px-3 py-2">Province</th>
                          <th className="px-3 py-2">City</th>
                          <th className="px-3 py-2">Sport</th>
                          <th className="px-3 py-2">Audience</th>
                          <th className="px-3 py-2">Device</th>
                          <th className="px-3 py-2">Azioni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {targets.map((target) => (
                          <tr key={target.id} className="border-t">
                            <td className="px-3 py-2">{target.country ?? '—'}</td>
                            <td className="px-3 py-2">{target.region ?? '—'}</td>
                            <td className="px-3 py-2">{target.province ?? '—'}</td>
                            <td className="px-3 py-2">{target.city ?? '—'}</td>
                            <td className="px-3 py-2">{target.sport ?? '—'}</td>
                            <td className="px-3 py-2">{target.audience ?? '—'}</td>
                            <td className="px-3 py-2">{target.device ?? '—'}</td>
                            <td className="px-3 py-2">
                              <button
                                onClick={() => void removeTarget(target.id)}
                                className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700"
                              >
                                Elimina
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="mt-3 grid gap-2 md:grid-cols-4">
                  <input
                    className="rounded-md border px-3 py-2 text-xs"
                    placeholder="Country"
                    value={targetForm.country}
                    onChange={(e) => setTargetForm((prev) => ({ ...prev, country: e.target.value }))}
                  />
                  <input
                    className="rounded-md border px-3 py-2 text-xs"
                    placeholder="Region"
                    value={targetForm.region}
                    onChange={(e) => setTargetForm((prev) => ({ ...prev, region: e.target.value }))}
                  />
                  <input
                    className="rounded-md border px-3 py-2 text-xs"
                    placeholder="Province"
                    value={targetForm.province}
                    onChange={(e) => setTargetForm((prev) => ({ ...prev, province: e.target.value }))}
                  />
                  <input
                    className="rounded-md border px-3 py-2 text-xs"
                    placeholder="City"
                    value={targetForm.city}
                    onChange={(e) => setTargetForm((prev) => ({ ...prev, city: e.target.value }))}
                  />
                  <input
                    className="rounded-md border px-3 py-2 text-xs"
                    placeholder="Sport"
                    value={targetForm.sport}
                    onChange={(e) => setTargetForm((prev) => ({ ...prev, sport: e.target.value }))}
                  />
                  <input
                    className="rounded-md border px-3 py-2 text-xs"
                    placeholder="Audience"
                    value={targetForm.audience}
                    onChange={(e) => setTargetForm((prev) => ({ ...prev, audience: e.target.value }))}
                  />
                  <input
                    className="rounded-md border px-3 py-2 text-xs"
                    placeholder="Device"
                    value={targetForm.device}
                    onChange={(e) => setTargetForm((prev) => ({ ...prev, device: e.target.value }))}
                  />
                  <button
                    onClick={() => void addTarget()}
                    className="rounded-md bg-neutral-900 px-3 py-2 text-xs font-semibold text-white"
                  >
                    Aggiungi target
                  </button>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-base font-semibold">Creatives</h3>
                {detailLoading ? (
                  <div className="text-sm text-neutral-600">Caricamento creatives…</div>
                ) : creatives.length === 0 ? (
                  <div className="text-sm text-neutral-600">Nessuna creative per questa campagna.</div>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="min-w-full text-xs">
                      <thead className="bg-neutral-50 text-left">
                        <tr>
                          <th className="px-3 py-2">Slot</th>
                          <th className="px-3 py-2">Titolo</th>
                          <th className="px-3 py-2">Body</th>
                          <th className="px-3 py-2">Target URL</th>
                          <th className="px-3 py-2">Azioni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {creatives.map((creative) => (
                          <tr key={creative.id} className="border-t">
                            <td className="px-3 py-2">{creative.slot}</td>
                            <td className="px-3 py-2">{creative.title ?? '—'}</td>
                            <td className="px-3 py-2">{creative.body ?? '—'}</td>
                            <td className="px-3 py-2">
                              {creative.target_url ? (
                                <a className="text-blue-600 underline" href={creative.target_url} target="_blank" rel="noreferrer">
                                  {creative.target_url}
                                </a>
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <button
                                onClick={() => void removeCreative(creative.id)}
                                className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700"
                              >
                                Elimina
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <select
                    className="rounded-md border px-3 py-2 text-xs"
                    value={creativeForm.slot}
                    onChange={(e) => setCreativeForm((prev) => ({ ...prev, slot: e.target.value }))}
                  >
                    {SLOT_OPTIONS.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                  </select>
                  <input
                    className="rounded-md border px-3 py-2 text-xs"
                    placeholder="Titolo"
                    value={creativeForm.title}
                    onChange={(e) => setCreativeForm((prev) => ({ ...prev, title: e.target.value }))}
                  />
                  <input
                    className="rounded-md border px-3 py-2 text-xs"
                    placeholder="Body"
                    value={creativeForm.body}
                    onChange={(e) => setCreativeForm((prev) => ({ ...prev, body: e.target.value }))}
                  />
                  <input
                    className="rounded-md border px-3 py-2 text-xs"
                    placeholder="Image URL"
                    value={creativeForm.image_url}
                    onChange={(e) => setCreativeForm((prev) => ({ ...prev, image_url: e.target.value }))}
                  />
                  <input
                    className="rounded-md border px-3 py-2 text-xs"
                    placeholder="Target URL"
                    value={creativeForm.target_url}
                    onChange={(e) => setCreativeForm((prev) => ({ ...prev, target_url: e.target.value }))}
                  />
                  <button
                    onClick={() => void addCreative()}
                    className="rounded-md bg-neutral-900 px-3 py-2 text-xs font-semibold text-white"
                  >
                    Aggiungi creative
                  </button>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-base font-semibold">Report CSV</h3>
                <div className="flex flex-wrap items-end gap-3">
                  <label className="text-xs">
                    From
                    <input
                      type="date"
                      className="mt-1 block rounded-md border px-3 py-2 text-xs"
                      value={reportFrom}
                      onChange={(e) => setReportFrom(e.target.value)}
                    />
                  </label>
                  <label className="text-xs">
                    To
                    <input
                      type="date"
                      className="mt-1 block rounded-md border px-3 py-2 text-xs"
                      value={reportTo}
                      onChange={(e) => setReportTo(e.target.value)}
                    />
                  </label>
                  <button
                    onClick={downloadCsv}
                    className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
                  >
                    Scarica CSV
                  </button>
                </div>
                <p className="mt-2 text-xs text-neutral-500">
                  Il CSV viene generato usando /api/admin/ads/reports con format=csv.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
