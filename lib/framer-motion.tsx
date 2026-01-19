import {
  cloneElement,
  forwardRef,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Key,
} from 'react';

type MotionTransition = {
  duration?: number;
};

type MotionProps<T extends HTMLElement> = HTMLAttributes<T> & {
  initial?: CSSProperties;
  animate?: CSSProperties;
  exit?: CSSProperties;
  transition?: MotionTransition;
  layout?: boolean;
  'data-presence'?: 'present' | 'exit';
};

const DEFAULT_DURATION = 0.25;

function useMotionStyle({
  initial,
  animate,
  exit,
  transition,
  style,
  presence,
}: {
  initial?: CSSProperties;
  animate?: CSSProperties;
  exit?: CSSProperties;
  transition?: MotionTransition;
  style?: CSSProperties;
  presence: 'present' | 'exit';
}) {
  const duration = transition?.duration ?? DEFAULT_DURATION;
  const baseStyle = useMemo(() => ({ ...(style ?? {}), transition: `all ${duration}s ease` }), [duration, style]);
  const [motionStyle, setMotionStyle] = useState<CSSProperties>(() => ({
    ...baseStyle,
    ...(initial ?? {}),
  }));

  useEffect(() => {
    if (presence === 'exit') {
      setMotionStyle({
        ...baseStyle,
        ...(exit ?? {}),
      });
      return;
    }
    const raf = requestAnimationFrame(() => {
      setMotionStyle({
        ...baseStyle,
        ...(animate ?? {}),
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [animate, baseStyle, exit, presence]);

  return motionStyle;
}

const MotionLi = forwardRef<HTMLLIElement, MotionProps<HTMLLIElement>>(function MotionLi(
  { initial, animate, exit, transition, style, layout: _layout, 'data-presence': presence = 'present', ...rest },
  ref,
) {
  const motionStyle = useMotionStyle({
    initial,
    animate,
    exit,
    transition,
    style,
    presence,
  });
  return <li ref={ref} {...rest} style={motionStyle} />;
});

type PresenceChild = {
  key: Key;
  element: ReactElement;
  exiting: boolean;
};

function toPresenceChildren(children: ReactNode): PresenceChild[] {
  return (Array.isArray(children) ? children : [children])
    .flat()
    .filter((child): child is ReactElement => Boolean(child) && typeof child === 'object' && 'key' in child)
    .map((child) => ({
      key: child.key ?? '',
      element: child,
      exiting: false,
    }));
}

export function AnimatePresence({ children }: { children: ReactNode; initial?: boolean }) {
  const [rendered, setRendered] = useState<PresenceChild[]>(() => toPresenceChildren(children));

  useEffect(() => {
    const nextChildren = toPresenceChildren(children);
    const nextKeys = new Set(nextChildren.map((child) => child.key));

    setRendered((prev) => {
      const updated: PresenceChild[] = [];
      nextChildren.forEach((child) => {
        updated.push({ ...child, exiting: false });
      });
      prev.forEach((child) => {
        if (!nextKeys.has(child.key)) {
          updated.push({ ...child, exiting: true });
        }
      });
      return updated;
    });
  }, [children]);

  useEffect(() => {
    if (!rendered.some((child) => child.exiting)) return;
    const timeout = window.setTimeout(() => {
      setRendered((prev) => prev.filter((child) => !child.exiting));
    }, DEFAULT_DURATION * 1000);
    return () => window.clearTimeout(timeout);
  }, [rendered]);

  return (
    <>
      {rendered.map((child) =>
        child.exiting
          ? cloneElement(child.element as ReactElement<any>, { key: child.key, 'data-presence': 'exit' })
          : child.element
      )}
    </>
  );
}

export const motion = {
  li: MotionLi,
};
