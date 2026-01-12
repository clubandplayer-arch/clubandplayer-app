export const AD_SLOT_VALUES = [
  'left_top',
  'left_bottom',
  'left_extra',
  'sidebar_top',
  'sidebar_bottom',
  'sidebar_extra',
  'feed_infeed',
] as const;

export type AdSlotValue = (typeof AD_SLOT_VALUES)[number];

export const AD_SLOT_SET = new Set(AD_SLOT_VALUES);

export const isAdSlotValue = (value: string): value is AdSlotValue => {
  return AD_SLOT_SET.has(value as AdSlotValue);
};
