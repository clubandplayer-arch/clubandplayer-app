'use client';


import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect } from 'react';


export function useInfiniteScroll<T>(
key: unknown[],
queryFn: ({ pageParam }: { pageParam?: number }) => Promise<{ items: T[]; page: number; hasMore: boolean }>,
options?: { getNextPageParam?: (lastPage: { items: T[]; page: number; hasMore: boolean }) => number | undefined }
) {
const q = useInfiniteQuery({
queryKey: key,
queryFn,
initialPageParam: 1,
getNextPageParam: (lastPage) => (options?.getNextPageParam ? options.getNextPageParam(lastPage) : (lastPage.hasMore ? lastPage.page + 1 : undefined)),
});


useEffect(() => {
const el = document.getElementById('scroll-sentinel');
if (!el) return;
const io = new IntersectionObserver((entries) => {
entries.forEach((entry) => {
if (entry.isIntersecting) q.fetchNextPage();
});
});
io.observe(el);
return () => io.disconnect();
}, [q.fetchNextPage]);


return q;
}