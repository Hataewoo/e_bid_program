import { useEffect, useRef, useState } from 'react';

/** 컨테이너 너비 변화(창 리사이즈·전체화면 포함)를 추적 */
export function useObservedWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(640);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      const next = el.clientWidth || el.getBoundingClientRect().width;
      if (next > 0) setWidth(next);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return { ref, width };
}
