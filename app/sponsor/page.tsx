"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { fetchLocationChildren } from "@/lib/geo/location";
import { useI18n } from "@/components/i18n/I18nProvider";
import type { MessageKey } from "@/lib/i18n/messages";

type PackageId = "starter" | "growth" | "performance";
type DurationId = 30 | 60 | 90;
type LocationOptionString = { id: string; name: string };

const BRAND_BLUE = "#036f9a";

const PACKAGES: Record<
  PackageId,
  {
    label: string;
    basePriceNational30d: number;
    placements: string[];
    includes: string[];
  }
> = {
  starter: {
    label: "Starter",
    basePriceNational30d: 149,
    placements: ["sponsor.starterPlacement1", "sponsor.starterPlacement2"],
    includes: ["sponsor.baseReport"],
  },
  growth: {
    label: "Growth",
    basePriceNational30d: 249,
    placements: ["sponsor.growthPlacement1", "sponsor.growthPlacement2"],
    includes: ["sponsor.weeklyReport", "sponsor.creativeChange"],
  },
  performance: {
    label: "Performance",
    basePriceNational30d: 399,
    placements: ["sponsor.performancePlacement"],
    includes: ["sponsor.weeklyReport", "sponsor.optimization"],
  },
};

const DURATION_MULTIPLIER: Record<DurationId, number> = {
  30: 1,
  60: 1.75,
  90: 2.45,
};

const GEO_MULTIPLIER = {
  national: 1,
  regional: 0.8,
  provincial: 0.65,
  city: 0.58,
} as const;

type GeoLevel = keyof typeof GEO_MULTIPLIER;

function getGeoLevel(params: { regionId: string; provinceId: string; cityId: string }): GeoLevel {
  if (params.cityId) return "city";
  if (params.provinceId) return "provincial";
  if (params.regionId) return "regional";
  return "national";
}

function euro(amount: number, locale: string) {
  const rounded = Math.round(amount);
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(rounded);
}

function buildLeadSummary(params: {
  pkg: PackageId;
  regionName: string;
  provinceName: string;
  cityName: string;
  targetLabel: string;
  duration: DurationId;
  exclusive: boolean;
  estimate: number;
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
  locale: string;
}) {
  const {
    pkg,
    regionName,
    provinceName,
    cityName,
    targetLabel,
    duration,
    exclusive,
    estimate, t, locale,
  } = params;

  const lines = [
    `=== ${t('sponsor.requestHeading')} ===`,
    `${t('sponsor.package')}: ${PACKAGES[pkg].label}`,
    `${t('sponsor.placements')}: ${PACKAGES[pkg].placements.map((key) => t(key as MessageKey)).join(" • ")}`,
    `${t('sponsor.target')}: ${targetLabel}`,
    `${t('sponsor.region')}: ${regionName || "-"}`,
    `${t('sponsor.province')}: ${provinceName || "-"}`,
    `${t('sponsor.city')}: ${cityName || "-"}`,
    `${t('sponsor.duration')}: ${t('sponsor.days', { count: duration })}`,
    `${t('sponsor.exclusiveSummary')}: ${exclusive ? t('sponsor.yes') : t('sponsor.no')}`,
    t('sponsor.betaEstimate', { estimate: euro(estimate, locale) }),
    t('sponsor.calculation'),
  ];

  return lines.join("\n");
}

export default function SponsorPage() {
  const { t, locale } = useI18n();
  // configuratore
  const [pkg, setPkg] = useState<PackageId>("performance");
  const [regionId, setRegionId] = useState<string>("");
  const [provinceId, setProvinceId] = useState<string>("");
  const [cityId, setCityId] = useState<string>("");
  const [regions, setRegions] = useState<LocationOptionString[]>([]);
  const [provinces, setProvinces] = useState<LocationOptionString[]>([]);
  const [cities, setCities] = useState<LocationOptionString[]>([]);
  const [duration, setDuration] = useState<DurationId>(30);
  const [exclusive, setExclusive] = useState<boolean>(false);

  // form contatto
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [freeMessage, setFreeMessage] = useState("");

  // anti-spam client (honeypot + cooldown)
  const [honeypot, setHoneypot] = useState("");
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">(
    "idle"
  );
  const [errorMsg, setErrorMsg] = useState<string>("");

  const preventivoRef = useRef<HTMLDivElement | null>(null);

  const estimate = useMemo(() => {
    const base = PACKAGES[pkg].basePriceNational30d;
    const geo = GEO_MULTIPLIER[getGeoLevel({ regionId, provinceId, cityId })];
    const d = DURATION_MULTIPLIER[duration];
    const ex = exclusive ? 1.4 : 1;
    return base * geo * d * ex;
  }, [pkg, regionId, provinceId, cityId, duration, exclusive]);

  const selectedRegionName = useMemo(
    () => regions.find((item) => item.id === regionId)?.name ?? "",
    [regions, regionId]
  );
  const selectedProvinceName = useMemo(
    () => provinces.find((item) => item.id === provinceId)?.name ?? "",
    [provinces, provinceId]
  );
  const selectedCityName = useMemo(
    () => cities.find((item) => item.id === cityId)?.name ?? "",
    [cities, cityId]
  );
  const targetLabel = useMemo(() => {
    if (cityId) return `${t('sponsor.city')}: ${selectedCityName}`;
    if (provinceId) return `${t('sponsor.province')}: ${selectedProvinceName}`;
    if (regionId) return `${t('sponsor.region')}: ${selectedRegionName}`;
    return t('sponsor.italy');
  }, [cityId, provinceId, regionId, selectedCityName, selectedProvinceName, selectedRegionName, t]);

  const leadSummary = useMemo(
    () =>
      buildLeadSummary({
        pkg,
        regionName: selectedRegionName,
        provinceName: selectedProvinceName,
        cityName: selectedCityName,
        targetLabel,
        duration,
        exclusive,
        estimate, t, locale,
      }),
    [
      pkg,
      selectedRegionName,
      selectedProvinceName,
      selectedCityName,
      targetLabel,
      duration,
      exclusive,
      estimate, t, locale,
    ]
  );

  const supabase = useMemo(() => supabaseBrowser(), []);

  useEffect(() => {
    let active = true;

    (async () => {
      const nextRegions = await fetchLocationChildren(supabase, "region", null);
      if (active) {
        setRegions(
          nextRegions.map((item) => ({
            id: String(item.id),
            name: item.name,
          }))
        );
      }
    })();

    return () => {
      active = false;
    };
  }, [supabase]);

  useEffect(() => {
    let active = true;

    if (!regionId) {
      setProvinces([]);
      setCities([]);
      setProvinceId("");
      setCityId("");
      return () => {
        active = false;
      };
    }

    (async () => {
      const nextProvinces = await fetchLocationChildren(
        supabase,
        "province",
        regionId
      );
      if (active) {
        setProvinces(
          nextProvinces.map((item) => ({
            id: String(item.id),
            name: item.name,
          }))
        );
        setProvinceId("");
        setCityId("");
      }
    })();

    return () => {
      active = false;
    };
  }, [regionId, supabase]);

  useEffect(() => {
    let active = true;

    if (!provinceId) {
      setCities([]);
      setCityId("");
      return () => {
        active = false;
      };
    }

    (async () => {
      const nextCities = await fetchLocationChildren(
        supabase,
        "municipality",
        provinceId
      );
      if (active) {
        setCities(
          nextCities.map((item) => ({
            id: String(item.id),
            name: item.name,
          }))
        );
        setCityId("");
      }
    })();

    return () => {
      active = false;
    };
  }, [provinceId, supabase]);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const t = setInterval(() => {
      setCooldownSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldownSeconds]);

  function scrollToPreventivo() {
    preventivoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    setErrorMsg("");
    setStatus("idle");

    if (cooldownSeconds > 0) {
      setStatus("error");
      setErrorMsg(t('sponsor.cooldown', { seconds: cooldownSeconds }));
      return;
    }

    // validazione minima client
    if (!name.trim() || !company.trim() || !email.trim()) {
      setStatus("error");
      setErrorMsg(t('sponsor.required'));
      return;
    }

    // Honeypot: se compilato, facciamo finta di successo (anti bot)
    if (honeypot.trim()) {
      setStatus("success");
      setCooldownSeconds(20);
      return;
    }

    // Messaggio finale: include preventivo + messaggio libero
    const finalMessage =
      leadSummary +
      `\n\n--- ${t('sponsor.message')} ---\n` +
      (freeMessage.trim() ? freeMessage.trim() : t('sponsor.noExtraMessage'));

    const payload = {
      name: name.trim(),
      company: company.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      location: targetLabel,
      // usiamo budget come stima (così lo vedi subito in admin)
      budget: euro(estimate, locale),
      message: finalMessage,
      // chiave honeypot (deve combaciare con la route esistente)
      company_website: honeypot,
    };

    try {
      setStatus("sending");
      const res = await fetch("/api/ads/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = t('sponsor.sendFailed');
        try {
          const data = await res.json();
          if (typeof data?.error === "string" && data.error.trim()) {
            msg = data.error.trim();
          }
        } catch {
          const txt = await res.text().catch(() => "");
          if (txt.trim()) {
            msg = txt.trim();
          }
        }
        throw new Error(msg);
      }

      setStatus("success");
      setCooldownSeconds(20);

      // reset SOLO campi contatto (manteniamo configuratore per comodità)
      setFreeMessage("");
      // opzionale: non resettare nome/azienda/email per invii multipli
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(
        typeof err?.message === "string" && err.message.trim()
          ? err.message.trim()
          : t('sponsor.sendError')
      );
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">{t('sponsor.title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('sponsor.subtitle')}
        </p>
      </div>

      {/* PACCHETTI */}
      <section className="mb-10">
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-lg font-semibold">{t('sponsor.packages')}</h2>
          <Link
            href="/feed"
            className="text-sm font-medium underline underline-offset-4"
            style={{ color: BRAND_BLUE }}
          >
            {t('sponsor.viewPlatform')}
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {(["starter", "growth", "performance"] as PackageId[]).map((id) => {
            const p = PACKAGES[id];
            const active = id === pkg;
            return (
              <div
                key={id}
                className={[
                  "rounded-xl border p-4 h-full flex flex-col",
                  active ? "border-black/30" : "border-black/10",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{p.label}</p>
                    <p className="mt-1 text-2xl font-semibold">
                      {euro(p.basePriceNational30d, locale)}
                      <span className="ml-1 text-xs font-medium text-muted-foreground">
                        {t('sponsor.period')}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex-1 text-xs text-muted-foreground">
                  <div className="min-h-[84px]">
                    <p className="font-medium text-foreground">{t('sponsor.placements')}</p>
                    <ul className="mt-1 list-disc pl-4">
                      {p.placements.map((x) => (
                        <li key={x}>{t(x as MessageKey)}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-3">
                    <p className="font-medium text-foreground">{t('sponsor.includes')}</p>
                    <ul className="mt-1 list-disc pl-4">
                      {p.includes.map((x) => (
                        <li key={x}>{t(x as MessageKey)}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPkg(id);
                    scrollToPreventivo();
                  }}
                  className={[
                    "mt-4 w-full rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                    active
                      ? "bg-black text-white hover:bg-black/90"
                      : "bg-white text-black border border-black/15 hover:bg-black/5",
                  ].join(" ")}
                >
                  {t('sponsor.select')}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          {t('sponsor.priceNote')}
        </p>
      </section>

      {/* CONFIGURATORE */}
      <section ref={preventivoRef} className="mb-10">
        <h2 className="text-lg font-semibold">{t('sponsor.configure')}</h2>
        <div className="mt-3 rounded-xl border p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {t('sponsor.target')}
              </label>
              <div className="mt-1 rounded-lg border px-3 py-2 text-sm">
                <p className="font-medium">{t('sponsor.italy')}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('sponsor.targetHelp')}
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {t('sponsor.regionOptional')}
              </label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={regionId}
                onChange={(e) => {
                  setRegionId(e.target.value);
                }}
              >
                <option value="">{t('sponsor.selectRegion')}</option>
                {regions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {t('sponsor.provinceOptional')}
              </label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={provinceId}
                onChange={(e) => {
                  setProvinceId(e.target.value);
                }}
                disabled={!regionId}
              >
                <option value="">{t('sponsor.selectProvince')}</option>
                {provinces.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {t('sponsor.cityOptional')}
              </label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={cityId}
                onChange={(e) => {
                  setCityId(e.target.value);
                }}
                disabled={!provinceId}
              >
                <option value="">{t('sponsor.selectCity')}</option>
                {cities.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {t('sponsor.duration')}
              </label>
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value) as DurationId)}
              >
                <option value={30}>{t('sponsor.days', { count: 30 })}</option>
                <option value={60}>{t('sponsor.days', { count: 60 })}</option>
                <option value={90}>{t('sponsor.days', { count: 90 })}</option>
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('sponsor.discountHelp')}
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={exclusive}
                  onChange={(e) => setExclusive(e.target.checked)}
                />
                <span className="font-medium">{t('sponsor.exclusive')}</span>
                <span className="text-xs text-muted-foreground">
                  {t('sponsor.exclusiveHelp')}
                </span>
              </label>
            </div>
          </div>

          <div className="mt-4 rounded-xl border px-4 py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t('sponsor.summary')}</p>
                <p className="mt-1 text-xs text-muted-foreground whitespace-pre-line">
                  {leadSummary}
                </p>
              </div>

              <div
                className="shrink-0 rounded-lg px-3 py-2 text-right"
                style={{ background: `${BRAND_BLUE}0F` }}
              >
                <p className="text-xs font-medium text-muted-foreground">
                  {t('sponsor.estimate')}
                </p>
                <p className="text-xl font-semibold" style={{ color: BRAND_BLUE }}>
                  {euro(estimate, locale)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('sponsor.forDays', { count: duration })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FORM CONTATTO */}
      <section>
        <h2 className="text-lg font-semibold">{t('sponsor.requestInfo')}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('sponsor.contactHelp')}
        </p>

        <form onSubmit={onSubmit} className="mt-4 rounded-xl border p-4">
          {/* Honeypot (hidden) */}
          <div className="hidden">
            <label className="text-xs">Website</label>
            <input
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {t('sponsor.fullName')} *
              </label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mario Rossi"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {t('sponsor.company')} *
              </label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Pizzeria XYZ"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Email *
              </label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@azienda.it"
                type="email"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {t('sponsor.phoneOptional')}
              </label>
              <input
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+39 ..."
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">
                {t('sponsor.messageOptional')}
              </label>
              <textarea
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
                value={freeMessage}
                onChange={(e) => setFreeMessage(e.target.value)}
                placeholder={t('sponsor.messagePlaceholder')}
                rows={5}
              />
            </div>
          </div>

          {status === "error" && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {errorMsg}
            </div>
          )}

          {status === "success" && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              {t('sponsor.success')}
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {t('sponsor.privacy')}
            </p>

            <button
              type="submit"
              disabled={status === "sending" || cooldownSeconds > 0}
              className={[
                "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                "text-white",
                status === "sending" || cooldownSeconds > 0
                  ? "bg-black/40 cursor-not-allowed"
                  : "bg-black hover:bg-black/90",
              ].join(" ")}
            >
              {status === "sending"
                ? t('sponsor.sending')
                : cooldownSeconds > 0
                ? t('sponsor.wait', { seconds: cooldownSeconds })
                : t('sponsor.send')}
            </button>
          </div>

          <div className="mt-3 text-xs text-muted-foreground">
            {t('sponsor.autoSummary')}
          </div>
        </form>
      </section>
    </div>
  );
}
